import { Post } from "../model/post.model.js";

// toggle vote
export const voteStatus = async (req, reply) => {
  try {
    const { postId, voteStatus } = req.params;

    const validVoteStatuses = ["upvote", "downvote", "None"];
    if (!validVoteStatuses.includes(voteStatus)) {
      return reply.status(400).send({ message: "Invalid vote status" });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return reply.status(404).send({ message: "Post not found" });
    }

    const updateFields = { totalVotes: null };

    if (voteStatus === "upvote") {
      if (post.voteStatus === "upvote") {
        // Remove the upvote if already upvoted
        updateFields.$inc = { upvotes: -1 };
        updateFields.$set = { voteStatus: "None" };
      } else {
        updateFields.$inc = { upvotes: 1 };
        if (post.voteStatus === "downvote") {
          updateFields.$inc.downvotes = -1; // Remove downvote if switching to upvote
        }
        updateFields.$set = { voteStatus: "upvote" };
      }
    } else if (voteStatus === "downvote") {
      if (post.voteStatus === "downvote") {
        // Remove the downvote if already downvoted
        updateFields.$inc = { downvotes: -1 };
        updateFields.$set = { voteStatus: "None" };
      } else {
        updateFields.$inc = { downvotes: 1 };
        if (post.voteStatus === "upvote") {
          updateFields.$inc.upvotes = -1; // Remove upvote if switching to downvote
        }
        updateFields.$set = { voteStatus: "downvote" };
      }
    } else if (voteStatus === "None") {
      if (post.voteStatus === "upvote") {
        updateFields.$inc = { upvotes: -1 };
      } else if (post.voteStatus === "downvote") {
        updateFields.$inc = { downvotes: -1 };
      }
      updateFields.$set = { voteStatus: "None" };
    }

    const updatedPost = await Post.findByIdAndUpdate(postId, updateFields, { new: true });

    updatedPost.totalVotes = updatedPost.upvotes - updatedPost.downvotes;
    await updatedPost.save();

    reply.status(200).send({
      message: `Vote status set to ${voteStatus} successfully`,
      totalVotes: updatedPost.totalVotes,
      upvotes: updatedPost.upvotes,
      downvotes: updatedPost.downvotes,
      voteStatus: updatedPost.voteStatus,
    });
  } catch (error) {
    reply.status(500).send({ message: "Error updating vote status", error: error.message });
  }
};



// // Downvote a post
// export const downvotePost = async (req, reply) => {
//   try {
//     const { postId } = req.params;

//     const post = await Post.findByIdAndUpdate(
//       postId,
//       { $inc: { downvotes: 1 }, $set: { totalVotes: null } },
//       { new: true }
//     );

//     if (!post) {
//       return reply.status(404).send({ message: "Post not found" });
//     }

//     post.totalVotes = post.upvotes - post.downvotes;
//     await post.save();

//     reply.status(200).send({
//       message: "Post downvoted successfully",
//       totalVotes: post.totalVotes,
//       upvotes: post.upvotes,
//       downvotes: post.downvotes,
//     });
//   } catch (error) {
//     reply.status(500).send({ message: "Error downvoting post", error: error.message });
//   }
// };

// // Remove an upvote
// export const removeUpvote = async (req, reply) => {
//   try {
//     const { postId } = req.params;

//     const post = await Post.findOneAndUpdate(
//       { _id: postId, upvotes: { $gt: 0 } }, // Ensure upvotes are greater than 0
//       { $inc: { upvotes: -1 }, $set: { totalVotes: null } },
//       { new: true }
//     );

//     if (!post) {
//       return reply.status(404).send({ message: "Post not found or no upvotes to remove" });
//     }

//     post.totalVotes = post.upvotes - post.downvotes;
//     await post.save();

//     reply.status(200).send({
//       message: "Upvote removed successfully",
//       totalVotes: post.totalVotes,
//       upvotes: post.upvotes,
//       downvotes: post.downvotes,
//     });
//   } catch (error) {
//     reply.status(500).send({ message: "Error removing upvote", error: error.message });
//   }
// };

// // Remove a downvote
// export const removeDownvote = async (req, reply) => {
//   try {
//     const { postId } = req.params;

//     const post = await Post.findOneAndUpdate(
//       { _id: postId, downvotes: { $gt: 0 } }, // Ensure downvotes are greater than 0
//       { $inc: { downvotes: -1 }, $set: { totalVotes: null } },
//       { new: true }
//     );

//     if (!post) {
//       return reply.status(404).send({ message: "Post not found or no downvotes to remove" });
//     }

//     post.totalVotes = post.upvotes - post.downvotes;
//     await post.save();

//     reply.status(200).send({
//       message: "Downvote removed successfully",
//       totalVotes: post.totalVotes,
//       upvotes: post.upvotes,
//       downvotes: post.downvotes,
//     });
//   } catch (error) {
//     reply.status(500).send({ message: "Error removing downvote", error: error.message });
//   }
// };
