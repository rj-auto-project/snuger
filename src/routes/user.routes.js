import { createUser, getUserProfile, updateUser } from "../controllers/user.controller.js";
import multipart from "@fastify/multipart";
import { authGuard } from "../middleware/auth.js";

export const userRoutes = async (fastify, options) => {
  fastify.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  });
  fastify.post("/create", createUser);
  fastify.put("/update", updateUser);
  fastify.get("/profile/:id", {
    preHandler: authGuard,
    handler: getUserProfile
  });
};