import { Message } from '../model/message.model.js';
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

const CONVERSATION_TTL = 24 * 60 * 60;

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

export {
  MessageStore,
  InMemoryMessageStore,
  RedisMessageStore,
  MongoMessageStore,
  Message
};
