import * as chatService from "../service/chat.service.js";

// export const getChats = async (request, reply) => {
//   const { page, limit } = request.query;
//   try {
//     const result = await chatService.getUserChats(request.user._id, page, limit);
//     reply.send(result);
//   } catch (error) {
//     reply.status(500).send({ error: 'Failed to fetch chats' });
//   }
// };

// export const getOrCreateChat = async (request, reply) => {
//   const { participantId } = request.params;
//   try {
//     const chat = await chatService.getOrCreateChat(request.user._id, participantId);
//     reply.send(chat);
//   } catch (error) {
//     reply.status(500).send({ error: 'Failed to fetch or create chat' });
//   }
// };

export const getUserChats = async (req, reply) => {
  try {
    const chats = await chatService.getUserChats(req.user.id);
    reply.send(chats);
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
};

export const createChat = async (req, reply) => {
  try {
    const { userIds } = req.body;
    const chat = await chatService.createChat(userIds);
    reply.send(chat);
  } catch (error) {
    reply.status(400).send({ error: error.message });
  }
};
