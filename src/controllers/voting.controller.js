import { Post } from "../model/post.model.js";
import { User } from "../model/user.model.js";

// toggle vote
export const voteStatus = async (req, reply) => {
  try {
    const { userId, postId, voteStatus } = req.body; // Pass the userId in the request body

    const validVoteStatuses = ["upvote", "downvote", "None"];
    if (!validVoteStatuses.includes(voteStatus)) {
      return reply.status(400).send({ message: "Invalid vote status" });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return reply.status(404).send({ message: "Post not found" });
    }

    if (!userId) {
      return reply.status(400).send({ message: "User ID is required" });
    }

    // Initialize changes
    const updateFields = {};
    let snugScoreChange = 0; // Variable to track the change in snugScore

    // Handle upvote
    if (voteStatus === "upvote") {
      if (post.upvotes.includes(userId)) {
        // If user already upvoted, remove the upvote
        post.upvotes = post.upvotes.filter((id) => id.toString() !== userId);
        post.totalUpvotes--;
        updateFields.voteStatus = "None";
        snugScoreChange -= 1; // Decrement snugScore since vote is removed
      } else {
        // Add user to upvotes
        post.upvotes.push(userId);
        post.totalUpvotes++;
        snugScoreChange += 1; // Increment snugScore since user upvoted

        // Remove from downvotes if present
        if (post.downvotes.includes(userId)) {
          post.downvotes = post.downvotes.filter((id) => id.toString() !== userId);
          post.totalDownvotes--;
          snugScoreChange += 1; // Increment snugScore for removing a downvote
        }

        updateFields.voteStatus = "upvote";
      }
    }

    // Handle downvote
    if (voteStatus === "downvote") {
      if (post.downvotes.includes(userId)) {
        // If user already downvoted, remove the downvote
        post.downvotes = post.downvotes.filter((id) => id.toString() !== userId);
        post.totalDownvotes--;
        updateFields.voteStatus = "None";
        snugScoreChange += 1; // Increment snugScore since downvote is removed
      } else {
        // Add user to downvotes
        post.downvotes.push(userId);
        post.totalDownvotes++;
        snugScoreChange -= 1; // Decrement snugScore since user downvoted

        // Remove from upvotes if present
        if (post.upvotes.includes(userId)) {
          post.upvotes = post.upvotes.filter((id) => id.toString() !== userId);
          post.totalUpvotes--;
          snugScoreChange -= 1; // Decrement snugScore for removing an upvote
        }

        updateFields.voteStatus = "downvote";
      }
    }

    // Handle removing vote
    if (voteStatus === "None") {
      if (post.upvotes.includes(userId)) {
        post.upvotes = post.upvotes.filter((id) => id.toString() !== userId);
        post.totalUpvotes--;
        snugScoreChange -= 1; // Decrement snugScore since upvote is removed
      }
      if (post.downvotes.includes(userId)) {
        post.downvotes = post.downvotes.filter((id) => id.toString() !== userId);
        post.totalDownvotes--;
        snugScoreChange += 1; // Increment snugScore since downvote is removed
      }
      updateFields.voteStatus = "None";
    }

    // Calculate totalVotes
    post.totalVotes = post.totalUpvotes - post.totalDownvotes;

    // Save the post
    await post.save();

    // Update snugScore in the user table
    if (snugScoreChange !== 0) {
      await User.findByIdAndUpdate(post.userId, {
        $inc: { snugScore: snugScoreChange },
      });
    }

    reply.status(200).send({
      message: `Vote status updated to ${voteStatus} successfully`,
      totalVotes: post.totalVotes,
      totalUpvotes: post.totalUpvotes,
      totalDownvotes: post.totalDownvotes,
      voteStatus: updateFields.voteStatus,
      upvotes: post.upvotes,
      downvotes: post.downvotes,
    });
  } catch (error) {
    reply.status(500).send({ message: "Error updating vote status", error: error.message });
  }
};
