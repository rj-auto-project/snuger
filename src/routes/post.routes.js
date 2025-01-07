import { createPost, getPosts } from "../controllers/post.controller.js";

export const postRoutes = async (fastify) => {
  fastify.post("/", createPost);
  fastify.get("/", getPosts);
};
