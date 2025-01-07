import { createUser, getUserProfile } from "../controllers/user.controller.js";
import multipart from "@fastify/multipart";

export const userRoutes = async (fastify, options) => {
  fastify.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  });
  fastify.post("/create", createUser);
  fastify.get("/:id", getUserProfile);

};