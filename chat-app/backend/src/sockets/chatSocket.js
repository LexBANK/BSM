export const setupChatSocket = (io) => {
  io.on('connection', (socket) => {
    socket.on('join', (userId) => {
      socket.join(userId);
    });

    socket.on('private_message', (payload) => {
      const { receiverId } = payload;
      io.to(receiverId).emit('private_message', payload);
    });

    socket.on('disconnect', () => {});
  });
};
