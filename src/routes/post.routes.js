import fastifyMultipart from "@fastify/multipart";
import { createPost, deletePost } from "../controllers/post.controller.js";

import {
  getPostsByLocation,
  getGroupPosts,
  getTopPosts,
  getPostsByUserId,
} from "../controllers/getAllPost.controller.js";

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
  fastify.get("/location", getPostsByLocation);
  fastify.get("/group", getGroupPosts);
  fastify.get("/hots", getTopPosts);
  fastify.get("/get-user-posts", getPostsByUserId);
};
