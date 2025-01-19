const handleWebSocket = (connection) => {
  connection.socket.on("message", (message) => {
    handleMessages(message, connection);
  });

  connection.socket.on("close", () => {
    handleDisconnect(connection);
    console.log("Connection closed");
  });
};
