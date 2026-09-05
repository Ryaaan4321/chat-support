import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../../types/socket.event.types';
import { prisma } from '../../lib/prisma';
import { onAgentFreedUp } from '../services/assignment.service';
import { updateAgentCapacity, reconcileAgentActiveChatCount } from '../repositories/agent.repositories';
import { logger } from '../../lib/logger';
import { AppError } from '../../lib/errors';

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
const HEARTBEAT_INTERVAL_MS = 15_000;
const STALE_AFTER_MS = 45_000;

export function registerAgentHandlers(io: IoServer, socket: IoSocket) {
  const agentId = socket.data.userId;

  void (async () => {
    try {
      if (!agentId) {
        throw AppError.unauthorized('agentId is required on socket data');
      }

      await prisma.agent.update({
        where: { id: agentId },
        data: { lastSeenAt: new Date() },
      });
      await reconcileAgentActiveChatCount(agentId);
      const activeChats = await prisma.chat.findMany({
        where: { assignedAgentId: agentId, status: 'ACTIVE' },
      });
      for (const chat of activeChats) {
        socket.join(`chat:${chat.id}`);
      }
    } catch (err) {
      logger.error({ err: AppError.from(err), agentId }, '[agent connect] init failed');
    }
  })();

  const heartbeat = setInterval(async () => {
    try {
      await prisma.agent.update({
        where: { id: agentId },
        data: { lastSeenAt: new Date() },
      });
    } catch (err) {
      logger.error({ err: AppError.from(err), agentId }, '[heartbeat] update failed');
    }
  }, HEARTBEAT_INTERVAL_MS);

  socket.on('disconnect', () => clearInterval(heartbeat));

  socket.on('agent:capacity_changed', async ({ agentId: targetId, chatCapacity }) => {
    try {
      const targetAgentId = targetId || agentId;
      if (!targetAgentId || !chatCapacity) {
        throw AppError.validation('agentId and chatCapacity are required');
      }
      const updated = await updateAgentCapacity(targetAgentId, chatCapacity);
      io.to('managers').emit('agent:capacity_changed', {
        agentId: targetAgentId,
        chatCapacity: updated.chatCapacity,
      });
      io.to(`agent:${targetAgentId}`).emit('agent:capacity_changed', {
        agentId: targetAgentId,
        chatCapacity: updated.chatCapacity,
      });
      if (updated.shiftStatus === 'AVAILABLE' && updated.activeChatCount < updated.chatCapacity) {
        const next = await onAgentFreedUp(targetAgentId);
        if (next) {
          const payload = {
            chatId: next.id,
            agentId: targetAgentId,
            assignedAt: ((next.assignedAt as Date) || new Date()).toISOString(),
          };
          await io.in(`agent:${targetAgentId}`).socketsJoin(`chat:${next.id}`);
          io.to(`agent:${targetAgentId}`).emit('chat:assigned', payload);
          io.to(`chat:${next.id}`).emit('chat:assigned', payload);
        }
      }
    } catch (err) {
      logger.error({ err: AppError.from(err), agentId }, '[agent:capacity_changed] handler error');
    }
  });

  socket.on('agent:status_changed', async ({ shiftStatus }) => {
    try {
      if (!shiftStatus) {
        throw AppError.validation('shiftStatus is required');
      }
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
      logger.error({ err: AppError.from(err), agentId }, '[agent:status_changed] handler error');
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