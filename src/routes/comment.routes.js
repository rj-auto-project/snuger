import { createComment } from "../controllers/comment.controller.js";

export const commentRoutes = async (fastify) => {
  fastify.post("/", createComment);
};
