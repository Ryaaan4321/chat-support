import { findAgentByEmail, findAgentById, createAgent } from '../repositories/auth.repository';
import { signToken, verifyToken, JwtUserPayload } from '../../lib/jwt';
import { AppError } from '../../lib/errors';
import crypto from 'crypto';

const MANAGER_SECRET_KEY = process.env.MANAGER_SECRET_KEY || 'swish-manager-super-secret-2026';

export async function signupUser(data: {
  name: string;
  email: string;
  role: 'AGENT' | 'MANAGER' | 'CUSTOMER';
  avatarUrl?: string;
  chatCapacity?: number;
}) {
  if (!data.name || typeof data.name !== 'string') {
    throw AppError.validation('Name is required');
  }
  if (!data.email || typeof data.email !== 'string') {
    throw AppError.validation('Valid email is required');
  }

  const role = data.role || 'AGENT';
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanName = data.name.trim();

  if (role === 'AGENT') {
    const existing = await findAgentByEmail(cleanEmail);
    if (existing) {
      throw AppError.conflict('An agent with this email already exists', { email: cleanEmail });
    }

    const agent = await createAgent({
      name: cleanName,
      email: cleanEmail,
      chatCapacity: data.chatCapacity ?? 3,
    });

    const payload: JwtUserPayload = {
      userId: agent.id,
      role: 'AGENT',
      email: agent.email,
      name: agent.name,
      avatarUrl: data.avatarUrl,
    };

    const token = signToken(payload);

    return {
      token,
      user: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: 'AGENT' as const,
        avatarUrl: data.avatarUrl,
        shiftStatus: agent.shiftStatus,
        chatCapacity: agent.chatCapacity,
        activeChatCount: agent.activeChatCount,
      },
    };
  }

  if (role === 'MANAGER') {
    const managerId = `mgr-${crypto.createHash('md5').update(cleanEmail).digest('hex').slice(0, 8)}`;
    const payload: JwtUserPayload = {
      userId: managerId,
      role: 'MANAGER',
      email: cleanEmail,
      name: cleanName,
      avatarUrl: data.avatarUrl,
    };

    const token = signToken(payload);

    return {
      token,
      user: {
        id: managerId,
        name: cleanName,
        email: cleanEmail,
        role: 'MANAGER' as const,
        avatarUrl: data.avatarUrl,
      },
    };
  }

  const customerId = `cust-${crypto.randomBytes(4).toString('hex')}`;
  const payload: JwtUserPayload = {
    userId: customerId,
    role: 'CUSTOMER',
    email: cleanEmail,
    name: cleanName,
    avatarUrl: data.avatarUrl,
  };

  const token = signToken(payload);

  return {
    token,
    user: {
      id: customerId,
      name: cleanName,
      email: cleanEmail,
      role: 'CUSTOMER' as const,
      avatarUrl: data.avatarUrl,
    },
  };
}

export async function loginAgent(email: string) {
  if (!email || typeof email !== 'string') {
    throw AppError.validation('Valid agent email is required');
  }

  const agent = await findAgentByEmail(email);
  if (!agent) {
    throw AppError.notFound('No agent account registered with this email', { email });
  }

  const payload: JwtUserPayload = {
    userId: agent.id,
    role: 'AGENT',
    email: agent.email,
    name: agent.name,
  };

  const token = signToken(payload);

  return {
    token,
    user: {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      role: 'AGENT' as const,
      shiftStatus: agent.shiftStatus,
      chatCapacity: agent.chatCapacity,
      activeChatCount: agent.activeChatCount,
    },
  };
}

export async function loginManager(email: string, secretKey?: string) {
  if (!email || typeof email !== 'string') {
    throw AppError.validation('Valid manager email is required');
  }

  if (secretKey && secretKey !== MANAGER_SECRET_KEY) {
    throw AppError.unauthorized('Invalid manager authorization key');
  }
  const managerId = `mgr-${crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex').slice(0, 8)}`;
  const payload: JwtUserPayload = {
    userId: managerId,
    role: 'MANAGER',
    email: email.toLowerCase().trim(),
    name: email.split('@')[0],
  };

  const token = signToken(payload);

  return {
    token,
    user: {
      id: managerId,
      name: payload.name || 'Manager',
      email: payload.email,
      role: 'MANAGER' as const,
    },
  };
}

export function createCustomerSession(customerId?: string) {
  const finalId = customerId?.trim() || `cust-${crypto.randomBytes(4).toString('hex')}`;

  const payload: JwtUserPayload = {
    userId: finalId,
    role: 'CUSTOMER',
  };

  const token = signToken(payload);

  return {
    token,
    user: {
      id: finalId,
      role: 'CUSTOMER' as const,
    },
  };
}

export async function getProfile(userId: string, role: string) {
  if (role === 'AGENT') {
    const agent = await findAgentById(userId);
    if (!agent) throw AppError.notFound('Agent profile not found', { userId });
    return {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      role: 'AGENT' as const,
      shiftStatus: agent.shiftStatus,
      chatCapacity: agent.chatCapacity,
      activeChatCount: agent.activeChatCount,
    };
  }

  return {
    id: userId,
    role,
  };
}

export function parseAndVerifyToken(token: string): JwtUserPayload {
  if (!token) {
    throw AppError.unauthorized('Authentication token is required');
  }
  return verifyToken(token);
}
