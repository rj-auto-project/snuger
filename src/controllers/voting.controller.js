import mongoose from "mongoose";
import { Post } from "../model/post.model.js";
import { Vote } from "../model/vote.model.js"; 
import { User } from "../model/user.model.js";
import { createNotification } from "./notification.controller.js";

export const voteStatus = async (req, reply) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, postId, voteStatus } = req.body;

    if (!["upvote", "downvote", "remove"].includes(voteStatus)) {
      return reply.status(400).send({ message: "Invalid vote status" });
    }

    if (!userId || !postId) {
      return reply.status(400).send({ message: "User ID and Post ID are required" });
    }

    const post = await Post.findById(postId).select("userId totalUpvotes totalDownvotes").session(session);
    if (!post) {
      return reply.status(404).send({ message: "Post not found" });
    }

    const existingVote = await Vote.findOne({ userId, postId }).session(session);

    let updateVote = {};
    let voteChange = 0;

    if (voteStatus === "upvote") {
      if (existingVote) {
        if (existingVote.type === "downvote") {
          updateVote = { type: "upvote" };
          voteChange = 2;
        } else {
          await existingVote.deleteOne({ session });
          voteChange = -1;
        }
      } else {
        updateVote = { userId, postId, type: "upvote" };
        voteChange = 1;
      }
    }

    if (voteStatus === "downvote") {
      if (existingVote) {
        if (existingVote.type === "upvote") {
          updateVote = { type: "downvote" };
          voteChange = -2;
        } else {
          await existingVote.deleteOne({ session });
          voteChange = 1;
        }
      } else {
        updateVote = { userId, postId, type: "downvote" };
        voteChange = -1;
      }
    }

    if (voteStatus === "remove" && existingVote) {
      await existingVote.deleteOne({ session });
      voteChange = existingVote.type === "upvote" ? -1 : 1;
    }

    if (Object.keys(updateVote).length > 0) {
      await Vote.findOneAndUpdate({ userId, postId }, updateVote, { upsert: true, session });
    }

    const newTotalUpvotes = await Vote.countDocuments({ postId, type: "upvote" }).session(session);
    const newTotalDownvotes = await Vote.countDocuments({ postId, type: "downvote" }).session(session);
    const newTotalVotes = newTotalUpvotes - newTotalDownvotes;

    await Post.findByIdAndUpdate(postId, {
      totalUpvotes: newTotalUpvotes,
      totalDownvotes: newTotalDownvotes,
      totalVotes: newTotalVotes,
    }, { session });

    if (voteChange !== 0) {
      await User.findByIdAndUpdate(post.userId, { $inc: { snugScore: voteChange } }, { session });
    }

    if (voteStatus === "upvote" && voteChange > 0 && userId.toString() !== post.userId.toString()) {
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

    reply.status(200).send({ message: `Vote status updated successfully` });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    reply.status(500).send({ message: "Error updating vote status", error: error.message });
  }
};
