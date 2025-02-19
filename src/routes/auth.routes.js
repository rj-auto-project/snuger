import fastifyMultipart from "@fastify/multipart";
import {
  createUser,
  refreshToken,
  verifyFirebaseToken,
} from "../controllers/auth.controller.js";

export const authRoutes = async (fastify) => {
  // Register multipart plugin
  fastify.register(fastifyMultipart, {
    addToBody: true,
    limits: {
      fileSize: 50 * 1024 * 1024, // size limit 50MB
    },
  });

  // Public routes (no authentication required)
  fastify.post("/verify-firebase-token", verifyFirebaseToken);
  fastify.post("/signup", createUser);

  // Protected routes (require authentication)
  fastify.post("/refresh-token",refreshToken);
};
