import { Chat } from "../model/chat.model.js";
import { Message } from "../model/message.model.js";

export const messageService = {
  async createMessage(messageData) {
    const message = new Message(messageData);
    await message.save();
    
    await Chat.findByIdAndUpdate(messageData.chat, {
      lastMessage: message._id,
      $inc: { [`unreadCount.${messageData.sender}`]: 1 }
    });

    return message.populate('sender', 'username avatar');
  },

  async getMessages(chatId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username avatar')
      .lean();
  },

  async countMessages(chatId) {
    return Message.countDocuments({ chat: chatId });
  }
};