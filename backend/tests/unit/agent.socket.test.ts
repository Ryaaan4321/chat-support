import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { makeFakeSocket, makeFakeIo } from '../socket-test-harness';
import { registerAgentHandlers, registerManagerHandlers } from '../../src/sockets/agent.socket';
import { onAgentFreedUp } from '../../src/services/assignment.service';
import { prisma } from '../../lib/prisma';
jest.mock('../../src/services/assignment.service', () => ({
  onAgentFreedUp: jest.fn(),
}));
jest.mock('../../lib/prisma', () => ({
  prisma: {
    agent: { update: jest.fn(), updateMany: jest.fn() },
    chat: { findMany: jest.fn() },
  },
}));
const mockOnAgentFreedUp = onAgentFreedUp as jest.MockedFunction<typeof onAgentFreedUp>;
const mockAgentUpdate = prisma.agent.update as jest.MockedFunction<typeof prisma.agent.update>;
const mockChatFindMany = prisma.chat.findMany as jest.MockedFunction<typeof prisma.chat.findMany>;
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockAgentUpdate.mockResolvedValue({} as any);
  mockChatFindMany.mockResolvedValue([]);
});

afterEach(() => {
  jest.useRealTimers();
});

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
describe('connect resync', () => {
  it('stamps lastSeenAt and rejoins rooms for every currently active chat', async () => {
    mockChatFindMany.mockResolvedValue([{ id: 'chat-1' }, { id: 'chat-2' }] as any);
    const { io } = makeFakeIo();
    const { socket } = makeFakeSocket({ role: 'AGENT', userId: 'agent-1' });
    registerAgentHandlers(io as any, socket as any);
    await flush();
    expect(mockAgentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'agent-1' } }),
    );
    expect(mockChatFindMany).toHaveBeenCalledWith({
      where: { assignedAgentId: 'agent-1', status: 'ACTIVE' },
    });
    expect(socket.join).toHaveBeenCalledWith('chat:chat-1');
    expect(socket.join).toHaveBeenCalledWith('chat:chat-2');
  });
});

describe('agent:status_changed', () => {
  it('broadcasts to managers for any status change', async () => {
    const { io, toEmitters } = makeFakeIo();
    const { socket, handlers } = makeFakeSocket({ role: 'AGENT', userId: 'agent-1' });
    registerAgentHandlers(io as any, socket as any);
    await flush();
    await handlers['agent:status_changed']({ shiftStatus: 'ON_BREAK' });
    expect(toEmitters['managers'].emit).toHaveBeenCalledWith('agent:status_changed', {
      agentId: 'agent-1',
      shiftStatus: 'ON_BREAK',
    });
  });

  it('does NOT attempt reassignment for non-AVAILABLE statuses', async () => {
    const { io } = makeFakeIo();
    const { socket, handlers } = makeFakeSocket({ role: 'AGENT', userId: 'agent-1' });
    registerAgentHandlers(io as any, socket as any);
    await flush();

    await handlers['agent:status_changed']({ shiftStatus: 'WRAP_UP' });

    expect(mockOnAgentFreedUp).not.toHaveBeenCalled();
  });

  it('pulls the next queued chat and joins the agent into its room when going AVAILABLE', async () => {
    mockOnAgentFreedUp
      .mockResolvedValueOnce({
        id: 'chat-7',
        assignedAt: new Date('2026-01-01T00:00:00Z'),
      } as any)
      .mockResolvedValue(null);

    const { io, toEmitters, inRooms } = makeFakeIo();
    const { socket, handlers } = makeFakeSocket({ role: 'AGENT', userId: 'agent-1' });
    registerAgentHandlers(io as any, socket as any);
    await flush();

    await handlers['agent:status_changed']({ shiftStatus: 'AVAILABLE' });

    expect(mockOnAgentFreedUp).toHaveBeenCalledWith('agent-1');
    expect(inRooms['agent:agent-1'].socketsJoin).toHaveBeenCalledWith('chat:chat-7');
    expect(toEmitters['chat:chat-7'].emit).toHaveBeenCalledWith(
      'chat:assigned',
      expect.objectContaining({ chatId: 'chat-7', agentId: 'agent-1' }),
    );
  });

  it('does not emit chat:assigned when going AVAILABLE with nothing queued', async () => {
    mockOnAgentFreedUp.mockResolvedValue(null);

    const { io, inRooms } = makeFakeIo();
    const { socket, handlers } = makeFakeSocket({ role: 'AGENT', userId: 'agent-1' });
    registerAgentHandlers(io as any, socket as any);
    await flush();

    await handlers['agent:status_changed']({ shiftStatus: 'AVAILABLE' });

    expect(Object.keys(inRooms)).toHaveLength(0);
  });
});

