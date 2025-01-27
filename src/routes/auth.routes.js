import {
  createUser,
  verifyFirebaseToken,
} from "../controllers/auth.controller.js";

export const authRoutes = async (fastify) => {
  fastify.post("/verify-firebse-token", verifyFirebaseToken);
  fastify.post("/signup", createUser);
};
