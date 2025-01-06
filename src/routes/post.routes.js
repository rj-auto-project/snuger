import { createPost, getPosts } from "../controllers/post.controller";

export const postRoutes = async (fastify) => {
  fastify.post("/", createPost);
  fastify.get("/", getPosts);
};
