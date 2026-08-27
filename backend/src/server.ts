import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../types/socket.event.types';
import { registerChatHandlers, sweepWaitingChats } from './sockets/chat.socket';
import { registerAgentHandlers, sweepStaleAgents } from './sockets/agent.socket';
import { logger } from '../lib/logger';

export function createRealtimeServer() {
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
    logger.info({ role, userId, socketId: socket.id }, 'Client connected');
    socket.join(`${role.toLowerCase()}:${userId}`);
    if (role === 'MANAGER') {
      socket.join('managers');
    }

    if (role === 'AGENT') {
      registerAgentHandlers(io, socket);
    }

    registerChatHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info({ role, userId, reason }, 'Client disconnected');
    });
  });

  return { app, httpServer, io };
}

if (require.main === module) {
  const { httpServer, io } = createRealtimeServer();
  const PORT = process.env.SOCKET_PORT ?? 4001;
  httpServer.listen(PORT, () => {
    logger.info({ port: PORT }, `Realtime service listening on :${PORT}`);
  });

  setInterval(() => {
    sweepStaleAgents().catch((err) => logger.error({ err }, '[sweepStaleAgents] failed'));
  }, 30_000);

  setInterval(() => {
    sweepWaitingChats(io).catch((err) => logger.error({ err }, '[sweepWaitingChats] failed'));
  }, 10_000);
}