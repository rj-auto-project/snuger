import { Message } from '../model/message.model.js';
import { Chat } from '../model/chat.model.js';

class MessageStore {
  saveMessage(message) {}
  findMessagesForUser(userID) {}
}

class InMemoryMessageStore extends MessageStore {
  constructor() {
    super();
    this.messages = [];
  }

  saveMessage(message) {
    this.messages.push(message);
  }

  findMessagesForUser(userID) {
    return this.messages.filter(
      ({ from, to }) => from === userID || to === userID
    );
  }
}

const CONVERSATION_TTL = 24 * 60 * 60; // 24 hours in seconds

class RedisMessageStore extends MessageStore {
  constructor(redisClient) {
    super();
    this.redisClient = redisClient;
  }

  saveMessage(message) {
    const value = JSON.stringify(message);
    this.redisClient
      .multi()
      .rpush(`messages:${message.from}`, value)
      .rpush(`messages:${message.to}`, value)
      .expire(`messages:${message.from}`, CONVERSATION_TTL)
      .expire(`messages:${message.to}`, CONVERSATION_TTL)
      .exec();
  }

  findMessagesForUser(userID) {
    return this.redisClient
      .lrange(`messages:${userID}`, 0, -1)
      .then((results) => {
        return results.map((result) => JSON.parse(result));
      });
  }
}

class MongoMessageStore extends MessageStore {
  async saveMessage(message) {
    const newMessage = new Message({
      sender: message.from,
      chat: message.to, // Assuming 'to' field contains chat ID
      content: message.content,
      type: message.type || 'text',
      status: 'sent'
    });
    return await newMessage.save();
  }

  async findMessagesForUser(userID) {
    return await Message.find({
      $or: [
        { sender: userID },
        { chat: userID }
      ]
    })
    .sort({ createdAt: -1 })
    .populate('sender')
    .populate('chat');
  }
}

class HybridMessageStore extends MessageStore {
  constructor(redisClient) {
    super();
    this.redisClient = redisClient;
  }

  async saveMessage(message) {
    try {
      // 1. Save to Redis for real-time access
      const value = JSON.stringify(message);
      await this.redisClient
        .multi()
        .rpush(`messages:${message.from}:${message.to}`, value)
        .rpush(`messages:${message.to}:${message.from}`, value)
        .expire(`messages:${message.from}:${message.to}`, CONVERSATION_TTL)
        .expire(`messages:${message.to}:${message.from}`, CONVERSATION_TTL)
        .exec();

      // 2. Save to MongoDB for persistence
      const participants = [message.from, message.to].sort();
      let chat = await Chat.findOne({ participants });
      
      if (!chat) {
        chat = await Chat.create({ participants });
      }

      const newMessage = await Message.create({
        content: message.content,
        sender: message.from,
        chatId: chat._id,
        type: 'text',
        status: 'sent'
      });

      // Update chat's last message
      chat.lastMessage = newMessage._id;
      chat.lastActivity = new Date();
      await chat.save();

      return newMessage;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  async findMessagesForUser(userID) {
    try {
      // 1. Try Redis first for recent messages
      const chatKeys = await this.redisClient.keys(`messages:${userID}:*`);
      if (chatKeys.length > 0) {
        const messages = [];
        for (const key of chatKeys) {
          const chatMessages = await this.redisClient.lrange(key, 0, -1);
          messages.push(...chatMessages.map(msg => JSON.parse(msg)));
        }
        return messages;
      }

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
  InMemoryMessageStore,
  RedisMessageStore,
  MongoMessageStore,
  HybridMessageStore,
  Message
};
