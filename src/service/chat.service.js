import { Chat } from "../model/chat.model.js";

// export const chatService = {
//   async getUserChats(userId, page = 1, limit = 20) {
//     const skip = (page - 1) * limit;

//     const [chats, total] = await Promise.all([
//       Chat.find({ participants: userId })
//         .sort({ updatedAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .populate("participants", "username avatar")
//         .populate("lastMessage")
//         .lean(),

//       Chat.countDocuments({ participants: userId }),
//     ]);

//     return {
//       chats,
//       pagination: {
//         page,
//         limit,
//         total,
//         pages: Math.ceil(total / limit),
//       },
//     };
//   },

//   async getOrCreateChat(userId, participantId) {
//     let chat = await Chat.findOne({
//       participants: { $all: [userId, participantId], $size: 2 },
//     });

//     if (!chat) {
//       chat = new Chat({
//         participants: [userId, participantId],
//         unreadCount: new Map([
//           [userId, 0],
//           [participantId, 0],
//         ]),
//       });
//       await chat.save();
//     }

//     return chat.populate("participants", "username avatar");
//   },
// };

export const getChatById = async (chatId) => {
  return await Chat.findById(chatId)
    .populate("participants", "username avatar")
    .populate("lastMessage")
    .lean();
};

export const getUserChats = async (userId) => {
  return await Chat.find({ participants: userId }).populate("lastMessage");
};

export const createChat = async (userIds) => {
  if (!userIds || userIds.length < 2)
    throw new Error("A chat must have two or more participants");

  const existingChat = await Chat.findOne({ participants: { $all: userIds } });
  if (existingChat) return existingChat;

  return await Chat.create({ participants: userIds });
};
