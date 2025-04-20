import { commentRoutes } from "./comment.routes.js";
import { postRoutes } from "./post.routes.js";
import { searchRoutes } from "./search.routes.js";
import { userRoutes } from "./user.routes.js";
import { votingRoutes } from "./vote.routes.js";
import { groupRoutes } from "./group.routes.js";
import { reportRoutes } from "./report.routes.js";
import { helpRoutes } from "./help.routes.js";
import { activeStatusRoutes } from "./lastActive.routes.js";
import { userCountRoutes } from "./userCount.routes.js";
import { chatRoutes } from "./chat.routes.js";
import { authRoutes } from "./auth.routes.js";
import { getTopSnugerRoutes } from "./topSuger.routes.js";
import { notificationRoutes } from "./notification.routes.js";
import contentFilterRoutes from "./contentFilter.routes.js";

export const registerRoutes = async (fastify) => {
  fastify.register(authRoutes, { prefix: "/api/auth" });
  fastify.register(userRoutes, { prefix: "/api/users" });
  fastify.register(postRoutes, { prefix: "/api/posts" });
  fastify.register(commentRoutes, { prefix: "/api/comments" });
  fastify.register(votingRoutes, { prefix: "/api/vote" });
  fastify.register(searchRoutes, { prefix: "/api/search" });
  fastify.register(groupRoutes, { prefix: "/api/group" });
  fastify.register(reportRoutes, { prefix: "/api/report" });
  fastify.register(helpRoutes, { prefix: "/api/help" });
  fastify.register(activeStatusRoutes, { prefix: "/api/activeStatus" });
  fastify.register(userCountRoutes, { prefix: "/api/userCount" });
  fastify.register(getTopSnugerRoutes, { prefix: "/api/topSnuger" });
  fastify.register(chatRoutes, { prefix: "/api/chats" });
  fastify.register(notificationRoutes, { prefix: "/api/notification" });
  fastify.register(contentFilterRoutes, { prefix: "/api/content-filter" })
};
