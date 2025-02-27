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

    // Add optimistic locking with retries
    let retries = 3;
    let success = false;
    
    while (retries > 0 && !success) {
      try {
        // Find post with a session and versioning
        const post = await Post.findById(postId)
          .select("userId totalUpvotes totalDownvotes __v")
          .session(session);
          
        if (!post) {
          await session.abortTransaction();
          session.endSession();
          return reply.status(404).send({ message: "Post not found" });
        }

        // Find existing vote with session
        const existingVote = await Vote.findOne({ userId, postId }).session(session);

        let updateVote = {};
        let voteChange = 0;
        let action = "updated";

        // Calculate update based on vote status
        if (voteStatus === "upvote") {
          if (existingVote) {
            if (existingVote.type === "downvote") {
              // Change from downvote to upvote
              updateVote = { type: "upvote" };
              voteChange = 2;
              action = "changed to upvote";
            } else if (existingVote.type === "upvote") {
              // Toggle: remove the upvote if already upvoted
              await existingVote.deleteOne({ session });
              voteChange = -1;
              action = "removed";
            }
          } else {
            // New upvote
            updateVote = { userId, postId, type: "upvote" };
            voteChange = 1;
            action = "added";
          }
        } else if (voteStatus === "downvote") {
          if (existingVote) {
            if (existingVote.type === "upvote") {
              // Change from upvote to downvote
              updateVote = { type: "downvote" };
              voteChange = -2;
              action = "changed to downvote";
            } else if (existingVote.type === "downvote") {
              // Toggle: remove the downvote if already downvoted
              await existingVote.deleteOne({ session });
              voteChange = 1;
              action = "removed";
            }
          } else {
            // New downvote
            updateVote = { userId, postId, type: "downvote" };
            voteChange = -1;
            action = "added";
          }
        } else if (voteStatus === "remove" && existingVote) {
          voteChange = existingVote.type === "upvote" ? -1 : 1;
          await existingVote.deleteOne({ session });
          action = "removed";
        } else if (voteStatus === "remove" && !existingVote) {
          // Nothing to remove
          await session.commitTransaction();
          session.endSession();
          return reply.status(200).send({ message: "No vote to remove" });
        }

        // Update or create vote
        if (Object.keys(updateVote).length > 0 && action !== "removed") {
          if (existingVote) {
            await Vote.findOneAndUpdate(
              { userId, postId }, 
              updateVote, 
              { session, new: true }
            );
          } else {
            const newVote = new Vote(updateVote);
            await newVote.save({ session });
          }
        }

        // Count votes with aggregation for better performance
        const voteCounts = await Vote.aggregate([
          { $match: { postId: mongoose.Types.ObjectId.createFromHexString(postId) } },
          { $group: {
              _id: null,
              upvotes: { $sum: { $cond: [{ $eq: ["$type", "upvote"] }, 1, 0] } },
              downvotes: { $sum: { $cond: [{ $eq: ["$type", "downvote"] }, 1, 0] } }
            }
          }
        ]).session(session);
        
        const newTotalUpvotes = voteCounts.length > 0 ? voteCounts[0].upvotes : 0;
        const newTotalDownvotes = voteCounts.length > 0 ? voteCounts[0].downvotes : 0;
        const newTotalVotes = newTotalUpvotes - newTotalDownvotes;

        // Update post with version check
        const updatedPost = await Post.findOneAndUpdate(
          { _id: postId, __v: post.__v },
          {
            totalUpvotes: newTotalUpvotes,
            totalDownvotes: newTotalDownvotes,
            totalVotes: newTotalVotes,
            $inc: { __v: 1 }
          },
          { new: true, session }
        );

        // If null, it means version conflict (someone else updated)
        if (!updatedPost) {
          throw new Error("Version conflict");
        }

        // Update user score
        if (voteChange !== 0) {
          await User.findByIdAndUpdate(
            post.userId, 
            { $inc: { snugScore: voteChange } }, 
            { session }
          );
        }

        // Create notification for upvotes (only for new upvotes, not for removals)
        if (voteStatus === "upvote" && action === "added" && userId.toString() !== post.userId.toString()) {
          console.log("Creating notification for upvote");
          await createNotification({
            userId: post.userId,
            type: "upvote",
            sourceId: postId,
            onModel: "Post",
            actorId: userId,
          }, session);
        }

        await session.commitTransaction();
        success = true;
      } catch (error) {
        await session.abortTransaction();
        
        // If it's a version conflict, retry
        if (error.message === "Version conflict" && retries > 1) {
          retries--;
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 50));
          session = await mongoose.startSession();
          session.startTransaction();
        } else {
          throw error;
        }
      }
    }

    if (session) session.endSession();
    reply.status(200).send({ message: `Vote ${voteStatus} successfully` });
  } catch (error) {
    if (session) {
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
      message: "Error updating vote status", 
      error: error.message 
    });
  }
};