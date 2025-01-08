import { createComment, fetchComment } from "../controllers/comment.controller.js";

export const commentRoutes = async (fastify) => {
  fastify.post("/", createComment);
  fastify.get("/", fetchComment);
};