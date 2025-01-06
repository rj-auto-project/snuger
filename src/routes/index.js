import { userRoutes } from "./user.routes.js";

export const registerRoutes = async (fastify) => {
  fastify.register(userRoutes, { prefix: "/api/users" });
};
