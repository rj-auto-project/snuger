import { createGroup,assignGroup } from "../controllers/group.controller.js";
export const groupRoutes = async (fastify) => {
  fastify.post("/createGroup", createGroup);
  fastify.post("/assignGroup", assignGroup);
};