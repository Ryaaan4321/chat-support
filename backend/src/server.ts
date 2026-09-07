import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../types/socket.event.types';
import { registerChatHandlers, sweepWaitingChats, sweepSlaBreaches } from './sockets/chat.socket';
import { registerAgentHandlers, registerManagerHandlers, sweepStaleAgents } from './sockets/agent.socket';
import { authenticateSocket } from './middlewares/auth.middleware';
import { errorHandler } from './middlewares/error.middleware';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import { logger } from '../lib/logger';
import { AppError } from '../lib/errors';

export function createRealtimeServer() {
  const app = express();
  const httpServer = createServer(app);

  app.use(express.json());

  const rawOrigins = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
  const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());

  function isOriginAllowed(origin?: string): boolean {
    if (!origin) return true;
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return true;
    if (origin.endsWith('.vercel.app')) return true;
    if (origin.startsWith('http://localhost:')) return true;
    return false;
  }

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    } else {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0] || '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/chats', chatRoutes);

  // Catch-all for undefined routes
  app.use((req, res, next) => {
    next(AppError.notFound(`Endpoint ${req.method} ${req.originalUrl} not found`));
  });

  app.use(errorHandler);

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
    },
  });

  app.set('io', io);

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const { role, userId } = socket.data;
    logger.info({ role, userId, socketId: socket.id }, 'Client connected');
    socket.join(`${role.toLowerCase()}:${userId}`);
    if (role === 'MANAGER') {
      socket.join('managers');
      registerManagerHandlers(io, socket);
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
  const PORT = Number(process.env.PORT || process.env.SOCKET_PORT || 4001);

  const server = httpServer.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT }, `Realtime service listening on 0.0.0.0:${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.error({ port: PORT }, `Port ${PORT} is already in use.`);
      process.exit(1);
    }
  });

  const staleAgentsInterval = setInterval(() => {
    sweepStaleAgents().catch((err) => logger.error({ err: AppError.from(err) }, '[sweepStaleAgents] failed'));
  }, 30_000);

  const waitingChatsInterval = setInterval(() => {
    sweepWaitingChats(io).catch((err) => logger.error({ err: AppError.from(err) }, '[sweepWaitingChats] failed'));
  }, 10_000);

  const slaBreachesInterval = setInterval(() => {
    sweepSlaBreaches(io).catch((err) => logger.error({ err: AppError.from(err) }, '[sweepSlaBreaches] failed'));
  }, 10_000);

  const shutdown = () => {
    clearInterval(staleAgentsInterval);
    clearInterval(waitingChatsInterval);
    clearInterval(slaBreachesInterval);
    io.close();
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => {
      process.exit(0);
    }, 1000).unref();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}