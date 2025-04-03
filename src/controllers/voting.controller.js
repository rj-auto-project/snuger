import mongoose from "mongoose";
import { Post } from "../model/post.model.js";
import { Vote } from "../model/vote.model.js"; 
import { User } from "../model/user.model.js";
import { createNotification } from "./notification.controller.js";

export const voteStatus = async (req, reply) => {
  let session = null;
  
  try {
    const { postId, voteStatus, userId } = req.body;
    if (!["upvote", "downvote", "remove"].includes(voteStatus)) {
      return reply.status(400).send({ message: "Invalid vote status" });
    }

    if (!userId || !postId) {
      return reply.status(400).send({ message: "User ID and Post ID are required" });
    }

    // Validate post existence
    const post = await Post.findById(postId).select("userId");
    if (!post) {
      return reply.status(404).send({ message: "Post not found" });
    }

    // Start a session for the vote operation only
    session = await mongoose.startSession();
    session.startTransaction();

    // Find or create vote
    const existingVote = await Vote.findOne({ userId, postId }).session(session);
    let voteChange = 0;
    let action = "updated";
    let notificationData = null;

    if (voteStatus === "upvote") {
      if (existingVote) {
        if (existingVote.type === "downvote") {
          // Change from downvote to upvote
          await Vote.updateOne(
            { userId, postId },
            { type: "upvote" },
            { session }
          );
          voteChange = 2; // Downvote (-1) to Upvote (+1)
          action = "changed to upvote";
        } else if (existingVote.type === "upvote") {
          // Remove upvote
          await Vote.deleteOne({ userId, postId }, { session });
          voteChange = -1;
          action = "removed";
        }
      } else {
        // New upvote
        const newVote = new Vote({ userId, postId, type: "upvote" });
        await newVote.save({ session });
        voteChange = 1;
        action = "added";
        if (userId.toString() !== post.userId.toString()) {
          notificationData = {
            userId: post.userId,
            type: "upvote",
            sourceId: postId,
            onModel: "Post",
            actorId: userId,
          };
        }
      }
    } else if (voteStatus === "downvote") {
      if (existingVote) {
        if (existingVote.type === "upvote") {
          // Change from upvote to downvote
          await Vote.updateOne(
            { userId, postId },
            { type: "downvote" },
            { session }
          );
          voteChange = -2; // Upvote (+1) to Downvote (-1)
          action = "changed to downvote";
        } else if (existingVote.type === "downvote") {
          // Remove downvote
          await Vote.deleteOne({ userId, postId }, { session });
          voteChange = 1;
          action = "removed";
        }
      } else {
        // New downvote
        const newVote = new Vote({ userId, postId, type: "downvote" });
        await newVote.save({ session });
        voteChange = -1;
        action = "added";
      }
    } else if (voteStatus === "remove") {
      if (existingVote) {
        voteChange = existingVote.type === "upvote" ? -1 : 1;
        await Vote.deleteOne({ userId, postId }, { session });
        action = "removed";
      } else {
        await session.commitTransaction();
        session.endSession();
        return reply.status(200).send({ message: "No vote to remove" });
      }
    }

    await session.commitTransaction();
    session.endSession();

    // Update post vote counts atomically outside transaction
    if (voteChange !== 0) {
      const update = {};
      if (voteStatus === "upvote" || (voteStatus === "remove" && voteChange === -1)) {
        update.totalUpvotes = voteChange > 0 ? 1 : -1;
      } else if (voteStatus === "downvote" || (voteStatus === "remove" && voteChange === 1)) {
        update.totalDownvotes = voteChange < 0 ? 1 : -1;
      }
          await Post.updateOne(
        { _id: postId },
        {
          $inc: {
            totalUpvotes: update.totalUpvotes || 0,
            totalDownvotes: update.totalDownvotes || 0,
            totalVotes: voteChange,
          },
        }
      );

      // Update user score
      await User.updateOne(
        { _id: post.userId },
        { $inc: { snugScore: voteChange } }
      );
    }

    // Create notification asynchronously if applicable
    if (notificationData) {
      await createNotification(notificationData); // No session, runs independently
    }

    reply.status(200).send({ message: `Vote ${voteStatus} successfully`});
  } catch (error) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }

    console.error("Vote update error:", error);
    if (error.name === "CastError") {
      return reply.status(400).send({ message: "Invalid ID format" });
    } else if (error.name === "ValidationError") {
      return reply.status(400).send({ message: "Validation error", details: error.message });
    } else if (error.code === 11000) {
      return reply.status(409).send({ message: "Duplicate vote detected" });
    }
    
    reply.status(500).send({ 
      message: `${error.message} updating vote status`, 
      error: error.message 
    });
  }
};