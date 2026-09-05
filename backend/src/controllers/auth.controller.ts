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

export async function updateAgentCapacityHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
    const { chatCapacity } = req.body;
    if (!id || !chatCapacity) {
      return res.status(400).json({ success: false, error: 'Agent id and chatCapacity are required' });
    }
    const updated = await updateAgentCapacity(id, Number(chatCapacity));
    res.status(200).json({ success: true, agent: updated, data: updated });
  } catch (err) {
    next(err);
  }
}


