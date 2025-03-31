import { Chat } from "../model/chat.model.js";
import { Message } from "../model/message.model.js";
/**
 * Get all chats for a user
 */
export const getUserChats = async (request, reply) => {
  try {
    const { userId } = request.params;
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 20;
    const skip = (page - 1) * limit;

    const chats = await Chat.find({
      participants: { $in: [userId] },
    })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "lastMessage",
        model: "Message",
        select: "content sender createdAt status",
      })
      .populate({
        path: "participants",
        model: "User", // Make sure this matches your User model name
        select: "name username profileImage",
      });

    // Format response with opposite user's details
    const formattedChats = chats.map((chat) => {
      const otherParticipant = chat.participants.find(
        (p) => p._id.toString() !== userId
      );
      return {
        _id: chat._id,
        name: otherParticipant?.name || "Unknown User",
        profileImage: otherParticipant?.profileImage || "",
        lastMessage: chat.lastMessage,
        updatedAt: chat.updatedAt,
        unreadCount: 0,
        participants: chat.participants,
      };
    });
    const totalChats = await Chat.countDocuments({
      participants: { $in: [userId] },
    });

    return reply.send({
      success: true,
      data: {
        chats: formattedChats,
        pagination: {
          total: totalChats,
          page,
          pages: Math.ceil(totalChats / limit),
          hasMore: page * limit < totalChats,
        },
      },
    });
  } catch (error) {
    request.log.error("Error fetching user chats:", error);
    return reply.status(500).send({
      success: false,
      error: "Failed to fetch chats",
    });
  }
};

/**
 * Get a single chat by ID
 */
export const getMessagesOfChatById = async (request, reply) => {
  try {
    const { chatId } = request.params;
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get messages for this chat
    const messages = await Message.find({ chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name username profileImage")
      .lean();

    // Get total message count for pagination
    const totalMessages = await Message.countDocuments({ chatId });

    return reply.send({
      success: true,
      data: {
        messages: messages.reverse(), // Return messages in chronological order
        pagination: {
          total: totalMessages,
          page,
          pages: Math.ceil(totalMessages / limit),
          hasMore: page * limit < totalMessages,
        },
      },
    });
  } catch (error) {
    request.log.error("Error fetching chat:", error);
    return reply.status(500).send({
      success: false,
      error: "Failed to fetch chat",
    });
  }
};

/**
 * Get or create chat between two users
 */
export const getChatByParticipants = async (request, reply) => {
  try {
    const userId = request.user._id;
    const { participantId } = request.params;

    if (userId === participantId) {
      return reply.status(400).send({
        success: false,
        error: "Cannot create chat with yourself",
      });
    }

    const participants = [userId, participantId].sort();
    let chat = await Chat.findOne({ participants }).populate({
      path: "lastMessage",
      select: "content sender createdAt status",
    });

    if (!chat) {
      chat = await Chat.create({
        participants,
        lastActivity: new Date(),
      });
    }

    return reply.send({
      success: true,
      data: formatChatResponse(chat),
    });
  } catch (error) {
    request.log.error("Error with chat participants:", error);
    return reply.status(500).send({
      success: false,
      error: "Failed to get or create chat",
    });
  }
};

/**
 * Helper function to format chat response
 */
const formatChatResponse = (chat, userId) => {
  const otherParticipant = chat.participants.find(
    (p) => p._id.toString() !== userId
  );
  return {
    _id: chat._id,
    name: otherParticipant?.name || "Unknown User",
    profileImage: otherParticipant?.profileImage || "",
    lastMessage: chat.lastMessage,
    updatedAt: chat.updatedAt,
    unreadCount: 0,
    participants: chat.participants,
  };
};

/**
 * Get unread message count for a chat
 */
export const getUnreadCount = async (request, reply) => {
  try {
    const { chatId } = request.params;
    const userId = request.user._id;

    const unreadCount = await Chat.aggregate([
      { $match: { _id: chatId } },
      { $unwind: "$messages" },
      {
        $match: {
          "messages.sender": { $ne: userId },
          "messages.read": false,
        },
      },
      { $count: "unread" },
    ]).then((result) => result[0]?.unread || 0);

    return reply.send({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    request.log.error("Error counting unread messages:", error);
    return reply.status(500).send({
      success: false,
      error: "Failed to get unread count",
    });
  }
};
