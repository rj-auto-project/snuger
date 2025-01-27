import { Chat } from '../model/chat.model.js';

// Store WebSocket connections by userId
const clients = new Map();

// Function to create a WebSocket connection handler
export const handleWebSocket = (connection, request) => {
  const userID = request.query.userID;
  console.log(`Client with userID ${userID} connected`);

  // Add the new client to the clients map
  clients.set(userID, connection);

  // Handle incoming messages
  connection.socket.on('message', async (message) => {
    let parsedMessage;

    try {
      // Parse the incoming message
      const messageString = message.toString();
      parsedMessage = JSON.parse(messageString);
      console.log('Received JSON:', parsedMessage);
    } catch (error) {
      // If parsing fails, treat as plain text
      console.log('Received plain text:', message.toString());
      
      // Create message object
      parsedMessage = {
        content: message.toString(),
        senderId: userID,
        // Determine receiver based on sender
        receiverId: determineReceiverId(userID)
      };
    }

    await handleChatMessage(parsedMessage, connection);
  });

  // Handle client disconnection
  connection.socket.on('close', () => {
    console.log(`Client with userID ${userID} disconnected`);
    clients.delete(userID);
  });

  // Handle WebSocket errors
  connection.socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
};

// Function to determine receiver ID based on sender ID
const determineReceiverId = (senderId) => {
  // You can implement your own logic here to determine the receiver
  // For example, if you want to implement a simple two-user chat:
  const userIds = Array.from(clients.keys());
  return userIds.find(id => id !== senderId) || null;
};

// Function to handle chat messages
const handleChatMessage = async (parsedMessage, senderConnection) => {
  const { senderId, receiverId, content } = parsedMessage;

  // Validate required fields
  if (!senderId || !receiverId || !content) {
    senderConnection.socket.send(JSON.stringify({
      status: 'error',
      message: 'Missing required fields'
    }));
    return;
  }

  // Check if receiver is connected
  if (!clients.has(receiverId)) {
    senderConnection.socket.send(JSON.stringify({
      status: 'error',
      message: 'Receiver is not connected'
    }));
    return;
  }

  try {
    // Save message to database
    let chat = await Chat.findOne({
      participants: { $all: [senderId, receiverId] }
    });

    if (chat) {
      // Update existing chat
      chat.messages.push({
        sender: senderId,
        content,
        type: 'text',
        timestamp: new Date()
      });
    } else {
      // Create new chat
      chat = new Chat({
        participants: [senderId, receiverId],
        messages: [{
          sender: senderId,
          content,
          type: 'text',
          timestamp: new Date()
        }]
      });
    }

    await chat.save();

    // Send message to receiver
    const receiverConnection = clients.get(receiverId);
    receiverConnection.socket.send(JSON.stringify({
      status: 'success',
      message: {
        content,
        senderId,
        timestamp: new Date().toISOString()
      }
    }));

    // Send confirmation to sender
    senderConnection.socket.send(JSON.stringify({
      status: 'success',
      message: 'Message sent successfully'
    }));

  } catch (error) {
    console.error('Error handling chat:', error);
    senderConnection.socket.send(JSON.stringify({
      status: 'error',
      message: 'Error handling chat',
      errorDetails: error.message
    }));
  }
};

// REST API endpoints
export const getChatHistory = async (request, reply) => {
  const { userId, otherUserId } = request.query;

  try {
    const chat = await Chat.findOne({
      participants: { $all: [userId, otherUserId] }
    });

    reply.send({
      status: 'success',
      data: chat ? chat.messages : []
    });
  } catch (error) {
    reply.status(500).send({
      status: 'error',
      message: 'Error fetching chat history',
      errorDetails: error.message
    });
  }
};

// Function to get active connections
export const getActiveConnections = () => {
  return Array.from(clients.keys());
};

// Function to send system message to user
export const sendSystemMessage = (userId, message) => {
  const connection = clients.get(userId);
  if (connection) {
    connection.socket.send(JSON.stringify({
      status: 'system',
      message
    }));
    return true;
  }
  return false;
};