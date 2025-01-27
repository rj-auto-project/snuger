import { Chat } from "../model/chat.model.js";



export const chatService = {
  async getUserChats(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const [chats, total] = await Promise.all([
      Chat.find({ participants: userId })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('participants', 'username avatar')
        .populate('lastMessage')
        .lean(),
        
      Chat.countDocuments({ participants: userId })
    ]);

    return {
      chats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  async getOrCreateChat(userId, participantId) {
    let chat = await Chat.findOne({
      participants: { $all: [userId, participantId], $size: 2 }
    });

    if (!chat) {
      chat = new Chat({
        participants: [userId, participantId],
        unreadCount: new Map([[userId, 0], [participantId, 0]])
      });
      await chat.save();
    }

    return chat.populate('participants', 'username avatar');
  }
};