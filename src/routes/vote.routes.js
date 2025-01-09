import { voteStatus } from "../controllers/voting.controller.js";

export const voteToggle = async (fastify) => {
  // upvote post
  fastify.post("/:postId/:voteStatus", voteStatus);
};
