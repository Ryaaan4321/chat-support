import React from 'react';
import { create } from 'zustand';
import { AgentProfile, Chat, DeskState } from './desk/types';
import { initAgentSession } from './desk/agent-session';
import { initManagerSession } from './desk/manager-session';
import { createChatActions } from './desk/chat-actions';

// Re-export all desk types for 100% backward compatibility
export * from './desk/types';

export const useDesk = create<DeskState>((set, get) => ({
  me: {
    id: '',
    name: 'Support Agent',
    email: '',
    team: 'Support Operations',
    initials: 'AG',
    shiftStatus: 'AVAILABLE',
    chatCapacity: 3,
    activeChatCount: 0,
    avatarUrl: '/avatars/avatar-2.png',
  },
  agents: [],
  chats: [],
  queuedChats: [],
  queue: [],
  slaBreaches: [],
  selectedChatId: null,
  mobileShowThread: false,
  filterStatus: 'ALL',
  isConnected: false,
  socketInitialized: false,
  isHydrating: true,

  initSocketSession: async (agentData?: Partial<AgentProfile>) => {
    return initAgentSession(set, get, agentData);
  },

  initManagerSession: async () => {
    return initManagerSession(set);
  },

  ...createChatActions(set, get),
}));

// Re-export all selector hooks for 100% backward compatibility
export const useMe = () => useDesk((s) => s.me);

export const useMyActiveChats = () => {
  const meId = useDesk((s) => s.me.id);
  const chats = useDesk((s) => s.chats);
  return React.useMemo(() => {
    if (!meId) return chats;
    return chats.filter((c) => c.assignedAgentId === meId || !c.assignedAgentId);
  }, [chats, meId]);
};

export const useSelectedChat = () => {
  const selectedId = useDesk((s) => s.selectedChatId);
  const chats = useDesk((s) => s.chats);
  return React.useMemo(() => chats.find((c) => c.id === selectedId) || null, [chats, selectedId]);
};

export const useWaitingQueue = () => useDesk((s) => s.queuedChats);
export const useAllAgents = () => useDesk((s) => s.agents);
export const useSlaBreaches = () => useDesk((s) => s.slaBreaches);
