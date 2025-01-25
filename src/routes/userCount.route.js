import fastifyMultipart from "@fastify/multipart";
import { updateUserCount } from "../controllers/userCount.controller.js";

export const userCountRoutes = async (fastify) => {
  fastify.put("/increment",updateUserCount)
};
