import mongoose from "mongoose";
import { Post } from "../model/post.model.js";
import { User } from "../model/user.model.js";
import { createNotification } from "./notification.controller.js";

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

    const post = await Post.findById(postId).select("upvotes downvotes userId").session(session);
    if (!post) {
      return reply.status(404).send({ message: "Post not found" });
    }

    let snugScoreChange = 0;
    const isUpvoted = post.upvotes.includes(userId);
    const isDownvoted = post.downvotes.includes(userId);

    const updateQuery = {
      $pull: {},
      $addToSet: {},
    };

    if (voteStatus === "upvote") {
      if (isUpvoted) {
        updateQuery.$pull.upvotes = userId;
        snugScoreChange -= 1;
      } else {
        updateQuery.$addToSet.upvotes = userId;
        updateQuery.$pull.downvotes = userId;
        snugScoreChange += isDownvoted ? 2 : 1;
      }
    }

    if (voteStatus === "downvote") {
      if (isDownvoted) {
        updateQuery.$pull.downvotes = userId;
        snugScoreChange += 1;
      } else {
        updateQuery.$addToSet.downvotes = userId;
        updateQuery.$pull.upvotes = userId;
        snugScoreChange -= isUpvoted ? 2 : 1;
      }
    }

    const updatedPost = await Post.findByIdAndUpdate(postId, updateQuery, { session, new: true }).select("upvotes downvotes");

    const recalculatedTotalUpvotes = updatedPost.upvotes.length;
    const recalculatedTotalDownvotes = updatedPost.downvotes.length;
    const recalculatedTotalVotes = recalculatedTotalUpvotes - recalculatedTotalDownvotes;
    
    await Post.findByIdAndUpdate(postId, {
      $set: {
        totalUpvotes: recalculatedTotalUpvotes,
        totalDownvotes: recalculatedTotalDownvotes,
        totalVotes: recalculatedTotalVotes,
      },
    }, { session });

    if (snugScoreChange !== 0) {
      await User.findByIdAndUpdate(post.userId, { $inc: { snugScore: snugScoreChange } }, { session });
    }

    if (userId.toString() !== post.userId.toString() && voteStatus === "upvote" && !isUpvoted) {
      await createNotification({
        userId: post.userId,
        type: "upvote",
        sourceId: postId,
        onModel: "Post",
        actorId: userId,
      });
    }

    await session.commitTransaction();
    session.endSession();

    reply.status(200).send({ message: `Vote status updated to ${voteStatus} successfully` });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    reply.status(500).send({ message: "Error updating vote status", error: error.message });
  }
};
