import mongoose from "mongoose";
import { Post } from "../model/post.model.js";
import { User } from "../model/user.model.js";

export const voteStatus = async (req, reply) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, postId, voteStatus } = req.body;

    if (!["upvote", "downvote"].includes(voteStatus)) {
      return reply.status(400).send({ message: "Invalid vote status" });
    }

    if (!userId) {
      return reply.status(400).send({ message: "User ID is required" });
    }

    const post = await Post.findById(postId).session(session);

    if (!post) {
      return reply.status(404).send({ message: "Post not found" });
    }

    let snugScoreChange = 0;
    let updateQuery = {};

    const isUpvoted = post.upvotes.includes(userId);
    const isDownvoted = post.downvotes.includes(userId);

    if (voteStatus === "upvote") {
      if (isUpvoted) {
        updateQuery = { 
          $pull: { upvotes: userId }, 
          voteStatus: "None" 
        };
        snugScoreChange -= 1;
      } else {
        updateQuery = {
          $addToSet: { upvotes: userId },
          $pull: { downvotes: userId },
          voteStatus: "upvote"
        };
        snugScoreChange += isDownvoted ? 2 : 1;
      }
    }

    if (voteStatus === "downvote") {
      if (isDownvoted) {
        updateQuery = { 
          $pull: { downvotes: userId }, 
          voteStatus: "None" 
        };
        snugScoreChange += 1;
      } else {
        updateQuery = {
          $addToSet: { downvotes: userId },
          $pull: { upvotes: userId },
          voteStatus: "downvote"
        };
        snugScoreChange -= isUpvoted ? 2 : 1;
      }
    }
    const updatedPost = await Post.findByIdAndUpdate(postId, updateQuery, { session, new: true });
    const recalculatedTotalUpvotes = updatedPost.upvotes.length;
    const recalculatedTotalDownvotes = updatedPost.downvotes.length;
    const recalculatedTotalVotes = recalculatedTotalUpvotes - recalculatedTotalDownvotes;
    await Post.findByIdAndUpdate(postId, { 
      $set: { 
        totalUpvotes: recalculatedTotalUpvotes, 
        totalDownvotes: recalculatedTotalDownvotes, 
        totalVotes: recalculatedTotalVotes 
      } 
    }, { session });
    if (snugScoreChange !== 0) {
      await User.findByIdAndUpdate(post.userId, { $inc: { snugScore: snugScoreChange } }, { session });
    }

    await session.commitTransaction();
    session.endSession();

    reply.status(200).send({ message: `Vote status updated to ${voteStatus} successfully`, updatedPost });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    reply.status(500).send({ message: "Error updating vote status", error: error.message });
  }
};
