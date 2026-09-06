import { Request, Response, NextFunction } from 'express';
import {
  signupUser,
  loginAgent,
  loginManager,
  createCustomerSession,
  getProfile,
} from '../services/auth.service';
import { listAgents } from '../repositories/auth.repository';
import { updateAgentCapacity } from '../repositories/agent.repositories';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../../lib/prisma';
import { drainWaitingChatsForAgent } from '../sockets/agent.socket';
import { updateAgentShiftStatus } from '../services/performance.service';


export async function signupHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await signupUser(req.body);
    res.status(201).json({ success: true, ...result, data: result });
  } catch (err) {
    next(err);
  }
}

export async function loginAgentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const result = await loginAgent(email);
    res.status(200).json({ success: true, ...result, data: result });
  } catch (err) {
    next(err);
  }
}

export async function loginManagerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, secretKey } = req.body;
    const result = await loginManager(email, secretKey);
    res.status(200).json({ success: true, ...result, data: result });
  } catch (err) {
    next(err);
  }
}

export async function createCustomerSessionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { customerId } = req.body || {};
    const result = createCustomerSession(customerId);
    res.status(200).json({ success: true, ...result, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getProfileHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const profile = await getProfile(req.user.userId, req.user.role);
    res.status(200).json({ success: true, user: profile, data: profile });
  } catch (err) {
    next(err);
  }
}

export async function listAgentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const agents = await listAgents();
    res.status(200).json({ success: true, agents, data: agents });
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (req.user?.role === 'AGENT' && req.user.userId) {
      const updated = await updateAgentShiftStatus(req.user.userId, 'OFFLINE');
      const io = req.app.get('io');
      if (io) {
        io.to('managers').emit('agent:status_changed', {
          agentId: req.user.userId,
          shiftStatus: 'OFFLINE',
        });
        if (updated) {
          io.to('managers').emit('agent:shift_updated', {
            agentId: req.user.userId,
            shiftStatus: 'OFFLINE',
            activeShiftSeconds: updated.activeShiftSeconds,
            totalBreakSeconds: updated.totalBreakSeconds,
            shiftStartedAt: updated.shiftStartedAt ? updated.shiftStartedAt.toISOString() : null,
          });
        }
      }
    }
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

export async function updateAgentCapacityHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
    const { chatCapacity } = req.body;
    if (!id || !chatCapacity) {
      return res.status(400).json({ success: false, error: 'Agent id and chatCapacity are required' });
    }
    const updated = await updateAgentCapacity(id, Number(chatCapacity));
    const io = req.app.get('io');
    if (io) {
      io.to('managers').emit('agent:capacity_changed', {
        agentId: id,
        chatCapacity: updated.chatCapacity,
      });
      io.to(`agent:${id}`).emit('agent:capacity_changed', {
        agentId: id,
        chatCapacity: updated.chatCapacity,
      });
      if (updated.shiftStatus === 'AVAILABLE' && updated.activeChatCount < updated.chatCapacity) {
        await drainWaitingChatsForAgent(io, id);
      }
    }
    res.status(200).json({ success: true, agent: updated, data: updated });
  } catch (err) {
    next(err);
  }
}


