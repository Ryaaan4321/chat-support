import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../../types/socket.event.types';
import { onNewChat, onAgentFreedUp } from '../services/assignment.service';
import { closeChatAndRelease } from '../repositories/agent.repositories';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { AppError } from '../../lib/errors';

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerChatHandlers(io: IoServer, socket: IoSocket) {
  socket.on('chat:new', async ({ customerId }) => {
    try {
      if (!customerId) {
        throw AppError.validation('customerId is required');
      }

      const chat = await prisma.chat.create({ data: { customerId } });

      socket.join(`chat:${chat.id}`);

      const result = await onNewChat(chat.id);

      if (result) {
        const payload = {
          chatId: result.id,
          agentId: result.assignedAgentId as string,
          assignedAt: (result.assignedAt as Date).toISOString(),
        };
        await io.in(`agent:${result.assignedAgentId}`).socketsJoin(`chat:${chat.id}`);
        io.to(`agent:${result.assignedAgentId}`).emit('chat:assigned', payload);
        io.to(`chat:${chat.id}`).emit('chat:assigned', payload);
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
      socket.join(`chat:${chat.id}`);
      socket.emit('chat:sync', {
        chatId: chat.id,
        status: chat.status,
        agentId: chat.assignedAgentId,
        messages: chat.messages.map((m) => ({
          senderType: m.senderType,
          text: m.text,
          sentAt: m.sentAt.toISOString(),
        })),
      });
    } catch (err) {
      logger.error({ err: AppError.from(err) }, '[chat:rejoin] handler error');
    }
  });

  socket.on('chat:message', async ({ chatId, senderType, text }) => {
    try {
      if (!chatId || !senderType || !text) {
        throw AppError.validation('chatId, senderType, and text are required');
      }

      const message = await prisma.message.create({ data: { chatId, senderType, text } });

      io.to(`chat:${chatId}`).emit('chat:message', {
        chatId,
        senderType,
        text,
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
      io.to(`chat:${chatId}`).emit('chat:closed', {
        chatId,
        agentId,
        closedAt: new Date().toISOString(),
      });
      if (agentId) {
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
      logger.error({ err: AppError.from(err) }, '[chat:closed] handler error');
    }
  });
}

export async function sweepWaitingChats(io: IoServer) {
  const waitingChats = await prisma.chat.findMany({
    where: { status: 'WAITING' },
    orderBy: { queuedAt: 'asc' },
  });

  for (const chat of waitingChats) {
    const result = await onNewChat(chat.id);
    if (result) {
      const payload = {
        chatId: result.id,
        agentId: result.assignedAgentId as string,
        assignedAt: (result.assignedAt as Date).toISOString(),
      };
      await io.in(`agent:${result.assignedAgentId}`).socketsJoin(`chat:${chat.id}`);
      io.to(`agent:${result.assignedAgentId}`).emit('chat:assigned', payload);
      io.to(`chat:${chat.id}`).emit('chat:assigned', payload);
    }
  }
}