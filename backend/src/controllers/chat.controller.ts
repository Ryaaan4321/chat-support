import { Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AppError } from '../../lib/errors';

export async function getMyActiveChatsHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw AppError.unauthorized('Authentication required to view active chats');
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
    const chatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : (req.params.chatId as string);
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

export async function getAgentPerformanceChatsHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const agentId = Array.isArray(req.params.agentId) ? req.params.agentId[0] : (req.params.agentId as string);
    if (!agentId) {
      throw AppError.validation('agentId parameter is required');
    }

    const chats = await prisma.chat.findMany({
      where: {
        assignedAgentId: agentId,
      },
      include: {
        messages: {
          orderBy: { sentAt: 'asc' },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
      take: 20,
    });

    res.status(200).json({ success: true, chats, data: chats });
  } catch (err) {
    next(err);
  }
}

export async function getUploadSignatureHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { generateUploadSignature } = await import('../services/cloudinary.service');
    const folder = req.body?.folder || req.query?.folder?.toString() || 'chat_attachments';
    const signatureData = generateUploadSignature({ folder });
    res.status(200).json({
      success: true,
      data: signatureData,
      ...signatureData,
    });
  } catch (err) {
    next(err);
  }
}

const DEFAULT_CANNED_RESPONSES = [
  {
    shortcut: 'greet',
    title: 'Warm Welcome',
    category: 'Greeting',
    text: 'Hello! Thanks for reaching out to Swish support. How can I assist you today?',
  },
  {
    shortcut: 'order',
    title: 'Order Status Check',
    category: 'Order Status',
    text: 'Checking your order status right now. One moment please.',
  },
  {
    shortcut: 'id',
    title: 'Request Order ID',
    category: 'Order Status',
    text: 'Could you please provide your Order ID so I can pull up your details?',
  },
  {
    shortcut: 'address',
    title: 'Address Updated',
    category: 'Delivery',
    text: 'I have updated your address with our delivery partner.',
  },
  {
    shortcut: 'refund',
    title: 'Refund Processed',
    category: 'Billing',
    text: 'A full refund has been initiated to your original payment method. It will reflect in 3-5 business days.',
  },
  {
    shortcut: 'escalate',
    title: 'Escalate to Specialist',
    category: 'Escalation',
    text: 'I am transferring this issue to our senior operations team for immediate follow-up.',
  },
  {
    shortcut: 'bye',
    title: 'Closing / Satisfaction',
    category: 'Closing',
    text: 'Is there anything else I can help you with today? Have a great day!',
  },
];

export async function getCannedResponsesHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const agentId = req.user?.userId;
    // Check if table has records; if not, seed defaults
    let responses = await prisma.cannedResponse.findMany({
      where: agentId
        ? { OR: [{ agentId: null }, { agentId }] }
        : { agentId: null },
      orderBy: { shortcut: 'asc' },
    });

    if (responses.length === 0) {
      await prisma.cannedResponse.createMany({
        data: DEFAULT_CANNED_RESPONSES,
        skipDuplicates: true,
      });
      responses = await prisma.cannedResponse.findMany({
        where: agentId
          ? { OR: [{ agentId: null }, { agentId }] }
          : { agentId: null },
        orderBy: { shortcut: 'asc' },
      });
    }

    res.status(200).json({
      success: true,
      cannedResponses: responses,
      data: responses,
    });
  } catch (err) {
    next(err);
  }
}
