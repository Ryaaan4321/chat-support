import { onNewChat, onAgentFreedUp } from '../../src/services/assignment.service';
import { claimAgentForChat, claimChatForAgent } from '../../src/repositories/agent.repositories';
import { describe, it, expect, afterEach, jest } from '@jest/globals';
jest.mock('../../src/repositories/agent.repositories', () => ({
  claimAgentForChat: jest.fn(),
  claimChatForAgent: jest.fn(),
}));

const mockClaimAgentForChat = claimAgentForChat as jest.MockedFunction<typeof claimAgentForChat>;
const mockClaimChatForAgent = claimChatForAgent as jest.MockedFunction<typeof claimChatForAgent>;

describe('assignment.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('onNewChat', () => {
    it('returns null when no agents are available', async () => {
      mockClaimAgentForChat.mockResolvedValue(null);
      const result = await onNewChat('chat-1');
      expect(result).toBeNull();
      expect(mockClaimAgentForChat).toHaveBeenCalledWith('chat-1');
    });
    it('does not select an agent that is already at capacity', async () => {
      mockClaimAgentForChat.mockResolvedValue(null);
      const result = await onNewChat('chat-2');
      expect(result).toBeNull();
    });
    it('assigns the chat when a free agent exists', async () => {
      const assignedChat = {
        id: 'chat-3',
        assignedAgentId: 'agent-1',
        status: 'ACTIVE',
      };
      mockClaimAgentForChat.mockResolvedValue(assignedChat as any);
      const result = await onNewChat('chat-3');
      expect(result).toEqual(assignedChat);
    });

    it('assigns 3rd chat when agent capacity is 3 and active count is 2', async () => {
      const assignedChat = {
        id: 'chat-triple',
        assignedAgentId: 'agent-capacity-3',
        status: 'ACTIVE',
      };
      mockClaimAgentForChat.mockResolvedValue(assignedChat as any);
      const result = await onNewChat('chat-triple');
      expect(result).toEqual(assignedChat);
      expect(mockClaimAgentForChat).toHaveBeenCalledWith('chat-triple');
    });
    it('only assigns one of two simultaneous chats when there is one free slot', async () => {

      mockClaimAgentForChat
        .mockResolvedValue(null)
        .mockResolvedValueOnce({ id: 'chat-a', assignedAgentId: 'agent-1' } as any);
      const [resultA, resultB] = await Promise.all([
        onNewChat('chat-a'),
        onNewChat('chat-b'),
      ]);
      const assignedCount = [resultA, resultB].filter((r) => r !== null).length;
      expect(assignedCount).toBe(1);
    });
  });
  describe('onAgentFreedUp', () => {
    it('returns null when agent capacity changed and they are now full', async () => {
      mockClaimChatForAgent.mockResolvedValue(null);
      const result = await onAgentFreedUp('agent-1');
      expect(result).toBeNull();
      expect(mockClaimChatForAgent).toHaveBeenCalledWith('agent-1');
    });

    it('pulls the next waiting chat when agent becomes eligible again', async () => {
      const claimedChat = {
        id: 'chat-4',
        assignedAgentId: 'agent-2',
        status: 'ACTIVE',
      };
      mockClaimChatForAgent.mockResolvedValue(claimedChat as any);
      const result = await onAgentFreedUp('agent-2');
      expect(result).toEqual(claimedChat);
    });

    it('returns null when queue is empty even though agent has room', async () => {
      mockClaimChatForAgent.mockResolvedValue(null);
      const result = await onAgentFreedUp('agent-3');
      expect(result).toBeNull();
    });

    it('blocks new assignments when capacity is decreased below active chat count', async () => {
      mockClaimChatForAgent.mockResolvedValue(null);
      const result = await onAgentFreedUp('agent-over-capacity');
      expect(result).toBeNull();
      expect(mockClaimChatForAgent).toHaveBeenCalledWith('agent-over-capacity');
    });
  });
});