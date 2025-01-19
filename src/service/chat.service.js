const connections = new Set();

const handleMessages = (message, connection) => {
  try {
    const data = JSON.parse(message);
    if (
      data.type === "offer" ||
      data.type === "answer" ||
      data.type === "candidate"
    ) {
      broadcastMessage(data, connection);
    }
  } catch (err) {
    console.error("Invalid Message format", err);
  }
};

const handleDisconnect = (connection) => {
  try {
    connection.delete(connection);
    console.log("Connection closed");
  } catch (err) {
    console.error("Error in disconnecting", err);
  }
};

const broadcastMessage = (data, connection) => {
  for (conn of connections) {
    if (conn !== senderConnection) {
      conn.socket.send(JSON.stringify(data));
    }
  }
};

export { handleMessages, handleDisconnect };
