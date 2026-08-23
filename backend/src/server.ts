import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ClientToServerEvents,ServerToClientEvents,InterServerEvents,SocketData } from '../types/socket.event.types';
import { registerChatHandlers } from './sockets/chat.socket';
import { registerAgentHandlers } from './sockets/agent.socket';
const app = express();
const httpServer = createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  },
});
io.use((socket, next) => {
  const { token, role, userId } = socket.handshake.auth as {
    token?: string;
    role?: SocketData['role'];
    userId?: string;
  };
  if (!token || !role || !userId) {
    return next(new Error('unauthorized'));
  }
  socket.data.role = role;
  socket.data.userId = userId;
  next();
});

io.on('connection', (socket) => {
  const { role, userId } = socket.data;
  console.log(`[connect] ${role} ${userId} -> socket ${socket.id}`);
  socket.join(`${role.toLowerCase()}:${userId}`);
  if (role === 'MANAGER') {
    socket.join('managers');
  }

  if (role === 'AGENT') {
    registerAgentHandlers(io, socket);
  }

  registerChatHandlers(io, socket);

  socket.on('disconnect', (reason) => {
    console.log(`[disconnect] ${role} ${userId} -> ${reason}`);
  });
});

const PORT = process.env.SOCKET_PORT ?? 4001;
httpServer.listen(PORT, () => {
  console.log(`Realtime service listening on :${PORT}`);
});

export { io };