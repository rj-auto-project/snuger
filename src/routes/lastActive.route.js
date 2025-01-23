import { lastActiveUpdate, getOnlineUsersInGroup } from "../controllers/lastActive.controller";

export const activeStatusRoutes = (fastify, opts, done) => {
  fastify.post("/update", lastActiveUpdate);
  fastify.get("/allOnlineUsers", getOnlineUsersInGroup);
  done();
};
