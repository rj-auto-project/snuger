import { createUser, getUserProfile } from "../controllers/user.controller.js";

export const userRoutes = async (fastify, options) => {
  fastify.post("/", createUser);
  fastify.get("/:id", getUserProfile);
};
