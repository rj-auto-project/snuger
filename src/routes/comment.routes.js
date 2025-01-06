import { createComment } from "../controllers/comment.controller";

export const commentRoutes = async (fastify) => {
  fastify.post("/", createComment);
};
