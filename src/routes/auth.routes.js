import fastifyMultipart from "@fastify/multipart";
import {
  createUser,
  refreshToken,
  verifyFirebaseToken,
} from "../controllers/auth.controller.js";

export const authRoutes = async (fastify) => {
  fastify.register(fastifyMultipart, {
    addToBody: true,
    limits: {
      fileSize: 50 * 1024 * 1024, // size limit 50MB
    },
  });
  fastify.post("/verify-firebse-token", verifyFirebaseToken);
  fastify.post("/signup", createUser);
  fastify.post("/refresh-token", refreshToken);
};
