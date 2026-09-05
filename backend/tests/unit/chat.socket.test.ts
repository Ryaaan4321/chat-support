import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { makeFakeSocket, makeFakeIo } from '../socket-test-harness';
import { registerChatHandlers } from '../../src/sockets/chat.socket';
import { onNewChat, onAgentFreedUp } from '../../src/services/assignment.service';
import { closeChatAndRelease } from '../../src/repositories/agent.repositories';
import { prisma } from '../../lib/prisma';

// Mocks define jest.fn() INLINE inside the factory - nothing captured from
// outer scope. Referencing an outer `const mockX = jest.fn()` here would
// hit a TDZ ReferenceError, because importing registerChatHandlers above
// eagerly requires assignment.service/agent.repositories/lib/prisma, which
// invokes these factories before any later `const` in this file has run.
jest.mock('../../src/services/assignment.service', () => ({
  onNewChat: jest.fn(),
  onAgentFreedUp: jest.fn(),
}));

jest.mock('../../src/repositories/agent.repositories', () => ({
  closeChatAndRelease: jest.fn(),
}));

jest.mock('../../lib/prisma', () => ({
  prisma: {
    chat: { create: jest.fn(), findUnique: jest.fn() },
    message: { create: jest.fn() },
  },
}));

// Import the (now-mocked) real bindings and cast them - same pattern as
// assignment.service.test.ts.
const mockOnNewChat = onNewChat as jest.MockedFunction<typeof onNewChat>;
const mockOnAgentFreedUp = onAgentFreedUp as jest.MockedFunction<typeof onAgentFreedUp>;
const mockCloseChatAndRelease = closeChatAndRelease as jest.MockedFunction<typeof closeChatAndRelease>;
const mockChatCreate = prisma.chat.create as jest.MockedFunction<typeof prisma.chat.create>;
const mockChatFindUnique = prisma.chat.findUnique as jest.MockedFunction<typeof prisma.chat.findUnique>;
const mockMessageCreate = prisma.message.create as jest.MockedFunction<typeof prisma.message.create>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('chat:new', () => {
  it('assigns immediately and joins the agent socket into the chat room when a slot is free', async () => {
    mockChatCreate.mockResolvedValue({ id: 'chat-1', customerId: 'cust-1' } as any);
    mockOnNewChat.mockResolvedValue({
      id: 'chat-1',
      assignedAgentId: 'agent-1',
      assignedAt: new Date('2026-01-01T00:00:00Z'),
    } as any);

    const { io, toEmitters, inRooms } = makeFakeIo();
    const { socket, handlers } = makeFakeSocket({ role: 'CUSTOMER', userId: 'cust-1' });
    registerChatHandlers(io as any, socket as any);

    await handlers['chat:new']({ customerId: 'cust-1' });

    expect(mockChatCreate).toHaveBeenCalledWith({ data: { customerId: 'cust-1' } });
    expect(mockOnNewChat).toHaveBeenCalledWith('chat-1');
    expect(inRooms['agent:agent-1'].socketsJoin).toHaveBeenCalledWith('chat:chat-1');
    expect(toEmitters['agent:agent-1'].emit).toHaveBeenCalledWith(
      'chat:assigned',
      expect.objectContaining({ chatId: 'chat-1', agentId: 'agent-1' }),
    );
    expect(toEmitters['chat:chat-1'].emit).toHaveBeenCalledWith(
      'chat:assigned',
      expect.objectContaining({ chatId: 'chat-1', agentId: 'agent-1' }),
    );
  });

  it('emits chat:queued and does not touch any agent room when no slot is free', async () => {
    mockChatCreate.mockResolvedValue({ id: 'chat-2', customerId: 'cust-2' } as any);
    mockOnNewChat.mockResolvedValue(null);

    const { io, toEmitters, inRooms } = makeFakeIo();
    const { socket, handlers } = makeFakeSocket({ role: 'CUSTOMER', userId: 'cust-2' });
    registerChatHandlers(io as any, socket as any);

    await handlers['chat:new']({ customerId: 'cust-2' });

    expect(toEmitters['chat:chat-2'].emit).toHaveBeenCalledWith(
      'chat:queued',
      expect.objectContaining({ chatId: 'chat-2' }),
    );
    expect(Object.keys(inRooms)).toHaveLength(0);
  });
});

