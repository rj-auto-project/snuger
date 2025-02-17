import { voteStatus } from "../controllers/voting.controller.js";
import { authGuard } from "../middleware/auth.js";

export const votingRoutes = async (fastify) => {
  fastify.put("/", {
    preHandler: authGuard,
    handler: voteStatus
  });
};