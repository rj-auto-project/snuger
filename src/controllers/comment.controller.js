import mongoose from "mongoose";
import { Comment } from "../model/comment.model.js";

// create comment
export const createComment = async (req, reply) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { postId, userId, content } = req.body;

    if (!postId || !userId || !content) {
      return reply
        .status(400)
        .send({ error: "postId, userId, and content are required" });
    }

    const comment = new Comment({ postId, userId, content });
    await comment.save({ session });

    await session.commitTransaction();
    session.endSession();

    reply.send({ success: true, comment });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    reply
      .status(500)
      .send({ error: "Failed to create comment", details: error.message });
  }
};

// fetch comment
export const fetchComment = async (req, reply) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { postId, page = 1, limit = 20 } = req.query;

    if (!postId) {
      return reply.status(400).send({ error: "postId is required" });
    }

    const comments = await Comment.find({ postId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("userId", "name");

    await session.commitTransaction();
    session.endSession();
    return reply.send(comments);
  } catch (error) {
    console.error(error);
    return reply
      .status(500)
      .send({ error: "An error occurred while fetching comments" });
  }
};
