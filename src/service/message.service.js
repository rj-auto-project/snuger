import { Message } from '../model/message.model.js';
import { Chat } from '../model/chat.model.js';

class MessageStore {
  saveMessage(message) {}
  findMessagesForUser(userID) {}
}

const CONVERSATION_TTL = 24 * 60 * 60; // 24 hours in seconds

class HybridMessageStore extends MessageStore {
  // constructor(redisClient) {
  //   super();
  //   this.redisClient = redisClient;
  // }

  async saveMessage(message) {
    try {
      let chatId = message.chatId;
      let chat;

      // Create or find chat if chatId is undefined
      if (!chatId) {
        const participants = [message.from, message.to].sort();
        chat = await Chat.findOne({ participants });
        
        if (!chat) {
          chat = await Chat.create({ 
            participants,
            lastActivity: new Date()
          });
        }
        chatId = chat._id;
      } else {
        chat = await Chat.findById(chatId);
        if (!chat) {
          throw new Error('Chat not found');
        }
      }

      // Save message to MongoDB
      const newMessage = await Message.create({
        content: message.content,
        sender: message.from,
        chatId: chatId,
        type: 'text',
        status: 'sent'
      });

      // Save to Redis for real-time access
      const value = JSON.stringify({
        ...message,
        chatId,
        _id: newMessage._id,
        createdAt: newMessage.createdAt
      });

      // await this.redisClient
      //   .multi()
      //   .rpush(`chat:${chatId}:messages`, value)
      //   .expire(`chat:${chatId}:messages`, CONVERSATION_TTL)
      //   .exec();

      // Update chat's last message
      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: newMessage._id,
        lastActivity: new Date()
      });

      return {
        ...newMessage.toObject(),
        chatId
      };
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  async findMessagesForUser(userID) {
    try {
      // 1. Try Redis first for recent messages
      // const chatKeys = await this.redisClient.keys(`messages:${userID}:*`);
      // if (chatKeys.length > 0) {
      //   const messages = [];
      //   for (const key of chatKeys) {
      //     const chatMessages = await this.redisClient.lrange(key, 0, -1);
      //     messages.push(...chatMessages.map(msg => JSON.parse(msg)));
      //   }
      //   return messages;
      // }

      // 2. Fallback to MongoDB
      const chats = await Chat.find({ 
        participants: userID 
      }).populate({
        path: 'lastMessage',
        select: 'content sender status createdAt'
      });

      return chats.map(chat => ({
        chatId: chat._id,
        participants: chat.participants,
        lastMessage: chat.lastMessage
      }));
    } catch (error) {
      console.error('Error finding messages:', error);
      throw error;
    }
  }

  async getChatMessages(chatId, limit = 50, skip = 0) {
    return Message.find({ chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('content sender status createdAt')
      .lean();
  }

  async markMessagesAsRead(chatId, userId) {
    await Message.updateMany(
      {
        chatId,
        sender: { $ne: userId },
        status: { $ne: 'read' }
      },
      {
        $set: { status: 'read' }
      }
    );
  }
}

export {
  MessageStore,
  HybridMessageStore,
  Message
};
