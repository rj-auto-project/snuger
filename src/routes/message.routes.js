import { sendMessage, getChatMessages } from '../controllers/message.controller.js';
import { authMiddleware } from '../utils/authMiddleware.js';

export default async function (fastify, opts) {
  fastify.get('/:chatId', { preHandler: authMiddleware }, getChatMessages);
  fastify.post('/', { preHandler: authMiddleware }, sendMessage);
}
