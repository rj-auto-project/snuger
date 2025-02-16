import {
  getUserNotifications,
  markAsRead,
} from "../controllers/notification.controller.js";

export const notificationRoutes = async (fastify, opts) => {
  fastify.get("/:userId", getUserNotifications);
  fastify.patch("/mark-as-read", markAsRead);
};
