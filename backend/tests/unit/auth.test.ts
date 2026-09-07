import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  loginAgent,
  loginManager,
  createCustomerSession,
  getProfile,
  parseAndVerifyToken,
} from '../../src/services/auth.service';
import { logoutHandler } from '../../src/controllers/auth.controller';
import { findAgentByEmail, findAgentById } from '../../src/repositories/auth.repository';
import { signToken, verifyToken } from '../../lib/jwt';
import { AppError } from '../../lib/errors';
import { authenticateHttp, requireRole, authenticateSocket } from '../../src/middlewares/auth.middleware';
import { prisma } from '../../lib/prisma';

jest.mock('../../src/repositories/auth.repository', () => ({
  findAgentByEmail: jest.fn(),
  findAgentById: jest.fn(),
  listAgents: jest.fn(),
}));

jest.mock('../../lib/prisma', () => ({
  prisma: {
    agent: { update: jest.fn() },
  },
}));

const mockFindAgentByEmail = findAgentByEmail as jest.MockedFunction<typeof findAgentByEmail>;
const mockFindAgentById = findAgentById as jest.MockedFunction<typeof findAgentById>;
const mockAgentUpdate = prisma.agent.update as jest.MockedFunction<typeof prisma.agent.update>;

beforeEach(() => {
  jest.clearAllMocks();
  mockAgentUpdate.mockResolvedValue({} as any);
});

describe('JWT Utility', () => {
  it('signs and verifies a valid token', () => {
    const payload = {
      userId: 'agent-123',
      role: 'AGENT' as const,
      email: 'agent@swish.ops',
      name: 'Agent Smith',
    };

    const token = signToken(payload, '1h');
    expect(typeof token).toBe('string');

    const decoded = verifyToken(token);
    expect(decoded.userId).toBe('agent-123');
    expect(decoded.role).toBe('AGENT');
    expect(decoded.email).toBe('agent@swish.ops');
  });

  it('throws AppError when token is invalid or corrupted', () => {
    expect(() => verifyToken('invalid.jwt.token')).toThrow(AppError);
  });
});

