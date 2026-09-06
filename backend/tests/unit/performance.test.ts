import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  calculateLatencySeconds,
  isLateReply,
  computeRunningAverage,
  updateAgentShiftStatus,
  checkSlaBreaches,
} from '../../src/services/performance.service';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    agent: { findUnique: jest.fn(), update: jest.fn() },
    chat: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
  },
}));

const mockAgentFindUnique = prisma.agent.findUnique as jest.MockedFunction<typeof prisma.agent.findUnique>;
const mockAgentUpdate = prisma.agent.update as jest.MockedFunction<typeof prisma.agent.update>;
const mockChatFindMany = prisma.chat.findMany as jest.MockedFunction<typeof prisma.chat.findMany>;

describe('performance.service unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('latency and late reply calculation', () => {
    it('computes correct latency in seconds', () => {
      const t1 = new Date('2026-09-01T12:00:00Z');
      const t2 = new Date('2026-09-01T12:02:15Z');
      expect(calculateLatencySeconds(t1, t2)).toBe(135);
    });

    it('identifies late reply when latency exceeds 120s threshold', () => {
      expect(isLateReply(121)).toBe(true);
      expect(isLateReply(120)).toBe(false);
      expect(isLateReply(45)).toBe(false);
    });

    it('computes running average first response time correctly', () => {
      expect(computeRunningAverage(null, 30, 1)).toBe(30);
      expect(computeRunningAverage(30, 60, 2)).toBe(45);
      expect(computeRunningAverage(45, 15, 3)).toBe(35);
    });
  });

  describe('agent shift tracking', () => {
    it('accumulates active shift seconds when transitioning to ON_BREAK', async () => {
      const tenMinutesAgo = new Date(Date.now() - 600_000);
      mockAgentFindUnique.mockResolvedValue({
        id: 'agent-1',
        shiftStatus: 'AVAILABLE',
        shiftStartedAt: tenMinutesAgo,
        activeShiftSeconds: 0,
        totalBreakSeconds: 0,
        shiftDate: new Date().toISOString().split('T')[0],
        updatedAt: tenMinutesAgo,
      } as any);

      mockAgentUpdate.mockImplementation(({ data }: any) => Promise.resolve({ ...data, id: 'agent-1' }) as any);

      const result = await updateAgentShiftStatus('agent-1', 'ON_BREAK');
      expect(result).not.toBeNull();
      expect(mockAgentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shiftStatus: 'ON_BREAK',
            activeShiftSeconds: expect.any(Number),
          }),
        })
      );
      expect(mockAgentUpdate.mock.calls[0][0].data.activeShiftSeconds).toBeGreaterThanOrEqual(599);
    });

    it('accumulates break seconds across multiple break and resume cycles', async () => {
      const fiveMinutesAgo = new Date(Date.now() - 300_000);
      mockAgentFindUnique.mockResolvedValue({
        id: 'agent-1',
        shiftStatus: 'ON_BREAK',
        shiftStartedAt: new Date(Date.now() - 3600_000),
        activeShiftSeconds: 1800,
        totalBreakSeconds: 120,
        shiftDate: new Date().toISOString().split('T')[0],
        updatedAt: fiveMinutesAgo,
      } as any);

      mockAgentUpdate.mockImplementation(({ data }: any) => Promise.resolve({ ...data, id: 'agent-1' }) as any);

      const result = await updateAgentShiftStatus('agent-1', 'AVAILABLE');
      expect(result).not.toBeNull();
      const updatedData = mockAgentUpdate.mock.calls[0][0].data;
      expect(updatedData.shiftStatus).toBe('AVAILABLE');
      expect(updatedData.totalBreakSeconds).toBeGreaterThanOrEqual(419);
      expect(updatedData.activeShiftSeconds).toBe(1800);
    });
  });

  describe('SLA breach detection', () => {
    it('identifies waiting chats and active chats with no reply past threshold', async () => {
      const oldTime = new Date(Date.now() - 150_000);
      mockChatFindMany
        .mockResolvedValueOnce([
          {
            id: 'chat-wait-breach',
            customerId: 'cust-1',
            assignedAgentId: null,
            status: 'WAITING',
            queuedAt: oldTime,
          },
        ] as any)
        .mockResolvedValueOnce([
          {
            id: 'chat-active-breach',
            customerId: 'cust-2',
            assignedAgentId: 'agent-1',
            status: 'ACTIVE',
            lastCustomerMessageAt: oldTime,
            lastAgentReplyAt: null,
          },
        ] as any);

      const breaches = await checkSlaBreaches();
      expect(breaches).toHaveLength(2);
      expect(breaches[0].chatId).toBe('chat-wait-breach');
      expect(breaches[0].breached).toBe(true);
      expect(breaches[1].chatId).toBe('chat-active-breach');
      expect(breaches[1].breached).toBe(true);
    });
  });
});
