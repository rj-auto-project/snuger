import { voteStatus } from "../controllers/voting.controller.js";

export const voteToggle = async (fastify) => {
  // vote post
  fastify.post("/", voteStatus);
};