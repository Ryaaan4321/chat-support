import React from 'react';
import { create } from 'zustand';
import { AgentInfo, ChatItem, ShiftStatus } from '../types/socket.event.types';
import { INITIAL_AGENTS, INITIAL_CHATS, INITIAL_QUEUED_CHATS } from './mock-data';

export interface AgentProfile {
  id: string;
  name: string;
  email: string;
  team: string;
  initials: string;
  shiftStatus: ShiftStatus;
  chatCapacity: number;
  activeChatCount: number;
}

export interface CustomerObj {
  id?: string;
  name?: string;
  email?: string;
  [key: string]: any;
}

export interface Message {
  senderType: 'AGENT' | 'CUSTOMER' | string;
  text: string;
  sentAt: string;
  [key: string]: any;
}

export interface Chat {
  id: string;
  customerId?: string;
  customer?: CustomerObj | string | any;
  status: 'WAITING' | 'ACTIVE' | 'CLOSED' | string;
  assignedAgentId?: string | null;
  queuedAt?: string;
  assignedAt?: string | null;
  messages: Message[];
  unreadCount?: number;
  unread?: number;
  [key: string]: any;
}

export interface DeskState {
  me: AgentProfile;
  agents: AgentInfo[];
  chats: Chat[];
  queuedChats: Chat[];
  queue: Chat[];
  selectedChatId: string | null;
  mobileShowThread: boolean;
  filterStatus: string;
  isConnected: boolean;

  setMeStatus: (status: ShiftStatus) => void;
  setStatus: (status: ShiftStatus) => void;
  selectChat: (chatId: string | null) => void;
  setMobileShowThread: (show: boolean) => void;
  setFilterStatus: (filter: string) => void;
  setIsConnected: (connected: boolean) => void;

  sendMessage: (chatId: string, text: string) => void;
  closeChat: (chatId: string) => void;
  updateAgentCapacity: (agentId: string, capacity: number) => void;
  syncChatAssigned: (chatId: string, agentId: string) => void;
  syncChatQueued: (chat: Chat | ChatItem) => void;

  [key: string]: any;
}

const initialNormalizedChats: Chat[] = INITIAL_CHATS.map((c) => ({
  ...c,
  customer: c.customerId,
  customerId: c.customerId,
  unreadCount: c.unreadCount || 0,
  unread: c.unreadCount || 0,
}));

const initialNormalizedQueue: Chat[] = INITIAL_QUEUED_CHATS.map((c) => ({
  ...c,
  customer: c.customerId,
  customerId: c.customerId,
  unreadCount: 0,
  unread: 0,
}));

