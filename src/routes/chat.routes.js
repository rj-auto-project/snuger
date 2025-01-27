import { getChats, getOrCreateChat } from "../controllers/chat.controller.js";
import { getMessages } from "../controllers/message.controller.js";
import { authMiddleware } from "../utils/authMiddleware.js";

export const chatRoutes = async (fastify) => {
  fastify.get(
    "/",
    {
      preHandler: authMiddleware,
      schema: {
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
          additionalProperties: false,
        },
      },
    },
    getChats
  );

  fastify.get(
    "/:participantId",
    { preHandler: authMiddleware },
    getOrCreateChat
  );

  fastify.get(
    "/:chatId/messages",
    {
      preHandler: authMiddleware,
      schema: {
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
          additionalProperties: false,
        },
      },
    },
    getMessages
  );
};
