import fastifyMultipart from "@fastify/multipart";
import { createPost, deletePost, getPosts } from "../controllers/post.controller.js";
import {
  upvotePost,
  downvotePost,
  removeUpvote,
  removeDownvote,
} from "../controllers/voting.controller.js";

export const postRoutes = async (fastify) => {
  fastify.register(fastifyMultipart, {
    addToBody: true,
    limits: {
      fileSize: 50 * 1024 * 1024, // size limit 50MB
    },
  });

  // create post
  fastify.post("/upload", createPost);

  // delete post
  fastify.delete("/:postId", deletePost);

  // get post
  fastify.get("/", getPosts);

  // upvote post
  fastify.post("/:postId/upvote", upvotePost);

  // downvote post
  fastify.post("/:postId/downvote", downvotePost);

  // Remove upvote
  fastify.delete("/:postId/upvote", removeUpvote);

  // Remove downvote
  fastify.delete("/:postId/downvote", removeDownvote);
};