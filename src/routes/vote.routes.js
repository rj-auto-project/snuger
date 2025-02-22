import { voteStatus } from "../controllers/voting.controller.js";

export const votingRoutes = async (fastify) => {
  fastify.put("/", voteStatus);
};