module.exports = (io) => {
    io.on('connection', (socket) => {
      console.log('New client connected');
      
      socket.on('joinChat', (chatId) => {
        socket.join(chatId);
        console.log(`User joined chat: ${chatId}`);
      });
  
      socket.on('sendMessage', async (messageData) => {
        try {
          const message = await MessageService.createMessage(messageData);
          io.to(messageData.chat).emit('newMessage', message);
        } catch (error) {
          socket.emit('error', error.message);
        }
      });
  
      socket.on('typing', (chatId) => {
        socket.to(chatId).emit('typing', chatId);
      });
  
      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });
  };