describe('chat:rejoin', () => {
  it('rejects when the chat does not belong to this customer', async () => {
    mockChatFindUnique.mockResolvedValue({
      id: 'chat-3',
      customerId: 'someone-else',
      status: 'ACTIVE',
      assignedAgentId: 'agent-1',
      messages: [],
    } as any);

    const { io, toEmitters } = makeFakeIo();
    const { socket, handlers } = makeFakeSocket({ role: 'CUSTOMER', userId: 'cust-3' });
    registerChatHandlers(io as any, socket as any);

    await handlers['chat:rejoin']({ chatId: 'chat-3' });

    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('chat:rejoin_failed', { chatId: 'chat-3' });
    expect(Object.keys(toEmitters)).toHaveLength(0);
  });

  it('rejects when the chat does not exist', async () => {
    mockChatFindUnique.mockResolvedValue(null);

    const { io } = makeFakeIo();
    const { socket, handlers } = makeFakeSocket({ role: 'CUSTOMER', userId: 'cust-4' });
    registerChatHandlers(io as any, socket as any);

    await handlers['chat:rejoin']({ chatId: 'ghost-chat' });

    expect(socket.emit).toHaveBeenCalledWith('chat:rejoin_failed', { chatId: 'ghost-chat' });
  });

  it('rejoins and syncs full message history when ownership checks out', async () => {
    mockChatFindUnique.mockResolvedValue({
      id: 'chat-5',
      customerId: 'cust-5',
      status: 'ACTIVE',
      assignedAgentId: 'agent-2',
      messages: [
        { senderType: 'CUSTOMER', text: 'hi', sentAt: new Date('2026-01-01T00:00:00Z') },
        { senderType: 'AGENT', text: 'hello', sentAt: new Date('2026-01-01T00:01:00Z') },
      ],
    } as any);

    const { io } = makeFakeIo();
    const { socket, handlers } = makeFakeSocket({ role: 'CUSTOMER', userId: 'cust-5' });
    registerChatHandlers(io as any, socket as any);

    await handlers['chat:rejoin']({ chatId: 'chat-5' });

    expect(socket.join).toHaveBeenCalledWith('chat:chat-5');
    expect(socket.emit).toHaveBeenCalledWith(
      'chat:sync',
      expect.objectContaining({
        chatId: 'chat-5',
        status: 'ACTIVE',
        agentId: 'agent-2',
        messages: [
          expect.objectContaining({ text: 'hi' }),
          expect.objectContaining({ text: 'hello' }),
        ],
      }),
    );
  });
});

describe('chat:message', () => {
  it('persists then broadcasts to the chat room only', async () => {
    mockMessageCreate.mockResolvedValue({ sentAt: new Date('2026-01-01T00:00:00Z') } as any);

    const { io, toEmitters } = makeFakeIo();
    const { socket, handlers } = makeFakeSocket({ role: 'AGENT', userId: 'agent-1' });
    registerChatHandlers(io as any, socket as any);

    await handlers['chat:message']({ chatId: 'chat-1', senderType: 'AGENT', text: 'hi there' });

    expect(mockMessageCreate).toHaveBeenCalledWith({
      data: { chatId: 'chat-1', senderType: 'AGENT', text: 'hi there' },
    });
    expect(toEmitters['chat:chat-1'].emit).toHaveBeenCalledWith(
      'chat:message',
      expect.objectContaining({ text: 'hi there' }),
    );
  });
});

