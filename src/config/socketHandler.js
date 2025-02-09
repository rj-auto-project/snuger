export const handleSocketEvents = (socket, io) => {
  console.log("User connected:", socket.id);

  socket.on("join_chat", (chatId) => {
    socket.join(chatId);
  });

  socket.on("send_message", async (data) => {
    const { chatId, sender, content, type } = data;
    console.log("Message received:", data);
    const message = await sendMessage(sender, chatId, content, type);

    io.to(chatId).emit("new_message", message);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
};
