import mongoose from "mongoose";
import { Comment } from "../model/comment.model.js";
import { Post } from "../model/post.model.js";

export const createComment = async (req, reply) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { postId, userId, content } = req.body;

    const comment = new Comment({ postId, userId, content });
    await comment.save({ session });

    await Post.findByIdAndUpdate(
      postId,
      { $push: { comments: comment._id } },
      { session }
    );

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
