import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../../types/socket.event.types';
import { onNewChat, onAgentFreedUp } from '../services/assignment.service';
import { closeChatAndRelease } from '../repositories/agent.repositories';
import {
  processCustomerMessageMetrics,
  processAgentMessageMetrics,
  checkSlaBreaches,
} from '../services/performance.service';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { AppError } from '../../lib/errors';

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

async function emitAssignment(io: IoServer, chatId: string, customerId: string, agentId: string, assignedAt: Date) {
  let agentName = 'Support Agent';
  if (prisma.agent && typeof prisma.agent.findUnique === 'function') {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { id: true, name: true, email: true },
      });
      if (agent?.name) {
        agentName = agent.name;
      }
    } catch {
      agentName = 'Support Agent';
    }
  }

  const payload = {
    chatId,
    customerId,
    agentId,
    agentName,
    assignedAt: assignedAt.toISOString(),
  };

  await io.in(`agent:${agentId}`).socketsJoin(`chat:${chatId}`);
  io.to(`agent:${agentId}`).emit('chat:assigned', payload);
  io.to(`chat:${chatId}`).emit('chat:assigned', payload);
}

export function registerChatHandlers(io: IoServer, socket: IoSocket) {
  socket.on('chat:new', async ({ customerId }) => {
    try {
      if (!customerId) {
        throw AppError.validation('customerId is required');
      }

      const chat = await prisma.chat.create({ data: { customerId } });

      socket.join(`chat:${chat.id}`);

      const result = await onNewChat(chat.id);

      if (result && result.assignedAgentId) {
        await emitAssignment(
          io,
          result.id,
          result.customerId,
          result.assignedAgentId,
          (result.assignedAt as Date) || new Date()
        );
      } else {
        io.to(`chat:${chat.id}`).emit('chat:queued', { chatId: chat.id, position: 0 });
      }
    } catch (err) {
      logger.error({ err: AppError.from(err) }, '[chat:new] handler error');
    }
  });

  socket.on('chat:rejoin', async ({ chatId }) => {
    try {
      if (!chatId) {
        throw AppError.validation('chatId is required');
      }
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: { messages: { orderBy: { sentAt: 'asc' } } },
      });
      if (!chat || chat.customerId !== socket.data.userId) {
        socket.emit('chat:rejoin_failed', { chatId });
        return;
      }
      let agentName: string | undefined;
      if (chat.assignedAgentId && prisma.agent && typeof prisma.agent.findUnique === 'function') {
        try {
          const agent = await prisma.agent.findUnique({
            where: { id: chat.assignedAgentId },
            select: { name: true },
          });
          if (agent?.name) {
            agentName = agent.name;
          }
        } catch {}
      }
      socket.join(`chat:${chat.id}`);
      socket.emit('chat:sync', {
        chatId: chat.id,
        status: chat.status,
        agentId: chat.assignedAgentId,
        agentName,
        messages: chat.messages.map((m) => ({
          id: m.id,
          senderType: m.senderType,
          messageType: m.messageType,
          text: m.text,
          imageUrl: m.imageUrl || undefined,
          sentAt: m.sentAt.toISOString(),
        })),
      });
    } catch (err) {
      logger.error({ err: AppError.from(err) }, '[chat:rejoin] handler error');
    }
  });

  socket.on('chat:message', async ({ chatId, senderType, text, clientTempId, imageUrl, messageType }) => {
    try {
      const messageContent = text || '';
      if (!chatId || !senderType || (!messageContent.trim() && !imageUrl)) {
        throw AppError.validation('chatId, senderType, and either text or imageUrl are required');
      }

      const finalMessageType = messageType || (imageUrl ? 'IMAGE' : 'TEXT');

      const message = await prisma.message.create({
        data: {
          chatId,
          senderType,
          text: messageContent,
          imageUrl: imageUrl || null,
          messageType: finalMessageType,
        },
      });

      if (senderType === 'CUSTOMER') {
        await processCustomerMessageMetrics(chatId, message.sentAt);
      } else if (senderType === 'AGENT') {
        const perf = await processAgentMessageMetrics(chatId, socket.data.userId, message.sentAt);
        if (perf && perf.agent) {
          io.to('managers').emit('agent:performance_updated', {
            agentId: perf.agent.id,
            totalLateReplies: perf.agent.totalLateReplies,
            avgFirstResponseSeconds: perf.agent.avgFirstResponseSeconds,
            lastFirstResponseSeconds: perf.firstResponseSeconds,
          });
        }
      }

      io.to(`chat:${chatId}`).emit('chat:message', {
        id: message.id,
        clientTempId,
        chatId,
        senderType,
        messageType: message.messageType,
        text: message.text,
        imageUrl: message.imageUrl || undefined,
        sentAt: message.sentAt.toISOString(),
      });
    } catch (err) {
      logger.error({ err: AppError.from(err) }, '[chat:message] handler error');
    }
  });

  socket.on('chat:closed', async ({ chatId }) => {
    try {
      if (!chatId) {
        throw AppError.validation('chatId is required');
      }

      const { agentId } = await closeChatAndRelease(chatId);
      const closedPayload = {
        chatId,
        agentId,
        closedAt: new Date().toISOString(),
      };
      io.to(`chat:${chatId}`).emit('chat:closed', closedPayload);
      if (agentId) {
        io.to(`agent:${agentId}`).emit('chat:closed', closedPayload);
        const next = await onAgentFreedUp(agentId);
        if (next) {
          await emitAssignment(
            io,
            next.id,
            next.customerId || 'cust-unknown',
            next.assignedAgentId || agentId,
            (next.assignedAt as Date) || new Date()
          );
        }
      }
    } catch (err) {
      logger.error({ err: AppError.from(err) }, '[chat:closed] handler error');
    }
  });
}

export async function sweepWaitingChats(io: IoServer) {
  try {
    const waitingChats = await prisma.chat.findMany({
      where: { status: 'WAITING' },
      orderBy: { queuedAt: 'asc' },
    });

    if (!waitingChats || waitingChats.length === 0) {
      return;
    }

    for (const chat of waitingChats) {
      const result = await onNewChat(chat.id);
      if (result && result.assignedAgentId) {
        await emitAssignment(
          io,
          result.id,
          result.customerId,
          result.assignedAgentId,
          (result.assignedAt as Date) || new Date()
        );
      }
    }
  } catch (err: any) {
    logger.warn({ msg: err?.message }, '[sweepWaitingChats] transient error');
  }
}

export async function sweepSlaBreaches(io: IoServer) {
  try {
    const breaches = await checkSlaBreaches();
    for (const breach of breaches) {
      io.to('managers').emit('chat:sla_breach', breach);
    }
  } catch (err: any) {
    logger.warn({ msg: err?.message }, '[sweepSlaBreaches] transient error');
  }
}