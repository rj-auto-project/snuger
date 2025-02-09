import * as messageService from "../service/message.service.js";

// export const getMessages = async (request, reply) => {
//   const { chatId } = request.params;
//   const { page, limit } = request.query;

//   try {
//     const [messages, total] = await Promise.all([
//       messageService.getMessages(chatId, page, limit),
//       messageService.countMessages(chatId),
//     ]);

//     reply.send({
//       messages,
//       pagination: {
//         page,
//         limit,
//         total,
//         pages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     reply.status(500).send({ error: "Failed to fetch messages" });
//   }
// };

export const sendMessage = async (req, reply) => {
  try {
    const { chatId, content, type } = req.body;
    const message = await messageService.sendMessage(
      req.user.id,
      chatId,
      content,
      type
    );

    req.io.to(chatId).emit("new_message", message);

    reply.send(message);
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
};

export const getChatMessages = async (req, reply) => {
  try {
    const messages = await messageService.getMessagesByChat(req.params.chatId);
    reply.send(messages);
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
};
