import { createChat, getUserChats } from "../controllers/chat.controller.js";
import { authMiddleware } from "../utils/authMiddleware.js";

// export const chatRoutes = async (fastify) => {
//   fastify.get(
//     "/",
//     {
//       schema: {
//         querystring: {
//           type: "object",
//           properties: {
//             page: { type: "integer", minimum: 1, default: 1 },
//             limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
//           },
//           additionalProperties: false,
//         },
//       },
//     },
//     getChats
//   );

//   fastify.get(
//     "/:participantId",
//     getOrCreateChat
//   );

//   fastify.get(
//     "/:chatId/messages",
//     {
//       schema: {
//         querystring: {
//           type: "object",
//           properties: {
//             page: { type: "integer", minimum: 1, default: 1 },
//             limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
//           },
//           additionalProperties: false,
//         },
//       },
//     },
//     getMessages
//   );
// };

export const chatRoutes = async (fastify, opts) => {
  fastify.get("/", { preHandler: authMiddleware }, getUserChats);
  fastify.post("/", createChat);
};
