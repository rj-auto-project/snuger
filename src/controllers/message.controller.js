// import { messageService } from "../service/message.service.js";

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