export const useDesk = create<DeskState>((set, get) => ({
  me: {
    id: 'agent-1',
    name: 'Sarah Connor',
    email: 'sarah.c@support.ops',
    team: 'Tier 2 Escalations',
    initials: 'SC',
    shiftStatus: 'AVAILABLE',
    chatCapacity: 3,
    activeChatCount: 2,
  },
  agents: INITIAL_AGENTS,
  chats: initialNormalizedChats,
  queuedChats: initialNormalizedQueue,
  queue: initialNormalizedQueue,
  selectedChatId: 'chat-101',
  mobileShowThread: false,
  filterStatus: 'ALL',
  isConnected: true,

  setMeStatus: (shiftStatus: ShiftStatus) => {
    set((state) => ({
      me: { ...state.me, shiftStatus },
      agents: state.agents.map((a) =>
        a.id === state.me.id ? { ...a, shiftStatus } : a
      ),
    }));
  },

  setStatus: (shiftStatus: ShiftStatus) => {
    get().setMeStatus(shiftStatus);
  },

  selectChat: (selectedChatId: string | null) => {
    set((state) => {
      const updatedChats = state.chats.map((c) =>
        c.id === selectedChatId ? { ...c, unreadCount: 0, unread: 0 } : c
      );
      return {
        selectedChatId,
        mobileShowThread: Boolean(selectedChatId),
        chats: updatedChats,
      };
    });
  },

  setMobileShowThread: (mobileShowThread: boolean) => {
    set({ mobileShowThread });
  },

  setFilterStatus: (filterStatus: string) => {
    set({ filterStatus });
  },

  setIsConnected: (isConnected: boolean) => {
    set({ isConnected });
  },

  sendMessage: (chatId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const newMessage = {
      senderType: 'AGENT' as const,
      text: trimmed,
      sentAt: new Date().toISOString(),
    };

    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, newMessage] }
          : c
      ),
    }));
  },

  closeChat: (chatId: string) => {
    set((state) => {
      const chatToClose = state.chats.find((c) => c.id === chatId);
      const remainingChats = state.chats.filter((c) => c.id !== chatId);
      const nextSelected =
        state.selectedChatId === chatId
          ? remainingChats[0]?.id || null
          : state.selectedChatId;

      const agentId = chatToClose?.assignedAgentId || state.me.id;

      return {
        chats: remainingChats,
        selectedChatId: nextSelected,
        mobileShowThread: Boolean(nextSelected),
        me:
          agentId === state.me.id
            ? { ...state.me, activeChatCount: Math.max(0, state.me.activeChatCount - 1) }
            : state.me,
        agents: state.agents.map((a) =>
          a.id === agentId
            ? { ...a, activeChatCount: Math.max(0, a.activeChatCount - 1) }
            : a
        ),
      };
    });
  },

  updateAgentCapacity: (agentId: string, capacity: number) => {
    const clamped = Math.max(1, Math.min(4, capacity));
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, chatCapacity: clamped } : a
      ),
      me: state.me.id === agentId ? { ...state.me, chatCapacity: clamped } : state.me,
    }));
  },

  syncChatAssigned: (chatId: string, agentId: string) => {
    set((state) => {
      const queued = state.queuedChats.find((q) => q.id === chatId);
      const remainingQueued = state.queuedChats.filter((q) => q.id !== chatId);

      const assignedChat: Chat = queued || {
        id: chatId,
        customerId: `cust-${chatId.slice(0, 6)}`,
        customer: `cust-${chatId.slice(0, 6)}`,
        status: 'ACTIVE',
        assignedAgentId: agentId,
        assignedAt: new Date().toISOString(),
        messages: [],
        unreadCount: 0,
        unread: 0,
      };

      const updatedChat: Chat = {
        ...assignedChat,
        status: 'ACTIVE',
        assignedAgentId: agentId,
        assignedAt: new Date().toISOString(),
      };

      return {
        queuedChats: remainingQueued,
        queue: remainingQueued,
        chats: [updatedChat, ...state.chats.filter((c) => c.id !== chatId)],
        agents: state.agents.map((a) =>
          a.id === agentId ? { ...a, activeChatCount: a.activeChatCount + 1 } : a
        ),
        me:
          state.me.id === agentId
            ? { ...state.me, activeChatCount: state.me.activeChatCount + 1 }
            : state.me,
      };
    });
  },

  syncChatQueued: (incomingChat: Chat | ChatItem) => {
    const normalized: Chat = {
      ...incomingChat,
      customer: (incomingChat as any).customer || incomingChat.customerId,
      customerId: incomingChat.customerId || (incomingChat as any).customer,
      unreadCount: (incomingChat as any).unreadCount || 0,
      unread: (incomingChat as any).unread || 0,
    };
    set((state) => {
      const updated = [
        ...state.queuedChats.filter((q) => q.id !== normalized.id),
        normalized,
      ];
      return {
        queuedChats: updated,
        queue: updated,
      };
    });
  },
}));

export const useMe = () => useDesk((s) => s.me);

export const useMyActiveChats = () => {
  const meId = useDesk((s) => s.me.id);
  const chats = useDesk((s) => s.chats);
  return React.useMemo(() => chats.filter((c) => c.assignedAgentId === meId), [chats, meId]);
};

export const useSelectedChat = () => {
  const selectedId = useDesk((s) => s.selectedChatId);
  const chats = useDesk((s) => s.chats);
  return React.useMemo(() => chats.find((c) => c.id === selectedId) || null, [chats, selectedId]);
};

export const useWaitingQueue = () => useDesk((s) => s.queuedChats);
export const useAllAgents = () => useDesk((s) => s.agents);
