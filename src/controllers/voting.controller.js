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
    
    // Start a new transaction session
    session = await mongoose.startSession();
    session.startTransaction();

    try {
      // First, get the post to check if it exists and get the post owner
      const post = await Post.findById(postId)
        .select("userId")
        .session(session);
        
      if (!post) {
        await session.abortTransaction();
        session.endSession();
        return reply.status(404).send({ message: "Post not found" });
      }

      // Find existing vote with session to determine the current state
      const existingVote = await Vote.findOne({ userId, postId }).session(session);
      
      // Variables to track changes
      let postUpdateOps = {};
      let userScoreChange = 0;
      let shouldNotify = false;
      
      // Handle different voting actions
      if (voteStatus === "upvote") {
        if (!existingVote) {
          // New upvote: create vote, increment upvotes
          await Vote.create([{ userId, postId, type: "upvote" }], { session });
          postUpdateOps = { $inc: { totalUpvotes: 1, totalVotes: 1 } };
          userScoreChange = 1;
          shouldNotify = true;
        } else if (existingVote.type === "downvote") {
          // Change from downvote to upvote
          await Vote.updateOne(
            { _id: existingVote._id },
            { $set: { type: "upvote" } },
            { session }
          );
          postUpdateOps = { $inc: { totalUpvotes: 1, totalDownvotes: -1, totalVotes: 2 } };
          userScoreChange = 2;
        } else {
          // Remove existing upvote (toggle)
          await Vote.deleteOne({ _id: existingVote._id }, { session });
          postUpdateOps = { $inc: { totalUpvotes: -1, totalVotes: -1 } };
          userScoreChange = -1;
        }
      } else if (voteStatus === "downvote") {
        if (!existingVote) {
          // New downvote: create vote, increment downvotes
          await Vote.create([{ userId, postId, type: "downvote" }], { session });
          postUpdateOps = { $inc: { totalDownvotes: 1, totalVotes: -1 } };
          userScoreChange = -1;
        } else if (existingVote.type === "upvote") {
          // Change from upvote to downvote
          await Vote.updateOne(
            { _id: existingVote._id },
            { $set: { type: "downvote" } },
            { session }
          );
          postUpdateOps = { $inc: { totalUpvotes: -1, totalDownvotes: 1, totalVotes: -2 } };
          userScoreChange = -2;
        } else {
          // Remove existing downvote (toggle)
          await Vote.deleteOne({ _id: existingVote._id }, { session });
          postUpdateOps = { $inc: { totalDownvotes: -1, totalVotes: 1 } };
          userScoreChange = 1;
        }
      } else if (voteStatus === "remove") {
        if (!existingVote) {
          // Nothing to remove
          await session.commitTransaction();
          session.endSession();
          return reply.status(200).send({ message: "No vote to remove" });
        } else {
          // Remove vote and update counts accordingly
          if (existingVote.type === "upvote") {
            postUpdateOps = { $inc: { totalUpvotes: -1, totalVotes: -1 } };
            userScoreChange = -1;
          } else {
            postUpdateOps = { $inc: { totalDownvotes: -1, totalVotes: 1 } };
            userScoreChange = 1;
          }
          await Vote.deleteOne({ _id: existingVote._id }, { session });
        }
      }

      // Update post with atomic operations
      await Post.updateOne(
        { _id: postId },
        postUpdateOps,
        { session }
      );

      // Update user score if needed
      if (userScoreChange !== 0) {
        await User.updateOne(
          { _id: post.userId },
          { $inc: { snugScore: userScoreChange } },
          { session }
        );
      }

      // Create notification for upvotes (only for new upvotes, not for removals)
      if (shouldNotify && userId.toString() !== post.userId.toString()) {
        await createNotification({
          userId: post.userId,
          type: "upvote",
          sourceId: postId,
          onModel: "Post",
          actorId: userId,
        }, session);
      }

      await session.commitTransaction();
      reply.status(200).send({ message: `Vote ${voteStatus} successfully` });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }
    
    // Log the error for debugging
    console.error("Vote update error:", error);
    
    // Check for specific error types and return appropriate responses
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