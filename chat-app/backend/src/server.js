import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDB } from './config/db.js';
import { setupChatSocket } from './sockets/chatSocket.js';

const port = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || '*' }
});

setupChatSocket(io);

connectDB()
  .then(() => {
    server.listen(port, () => console.log(`Server running on ${port}`));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
