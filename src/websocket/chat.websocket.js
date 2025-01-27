import { Chat } from "../model/chat.model.js";

// Move clients map outside to maintain state across connections
const clients = new Map();

export const chatWebSocket = (connection, req) => {
  const userID = new URLSearchParams(req.url.split("?")[1]).get("userID");
  console.log(`Client with userID ${userID} connected at ${new Date().toISOString()}`);

  // Add client to the map
  clients.set(userID, connection);

  connection.on("message", async (message) => {
    let parsedMessage;
    
    try {
      // Convert message to string if it's a Buffer
      const messageString = message.toString();
      parsedMessage = JSON.parse(messageString);
      console.log('Received JSON:', parsedMessage);
    } catch (error) {
      console.log('Received plain text:', message.toString());
      
      // Dynamically set sender and receiver based on userID
      parsedMessage = {
        content: message.toString(),
        senderId: userID,
        receiverId: determineReceiverId(userID)
      };
    }

    const { senderId, receiverId, content } = parsedMessage;

    if (!senderId || !receiverId || !content) {
      connection.send(JSON.stringify({ 
        status: "error", 
        message: "Missing required fields",
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // Check if receiver is connected
    if (!clients.has(receiverId)) {
      connection.send(JSON.stringify({
        status: "error",
        message: `Receiver with ID ${receiverId} is not connected yet.`,
        timestamp: new Date().toISOString()
      }));
      return;
    }

    try {
      // Save or update chat
      let chat = await Chat.findOne({
        participants: { $all: [senderId, receiverId] },
      });

      const messageData = {
        sender: senderId,
        content,
        type: "text",
        timestamp: new Date(),
        readBy: [senderId] // Mark as read by sender
      };

      if (chat) {
        chat.messages.push(messageData);
        chat.lastUpdated = new Date();
        await chat.save();
        console.log('Message added to existing chat');
      } else {
        chat = new Chat({
          participants: [senderId, receiverId],
          messages: [messageData],
          lastUpdated: new Date()
        });
        await chat.save();
        console.log('New chat created and message saved');
      }

      // Send to receiver if connected
      const receiverConnection = clients.get(receiverId);
      if (receiverConnection) {
        receiverConnection.send(JSON.stringify({ 
          status: "success", 
          message: {
            content,
            senderId,
            timestamp: messageData.timestamp.toISOString()
          }
        }));
      }

      // Send confirmation to sender
      connection.send(JSON.stringify({
        status: "success",
        message: "Message sent successfully",
        timestamp: new Date().toISOString()
      }));

    } catch (err) {
      console.error("Error handling chat:", err);
      connection.send(JSON.stringify({ 
        status: "error", 
        message: "Error handling chat",
        errorDetails: err.message,
        timestamp: new Date().toISOString()
      }));
    }
  });

  connection.on("close", () => {
    clients.delete(userID);
    console.log(`Client with userID ${userID} disconnected at ${new Date().toISOString()}`);
    
    // Notify other users about disconnection (optional)
    broadcastUserStatus(userID, 'offline');
  });

  // Send initial connection success message
  connection.send(JSON.stringify({
    status: "success",
    message: "Connected to chat server",
    timestamp: new Date().toISOString()
  }));
};

// Helper function to determine receiver ID
const determineReceiverId = (senderId) => {
  const userIds = Array.from(clients.keys());
  return userIds.find(id => id !== senderId) || null;
};

// Helper function to broadcast user status changes
const broadcastUserStatus = (userId, status) => {
  clients.forEach((connection, clientId) => {
    if (clientId !== userId) {
      connection.send(JSON.stringify({
        status: "system",
        type: "userStatus",
        userId: userId,
        userStatus: status,
        timestamp: new Date().toISOString()
      }));
    }
  });
};

// Export additional utility functions
export const getActiveUsers = () => Array.from(clients.keys());
export const isUserOnline = (userId) => clients.has(userId);