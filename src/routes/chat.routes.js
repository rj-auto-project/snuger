import { authGuard } from "../middleware/auth.js";
import {
  getUserChats,
  getMessagesOfChatById,
  getChatByParticipants,
  getUnreadCount,
} from "../controllers/chat.controller.js";

export const chatRoutes = async(fastify) => {
  // Get all user chats
  fastify.get("/all/:userId", {
    handler: getUserChats,
  });

  // Get specific chat
  fastify.get("/chats/:chatId", {
    handler: getMessagesOfChatById,
  });

  // Get/create chat with participant
  fastify.get("/chats/participant/:participantId", {
    handler: getChatByParticipants,
    preHandler: authGuard,
  });

  // Get unread count
  fastify.get("/chats/:chatId/unread", {
    handler: getUnreadCount,
    preHandler: authGuard,
  });
}
