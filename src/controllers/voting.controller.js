import { Post } from "../model/post.model.js";

// toggle vote
export const voteStatus = async (req, reply) => {
  try {
    const { userId,postId,voteStatus } = req.body; // Pass the userId in the request body

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

    // Handle upvote
    if (voteStatus === "upvote") {
      if (post.upvotes.includes(userId)) {
        // If user already upvoted, remove the upvote
        post.upvotes = post.upvotes.filter((id) => id.toString() !== userId);
        post.totalUpvotes--;
        updateFields.voteStatus = "None";
      } else {
        // Add user to upvotes
        post.upvotes.push(userId);
        post.totalUpvotes++;

        // Remove from downvotes if present
        if (post.downvotes.includes(userId)) {
          post.downvotes = post.downvotes.filter((id) => id.toString() !== userId);
          post.totalDownvotes--;
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
      } else {
        // Add user to downvotes
        post.downvotes.push(userId);
        post.totalDownvotes++;

        // Remove from upvotes if present
        if (post.upvotes.includes(userId)) {
          post.upvotes = post.upvotes.filter((id) => id.toString() !== userId);
          post.totalUpvotes--;
        }

        updateFields.voteStatus = "downvote";
      }
    }

    // Handle removing vote
    if (voteStatus === "None") {
      if (post.upvotes.includes(userId)) {
        post.upvotes = post.upvotes.filter((id) => id.toString() !== userId);
        post.totalUpvotes--;
      }
      if (post.downvotes.includes(userId)) {
        post.downvotes = post.downvotes.filter((id) => id.toString() !== userId);
        post.totalDownvotes--;
      }
      updateFields.voteStatus = "None";
    }

    // Calculate totalVotes
    post.totalVotes = post.totalUpvotes - post.totalDownvotes;

    // Save the post
    await post.save();

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