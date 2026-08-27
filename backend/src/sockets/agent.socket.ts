import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../../types/socket.event.types';
import { prisma } from '../../lib/prisma';
import { onAgentFreedUp } from '../services/assignment.service';
import { logger } from '../../lib/logger';

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
const HEARTBEAT_INTERVAL_MS = 15_000;
const STALE_AFTER_MS = 45_000;

export function registerAgentHandlers(io: IoServer, socket: IoSocket) {
  const agentId = socket.data.userId;

  void (async () => {
    try {
      await prisma.agent.update({
        where: { id: agentId },
        data: { lastSeenAt: new Date() },
      });
      const activeChats = await prisma.chat.findMany({
        where: { assignedAgentId: agentId, status: 'ACTIVE' },
      });
      for (const chat of activeChats) {
        socket.join(`chat:${chat.id}`);
      }
    } catch (err) {
      logger.error({ err, agentId }, '[agent connect] init failed');
    }
  })();

  const heartbeat = setInterval(async () => {
    try {
      await prisma.agent.update({
        where: { id: agentId },
        data: { lastSeenAt: new Date() },
      });
    } catch (err) {
      logger.error({ err, agentId }, '[heartbeat] update failed');
    }
  }, HEARTBEAT_INTERVAL_MS);

  socket.on('disconnect', () => clearInterval(heartbeat));

  socket.on('agent:status_changed', async ({ shiftStatus }) => {
    try {
      await prisma.agent.update({
        where: { id: agentId },
        data: { shiftStatus },
      });

      io.to('managers').emit('agent:status_changed', { agentId, shiftStatus });

      if (shiftStatus === 'AVAILABLE') {
        const next = await onAgentFreedUp(agentId);
        if (next) {
          const payload = {
            chatId: next.id,
            agentId,
            assignedAt: (next.assignedAt as Date).toISOString(),
          };
          await io.in(`agent:${agentId}`).socketsJoin(`chat:${next.id}`);
          io.to(`agent:${agentId}`).emit('chat:assigned', payload);
          io.to(`chat:${next.id}`).emit('chat:assigned', payload);
        }
      }
    } catch (err) {
      logger.error({ err, agentId }, '[agent:status_changed] handler error');
    }
  });
}

export async function sweepStaleAgents() {
  const staleThreshold = new Date(Date.now() - STALE_AFTER_MS);
  await prisma.agent.updateMany({
    where: {
      lastSeenAt: { lt: staleThreshold },
      shiftStatus: { in: ['AVAILABLE', 'ON_BREAK', 'WRAP_UP'] },
    },
    data: { shiftStatus: 'OFFLINE' },
  });
}