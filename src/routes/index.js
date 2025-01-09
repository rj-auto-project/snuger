import { commentRoutes } from "./comment.routes.js";
import { postRoutes } from "./post.routes.js";
import { userRoutes } from "./user.routes.js";
import { voteToggle } from "./vote.routes.js";

export const registerRoutes = async (fastify) => {
  fastify.register(userRoutes, { prefix: "/api/users" });
  fastify.register(postRoutes, { prefix: "/api/posts" });
  fastify.register(commentRoutes, { prefix: "/api/comments" });
  fastify.register(voteToggle, {prefix: "/api/vote"})
};