describe('heartbeat and disconnect lifecycle', () => {
  it('stops updating lastSeenAt after disconnect fires', async () => {
    const { io } = makeFakeIo();
    const { socket, handlers } = makeFakeSocket({ role: 'AGENT', userId: 'agent-1' });
    registerAgentHandlers(io as any, socket as any);
    await flush();

    mockAgentUpdate.mockClear();
    jest.advanceTimersByTime(15_000);
    expect(mockAgentUpdate).toHaveBeenCalledTimes(1);

    await handlers['disconnect']();
    mockAgentUpdate.mockClear();
    jest.advanceTimersByTime(30_000);
    expect(mockAgentUpdate).not.toHaveBeenCalled();
  });

  it('sets shiftStatus to OFFLINE in DB and emits agent:status_changed to managers on disconnect', async () => {
    const { io, toEmitters } = makeFakeIo();
    const { socket, handlers } = makeFakeSocket({ role: 'AGENT', userId: 'agent-1' });
    registerAgentHandlers(io as any, socket as any);
    await flush();

    mockAgentUpdate.mockClear();
    await handlers['disconnect']();
    await flush();

    expect(mockAgentUpdate).toHaveBeenCalledWith({
      where: { id: 'agent-1' },
      data: { shiftStatus: 'OFFLINE' },
    });
    expect(toEmitters['managers'].emit).toHaveBeenCalledWith('agent:status_changed', {
      agentId: 'agent-1',
      shiftStatus: 'OFFLINE',
    });
  });
});

describe('manager capacity changes', () => {
  it('allows manager to change capacity and drains waiting queue when available', async () => {
    mockAgentUpdate.mockResolvedValue({
      id: 'agent-1',
      chatCapacity: 4,
      shiftStatus: 'AVAILABLE',
      activeChatCount: 2,
    } as any);
    mockOnAgentFreedUp
      .mockResolvedValueOnce({
        id: 'chat-waiting-1',
        assignedAt: new Date('2026-01-01T00:00:00Z'),
      } as any)
      .mockResolvedValueOnce(null);

    const { io, toEmitters, inRooms } = makeFakeIo();
    const { socket, handlers } = makeFakeSocket({ role: 'MANAGER', userId: 'manager-1' });
    registerManagerHandlers(io as any, socket as any);
    await flush();

    await handlers['agent:capacity_changed']({ agentId: 'agent-1', chatCapacity: 4 });
    await flush();

    expect(toEmitters['managers'].emit).toHaveBeenCalledWith('agent:capacity_changed', {
      agentId: 'agent-1',
      chatCapacity: 4,
    });
    expect(toEmitters['agent:agent-1'].emit).toHaveBeenCalledWith('agent:capacity_changed', {
      agentId: 'agent-1',
      chatCapacity: 4,
    });
    expect(mockOnAgentFreedUp).toHaveBeenCalledWith('agent-1');
    expect(inRooms['agent:agent-1'].socketsJoin).toHaveBeenCalledWith('chat:chat-waiting-1');
    expect(toEmitters['chat:chat-waiting-1'].emit).toHaveBeenCalledWith(
      'chat:assigned',
      expect.objectContaining({ chatId: 'chat-waiting-1', agentId: 'agent-1' })
    );
  });
});