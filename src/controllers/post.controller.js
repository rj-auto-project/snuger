import mongoose from "mongoose";
import { Post } from "../model/post.model.js";

export const createPost = async (req, reply) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, content, images, audio, isAnonymous } = req.body;

    const post = new Post({
      userId,
      content,
      images,
      audio,
      isAnonymous,
    });

    console.log(post);

    await post.save({ session });

    await session.commitTransaction();
    session.endSession();

    reply.send({ success: true, post });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    reply
      .status(500)
      .send({ error: "Failed to create post", details: error.message });
  }
};

export const getPosts = async (req, reply) => {
  try {
    const posts = await Post.find()
      .populate("userId", "username profileImage")
      .populate("comments")
      .lean();

    reply.send({ success: true, posts });
  } catch (error) {
    reply
      .status(500)
      .send({ error: "Failed to fetch posts", details: error.message });
  }
};