describe('Auth Service', () => {
  describe('loginAgent', () => {
    it('authenticates an existing agent and returns a valid JWT', async () => {
      mockFindAgentByEmail.mockResolvedValue({
        id: 'agent-1',
        name: 'Sarah Connor',
        email: 'sarah@swish.ops',
        managerId: null,
        shiftStatus: 'AVAILABLE',
        breakStartedAt: null,
        breakDurationMinutes: null,
        shiftStartedAt: null,
        activeShiftSeconds: 0,
        totalBreakSeconds: 0,
        shiftDate: null,
        totalLateReplies: 0,
        avgFirstResponseSeconds: null,
        chatCapacity: 3,
        activeChatCount: 1,
        lastSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await loginAgent('sarah@swish.ops');

      expect(mockFindAgentByEmail).toHaveBeenCalledWith('sarah@swish.ops');
      expect(result.user.id).toBe('agent-1');
      expect(result.user.role).toBe('AGENT');
      expect(typeof result.token).toBe('string');

      const verified = parseAndVerifyToken(result.token);
      expect(verified.userId).toBe('agent-1');
      expect(verified.role).toBe('AGENT');
    });

    it('throws AppError.notFound when agent is not found', async () => {
      mockFindAgentByEmail.mockResolvedValue(null);

      await expect(loginAgent('unknown@swish.ops')).rejects.toThrow(AppError);
    });

    it('throws AppError.validation when email is empty', async () => {
      await expect(loginAgent('')).rejects.toThrow(AppError);
    });
  });

  describe('loginManager', () => {
    it('issues a manager token with correct credentials', async () => {
      const result = await loginManager('supervisor@swish.ops');

      expect(result.user.role).toBe('MANAGER');
      expect(typeof result.token).toBe('string');

      const verified = parseAndVerifyToken(result.token);
      expect(verified.role).toBe('MANAGER');
      expect(verified.email).toBe('supervisor@swish.ops');
    });

    it('allows manager login with email without requiring secretKey', async () => {
      const result = await loginManager('supervisor@swish.ops');
      expect(result.user.role).toBe('MANAGER');
      expect(result.token).toBeDefined();
    });

    it('rejects invalid or empty manager email', async () => {
      await expect(loginManager('')).rejects.toThrow(AppError);
    });
  });

  describe('createCustomerSession', () => {
    it('creates an anonymous customer session and token', () => {
      const result = createCustomerSession('cust-custom-42');

      expect(result.user.id).toBe('cust-custom-42');
      expect(result.user.role).toBe('CUSTOMER');

      const verified = parseAndVerifyToken(result.token);
      expect(verified.userId).toBe('cust-custom-42');
      expect(verified.role).toBe('CUSTOMER');
    });

    it('auto-generates a customer ID if none is passed', () => {
      const result = createCustomerSession();

      expect(result.user.id.startsWith('cust-')).toBe(true);
      expect(result.user.role).toBe('CUSTOMER');
    });
  });

  describe('getProfile', () => {
    it('retrieves agent profile by userId', async () => {
      mockFindAgentById.mockResolvedValue({
        id: 'agent-2',
        name: 'Alex Murphy',
        email: 'alex@swish.ops',
        managerId: null,
        shiftStatus: 'ON_BREAK',
        breakStartedAt: null,
        breakDurationMinutes: null,
        shiftStartedAt: null,
        activeShiftSeconds: 0,
        totalBreakSeconds: 0,
        shiftDate: null,
        totalLateReplies: 0,
        avgFirstResponseSeconds: null,
        chatCapacity: 2,
        activeChatCount: 0,
        lastSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const profile = await getProfile('agent-2', 'AGENT');
      expect(profile.name).toBe('Alex Murphy');
      expect(profile.role).toBe('AGENT');
    });
  });
});

describe('Auth Middlewares', () => {
  it('authenticateHttp passes when valid Bearer token is provided', () => {
    const token = signToken({ userId: 'u1', role: 'AGENT' });
    const req = { headers: { authorization: `Bearer ${token}` } } as any;
    const res = {} as any;
    const next = jest.fn();

    authenticateHttp(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user.userId).toBe('u1');
    expect(req.user.role).toBe('AGENT');
  });

  it('requireRole allows permitted roles and blocks forbidden roles', () => {
    const middleware = requireRole(['AGENT', 'MANAGER']);
    const next = jest.fn();

    const allowedReq = { user: { userId: 'u1', role: 'AGENT' } } as any;
    middleware(allowedReq, {} as any, next);
    expect(next).toHaveBeenCalledWith();

    const blockedReq = { user: { userId: 'u2', role: 'CUSTOMER' } } as any;
    middleware(blockedReq, {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('authenticateSocket verifies socket handshake token', () => {
    const token = signToken({ userId: 'agent-socket-1', role: 'AGENT' });
    const socket = {
      handshake: { auth: { token }, headers: {} },
      data: {},
    } as any;
    const next = jest.fn();

    authenticateSocket(socket, next);

    expect(next).toHaveBeenCalledWith();
    expect(socket.data.userId).toBe('agent-socket-1');
    expect(socket.data.role).toBe('AGENT');
  });
});

describe('logoutHandler', () => {
  it('updates agent shiftStatus to OFFLINE and emits to managers', async () => {
    const mockEmit = jest.fn();
    const req = {
      user: { userId: 'agent-123', role: 'AGENT' },
      app: {
        get: jest.fn().mockReturnValue({
          to: jest.fn().mockReturnValue({ emit: mockEmit }),
        }),
      },
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
    const next = jest.fn();

    await logoutHandler(req, res, next);

    expect(mockAgentUpdate).toHaveBeenCalledWith({
      where: { id: 'agent-123' },
      data: { shiftStatus: 'OFFLINE' },
    });
    expect(mockEmit).toHaveBeenCalledWith('agent:status_changed', {
      agentId: 'agent-123',
      shiftStatus: 'OFFLINE',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
