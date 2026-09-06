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
import { updateAgentShiftStatus } from '../services/performance.service';
import { logger } from '../../lib/logger';
import { AppError } from '../../lib/errors';

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
const HEARTBEAT_INTERVAL_MS = 15_000;
const STALE_AFTER_MS = 45_000;

export async function drainWaitingChatsForAgent(io: IoServer, agentId: string) {
  for (let i = 0; i < 10; i++) {
    const next = await onAgentFreedUp(agentId);
    if (!next) break;
    const payload = {
      chatId: next.id,
      agentId,
      assignedAt: ((next.assignedAt as Date) || new Date()).toISOString(),
    };
    await io.in(`agent:${agentId}`).socketsJoin(`chat:${next.id}`);
    io.to(`agent:${agentId}`).emit('chat:assigned', payload);
    io.to(`chat:${next.id}`).emit('chat:assigned', payload);
    io.to('managers').emit('chat:assigned', payload);
  }
}

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

  socket.on('disconnect', async () => {
    clearInterval(heartbeat);
    try {
      if (agentId) {
        const remaining = io.sockets?.adapter?.rooms?.get(`agent:${agentId}`);
        if (!remaining || remaining.size === 0) {
          const updated = await updateAgentShiftStatus(agentId, 'OFFLINE');
          io.to('managers').emit('agent:status_changed', {
            agentId,
            shiftStatus: 'OFFLINE',
          });
          if (updated) {
            io.to('managers').emit('agent:shift_updated', {
              agentId,
              shiftStatus: 'OFFLINE',
              activeShiftSeconds: updated.activeShiftSeconds,
              totalBreakSeconds: updated.totalBreakSeconds,
              shiftStartedAt: updated.shiftStartedAt ? updated.shiftStartedAt.toISOString() : null,
            });
          }
        }
      }
    } catch (err) {
      logger.error({ err: AppError.from(err), agentId }, '[agent disconnect] status update failed');
    }
  });

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
        await drainWaitingChatsForAgent(io, targetAgentId);
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
      const updated = await updateAgentShiftStatus(agentId, shiftStatus);
      io.to('managers').emit('agent:status_changed', { agentId, shiftStatus });
      if (updated) {
        io.to('managers').emit('agent:shift_updated', {
          agentId,
          shiftStatus,
          activeShiftSeconds: updated.activeShiftSeconds,
          totalBreakSeconds: updated.totalBreakSeconds,
          shiftStartedAt: updated.shiftStartedAt ? updated.shiftStartedAt.toISOString() : null,
        });
      }
      if (shiftStatus === 'AVAILABLE') {
        await drainWaitingChatsForAgent(io, agentId);
      }
    } catch (err) {
      logger.error({ err: AppError.from(err), agentId }, '[agent:status_changed] handler error');
    }
  });
}

export function registerManagerHandlers(io: IoServer, socket: IoSocket) {
  socket.on('agent:capacity_changed', async ({ agentId: targetId, chatCapacity }) => {
    try {
      if (!targetId || !chatCapacity) {
        throw AppError.validation('agentId and chatCapacity are required');
      }
      const updated = await updateAgentCapacity(targetId, chatCapacity);
      io.to('managers').emit('agent:capacity_changed', {
        agentId: targetId,
        chatCapacity: updated.chatCapacity,
      });
      io.to(`agent:${targetId}`).emit('agent:capacity_changed', {
        agentId: targetId,
        chatCapacity: updated.chatCapacity,
      });
      if (updated.shiftStatus === 'AVAILABLE' && updated.activeChatCount < updated.chatCapacity) {
        await drainWaitingChatsForAgent(io, targetId);
      }
    } catch (err) {
      logger.error({ err: AppError.from(err) }, '[manager agent:capacity_changed] handler error');
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