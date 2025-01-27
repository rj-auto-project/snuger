import { commentRoutes } from "./comment.routes.js";
import { postRoutes } from "./post.routes.js";
import { searchRoutes } from "./search.route.js";
import { userRoutes } from "./user.routes.js";
import { voteToggle } from "./vote.routes.js";
import { groupRoutes } from "./group.route.js";
import { reportRoutes } from "./report.routes.js";
import { helpRoutes } from "./help.route.js";
import { activeStatusRoutes } from "./lastActive.route.js";
import { userCountRoutes } from "./userCount.route.js";

export const registerRoutes = async (fastify) => {
  fastify.register(userRoutes, { prefix: "/api/users" });
  fastify.register(postRoutes, { prefix: "/api/posts" });
  fastify.register(commentRoutes, { prefix: "/api/comments" });
  fastify.register(voteToggle, { prefix: "/api/vote" });
  fastify.register(searchRoutes, { prefix: "/api/search" });
  fastify.register(groupRoutes, { prefix: "/api/group" });
  fastify.register(reportRoutes, { prefix: "/api/report" });
  fastify.register(helpRoutes, { prefix: "/api/help" });
  fastify.register(activeStatusRoutes, { prefix: "/api/activeStatus" });
  fastify.register(userCountRoutes, {prefix: "/api/userCount"})
};