describe('chat:closed', () => {
  it('releases the slot and immediately reassigns the freed agent when a chat is queued', async () => {
    mockCloseChatAndRelease.mockResolvedValue({ agentId: 'agent-1' } as any);
    mockOnAgentFreedUp.mockResolvedValue({
      id: 'chat-9',
      assignedAt: new Date('2026-01-01T00:00:00Z'),
    } as any);

    const { io, toEmitters, inRooms } = makeFakeIo();
    const { socket, handlers } = makeFakeSocket({ role: 'AGENT', userId: 'agent-1' });
    registerChatHandlers(io as any, socket as any);

    await handlers['chat:closed']({ chatId: 'chat-8' });

    expect(mockCloseChatAndRelease).toHaveBeenCalledWith('chat-8');
    expect(toEmitters['chat:chat-8'].emit).toHaveBeenCalledWith(
      'chat:closed',
      expect.objectContaining({ chatId: 'chat-8', agentId: 'agent-1' }),
    );
    expect(toEmitters['agent:agent-1'].emit).toHaveBeenCalledWith(
      'chat:closed',
      expect.objectContaining({ chatId: 'chat-8', agentId: 'agent-1' }),
    );
    expect(mockOnAgentFreedUp).toHaveBeenCalledWith('agent-1');
    expect(inRooms['agent:agent-1'].socketsJoin).toHaveBeenCalledWith('chat:chat-9');
    expect(toEmitters['chat:chat-9'].emit).toHaveBeenCalledWith(
      'chat:assigned',
      expect.objectContaining({ chatId: 'chat-9', agentId: 'agent-1' }),
    );
  });

  it('notifies both the chat and the agent room when customer initiates the close', async () => {
    mockCloseChatAndRelease.mockResolvedValue({ agentId: 'agent-4' } as any);
    mockOnAgentFreedUp.mockResolvedValue(null);

    const { io, toEmitters } = makeFakeIo();
    const { socket, handlers } = makeFakeSocket({ role: 'CUSTOMER', userId: 'cust-99' });
    registerChatHandlers(io as any, socket as any);

    await handlers['chat:closed']({ chatId: 'chat-99' });

    expect(mockCloseChatAndRelease).toHaveBeenCalledWith('chat-99');
    expect(toEmitters['chat:chat-99'].emit).toHaveBeenCalledWith(
      'chat:closed',
      expect.objectContaining({ chatId: 'chat-99', agentId: 'agent-4' }),
    );
    expect(toEmitters['agent:agent-4'].emit).toHaveBeenCalledWith(
      'chat:closed',
      expect.objectContaining({ chatId: 'chat-99', agentId: 'agent-4' }),
    );
  });

  it('does nothing further when nothing is queued for the freed agent', async () => {
    mockCloseChatAndRelease.mockResolvedValue({ agentId: 'agent-2' } as any);
    mockOnAgentFreedUp.mockResolvedValue(null);

    const { io, toEmitters, inRooms } = makeFakeIo();
    const { socket, handlers } = makeFakeSocket({ role: 'AGENT', userId: 'agent-2' });
    registerChatHandlers(io as any, socket as any);

    await handlers['chat:closed']({ chatId: 'chat-10' });

    expect(toEmitters['chat:chat-10'].emit).toHaveBeenCalledWith('chat:closed', expect.anything());
    expect(toEmitters['agent:agent-2'].emit).toHaveBeenCalledWith('chat:closed', expect.anything());
    expect(Object.keys(inRooms)).toHaveLength(0);
  });

  it('skips reassignment when the chat had no assigned agent (already-closed idempotent path)', async () => {
    mockCloseChatAndRelease.mockResolvedValue({ agentId: null } as any);

    const { io } = makeFakeIo();
    const { socket, handlers } = makeFakeSocket({ role: 'AGENT', userId: 'agent-3' });
    registerChatHandlers(io as any, socket as any);

    await handlers['chat:closed']({ chatId: 'chat-11' });

    expect(mockOnAgentFreedUp).not.toHaveBeenCalled();
  });
});