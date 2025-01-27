import { Chat } from '../model/chat.model.js';
import { isUserOnline, getActiveUsers } from '../websocket/chat.websocket.js'

export const chatRoutes = async (fastify) => {
  // Get chat history between two users
  fastify.get('/history', async (request, reply) => {
    const { userId, otherUserId } = request.query;

    if (!userId || !otherUserId) {
      return reply.status(400).send({
        status: 'error',
        message: 'Missing user IDs'
      });
    }

    try {
      const chat = await Chat.findOne({
        participants: { $all: [userId, otherUserId] }
      })
      .select('messages lastUpdated')
      .sort({ 'messages.timestamp': -1 });

      return reply.send({
        status: 'success',
        data: chat ? chat.messages : [],
        lastUpdated: chat ? chat.lastUpdated : null
      });
    } catch (error) {
      return reply.status(500).send({
        status: 'error',
        message: 'Error fetching chat history',
        errorDetails: error.message
      });
    }
  });

  // Get active users
  fastify.get('/active-users', async (request, reply) => {
    return reply.send({
      status: 'success',
      data: getActiveUsers()
    });
  });

  // Check if user is online
  fastify.get('/user-status/:userId', async (request, reply) => {
    const { userId } = request.params;
    return reply.send({
      status: 'success',
      data: {
        userId,
        isOnline: isUserOnline(userId)
      }
    });
  });

  // Mark messages as read
  fastify.post('/mark-read', async (request, reply) => {
    const { userId, chatId, messageIds } = request.body;

    if (!userId || !chatId || !messageIds) {
      return reply.status(400).send({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return reply.status(404).send({
          status: 'error',
          message: 'Chat not found'
        });
      }

      // Update readBy array for specified messages
      chat.messages.forEach(message => {
        if (messageIds.includes(message._id.toString()) && !message.readBy.includes(userId)) {
          message.readBy.push(userId);
        }
      });

      await chat.save();

      return reply.send({
        status: 'success',
        message: 'Messages marked as read'
      });
    } catch (error) {
      return reply.status(500).send({
        status: 'error',
        message: 'Error marking messages as read',
        errorDetails: error.message
      });
    }
  });
};