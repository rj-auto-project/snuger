import { Post } from "../model/post.model.js";

// Upvote a post
export const upvotePost = async (req, reply) => {
  try {
    const { postId } = req.params;

    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { upvotes: 1 }, $set: { totalVotes: null } },
      { new: true }
    );

    if (!post) {
      return reply.status(404).send({ message: "Post not found" });
    }

    post.totalVotes = post.upvotes - post.downvotes;
    await post.save();

    reply.status(200).send({
      message: "Post upvoted successfully",
      totalVotes: post.totalVotes,
      upvotes: post.upvotes,
      downvotes: post.downvotes,
    });
  } catch (error) {
    reply.status(500).send({ message: "Error upvoting post", error: error.message });
  }
};

// Downvote a post
export const downvotePost = async (req, reply) => {
  try {
    const { postId } = req.params;

    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { downvotes: 1 }, $set: { totalVotes: null } },
      { new: true }
    );

    if (!post) {
      return reply.status(404).send({ message: "Post not found" });
    }

    post.totalVotes = post.upvotes - post.downvotes;
    await post.save();

    reply.status(200).send({
      message: "Post downvoted successfully",
      totalVotes: post.totalVotes,
      upvotes: post.upvotes,
      downvotes: post.downvotes,
    });
  } catch (error) {
    reply.status(500).send({ message: "Error downvoting post", error: error.message });
  }
};

// Remove an upvote
export const removeUpvote = async (req, reply) => {
  try {
    const { postId } = req.params;

    const post = await Post.findOneAndUpdate(
      { _id: postId, upvotes: { $gt: 0 } }, // Ensure upvotes are greater than 0
      { $inc: { upvotes: -1 }, $set: { totalVotes: null } },
      { new: true }
    );

    if (!post) {
      return reply.status(404).send({ message: "Post not found or no upvotes to remove" });
    }

    post.totalVotes = post.upvotes - post.downvotes;
    await post.save();

    reply.status(200).send({
      message: "Upvote removed successfully",
      totalVotes: post.totalVotes,
      upvotes: post.upvotes,
      downvotes: post.downvotes,
    });
  } catch (error) {
    reply.status(500).send({ message: "Error removing upvote", error: error.message });
  }
};

// Remove a downvote
export const removeDownvote = async (req, reply) => {
  try {
    const { postId } = req.params;

    const post = await Post.findOneAndUpdate(
      { _id: postId, downvotes: { $gt: 0 } }, // Ensure downvotes are greater than 0
      { $inc: { downvotes: -1 }, $set: { totalVotes: null } },
      { new: true }
    );

    if (!post) {
      return reply.status(404).send({ message: "Post not found or no downvotes to remove" });
    }

    post.totalVotes = post.upvotes - post.downvotes;
    await post.save();

    reply.status(200).send({
      message: "Downvote removed successfully",
      totalVotes: post.totalVotes,
      upvotes: post.upvotes,
      downvotes: post.downvotes,
    });
  } catch (error) {
    reply.status(500).send({ message: "Error removing downvote", error: error.message });
  }
};
