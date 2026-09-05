import { Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AppError } from '../../lib/errors';

export async function getMyActiveChatsHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const chats = await prisma.chat.findMany({
      where: {
        assignedAgentId: req.user.userId,
        status: 'ACTIVE',
      },
      include: {
        messages: {
          orderBy: { sentAt: 'asc' },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    res.status(200).json({ success: true, chats, data: chats });
  } catch (err) {
    next(err);
  }
}

export async function getChatHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { chatId } = req.params;
    if (!chatId) {
      throw AppError.validation('chatId parameter is required');
    }

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        messages: {
          orderBy: { sentAt: 'asc' },
        },
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!chat) {
      throw AppError.notFound('Chat not found', { chatId });
    }

    res.status(200).json({ success: true, chat, data: chat });
  } catch (err) {
    next(err);
  }
}

export async function getWaitingQueueHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const queue = await prisma.chat.findMany({
      where: {
        status: 'WAITING',
      },
      orderBy: {
        queuedAt: 'asc',
      },
    });

    res.status(200).json({ success: true, queue, data: queue });
  } catch (err) {
    next(err);
  }
}
