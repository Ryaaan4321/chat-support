import React from 'react';
import { create } from 'zustand';
import { AgentInfo, ChatItem, ShiftStatus } from '../types/socket.event.types';
import { createSocketClient, getActiveSocket } from './socket';
import { api, getStoredToken } from './api';

export interface AgentProfile {
  id: string;
  name: string;
  email: string;
  team: string;
  initials: string;
  shiftStatus: ShiftStatus;
  chatCapacity: number;
  activeChatCount: number;
  avatarUrl?: string;
}

export interface CustomerObj {
  id?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  [key: string]: any;
}

export interface Message {
  id?: string;
  clientTempId?: string;
  senderType: 'AGENT' | 'CUSTOMER' | string;
  text: string;
  sentAt: string;
  [key: string]: any;
}

export interface Chat {
  id: string;
  customerId?: string;
  customer?: CustomerObj | string | any;
  customerAvatar?: string | null;
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
  socketInitialized: boolean;
  isHydrating: boolean;

  initSocketSession: (agentData?: Partial<AgentProfile>) => Promise<void>;
  initManagerSession: () => Promise<void>;
  setMeStatus: (status: ShiftStatus) => void;
  setStatus: (status: ShiftStatus) => void;
  selectChat: (chatId: string | null) => void;
  setMobileShowThread: (show: boolean) => void;
  setFilterStatus: (filter: string) => void;
  setIsConnected: (connected: boolean) => void;

  sendMessage: (chatId: string, text: string) => void;
  closeChat: (chatId: string) => void;
  updateAgentCapacity: (agentId: string, capacity: number) => void;
  syncChatAssigned: (chatId: string, agentId: string, customerId?: string) => void;
  syncChatQueued: (chat: Chat | ChatItem) => void;

  [key: string]: any;
}

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
  selectedChatId: null,
  mobileShowThread: false,
  filterStatus: 'ALL',
  isConnected: false,
  socketInitialized: false,
  isHydrating: true,

  initSocketSession: async (agentData?: Partial<AgentProfile>) => {
    set({ isHydrating: true });
    let currentAgent = get().me;

    try {
      const meRes = await api.auth.getMe();
      if (meRes?.user) {
        const u = meRes.user;
        const initials = (u.name || u.email || 'Agent')
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        currentAgent = {
          id: u.id,
          name: u.name || 'Agent',
          email: u.email || '',
          team: 'Support Operations',
          initials: initials || 'AG',
          shiftStatus: (u.shiftStatus as ShiftStatus) || 'AVAILABLE',
          chatCapacity: u.chatCapacity ?? 3,
          activeChatCount: u.activeChatCount ?? 0,
          avatarUrl: u.avatarUrl || '/avatars/avatar-2.png',
        };
        set({ me: currentAgent });
      }
    } catch {
      if (agentData) {
        currentAgent = { ...currentAgent, ...agentData };
        set({ me: currentAgent });
      }
    }

    try {
      const activeRes = await api.chats.getMyActive();
      const rawChats = activeRes && Array.isArray(activeRes.chats) ? activeRes.chats : [];
      const normalizedDbChats: Chat[] = rawChats.map((c) => ({
        id: c.id,
        customerId: c.customerId,
        customer: c.customerId,
        customerAvatar: '/avatars/avatar-1.png',
        status: c.status,
        assignedAgentId: c.assignedAgentId || currentAgent.id,
        queuedAt: c.queuedAt,
        assignedAt: c.assignedAt,
        messages: (c.messages || []).map((m: any) => ({
          id: m.id,
          senderType: m.senderType,
          text: m.text,
          sentAt: m.sentAt,
        })),
        unreadCount: 0,
        unread: 0,
      }));

      set({
        chats: normalizedDbChats,
        selectedChatId: normalizedDbChats[0]?.id || null,
        me: { ...currentAgent, activeChatCount: normalizedDbChats.length },
        isHydrating: false,
      });
    } catch {
      set({ isHydrating: false });
    }

    const token = getStoredToken() || undefined;
    const socket = createSocketClient({
      role: 'AGENT',
      userId: currentAgent.id,
      token,
    });

    socket.off('connect');
    socket.off('disconnect');
    socket.off('chat:assigned');
    socket.off('chat:message');
    socket.off('chat:closed');
    socket.off('agent:capacity_changed');

    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('chat:assigned', (payload) => {
      const chatId = payload.chatId;
      const assignedAgentId = payload.agentId;
      const customerId = payload.customerId || `cust-${chatId.slice(0, 6)}`;

      if (assignedAgentId === get().me.id) {
        set((state) => {
          const existing = state.chats.find((c) => c.id === chatId);
          const updatedChat: Chat = existing
            ? { ...existing, status: 'ACTIVE', assignedAt: payload.assignedAt }
            : {
                id: chatId,
                customerId,
                customer: customerId,
                customerAvatar: '/avatars/avatar-1.png',
                status: 'ACTIVE',
                assignedAgentId,
                assignedAt: payload.assignedAt,
                messages: [],
                unreadCount: 0,
                unread: 0,
              };

          const remainingChats = state.chats.filter((c) => c.id !== chatId);
          const nextSelected = state.selectedChatId || chatId;

          return {
            chats: [updatedChat, ...remainingChats],
            selectedChatId: nextSelected,
            me: { ...state.me, activeChatCount: state.me.activeChatCount + 1 },
          };
        });
      }
    });

    socket.on('chat:message', (payload) => {
      const { chatId, senderType, text, sentAt, clientTempId, id } = payload;
      set((state) => {
        const isCurrentlyViewing = state.selectedChatId === chatId;
        const updated = state.chats.map((c) => {
          if (c.id !== chatId) return c;
          const existingIndex = c.messages.findIndex(
            (m: any) =>
              (id && m.id === id) ||
              (clientTempId && m.clientTempId === clientTempId) ||
              (m.text === text && Math.abs(new Date(m.sentAt).getTime() - new Date(sentAt).getTime()) < 4000)
          );
          if (existingIndex >= 0) {
            const updatedMsgs = [...c.messages];
            updatedMsgs[existingIndex] = {
              ...updatedMsgs[existingIndex],
              id: id || updatedMsgs[existingIndex].id,
              sentAt: sentAt || updatedMsgs[existingIndex].sentAt,
            };
            return { ...c, messages: updatedMsgs };
          }

          return {
            ...c,
            messages: [...c.messages, { id, clientTempId, senderType, text, sentAt }],
            unreadCount: isCurrentlyViewing ? 0 : (c.unreadCount || 0) + 1,
            unread: isCurrentlyViewing ? 0 : (c.unread || 0) + 1,
          };
        });

        return { chats: updated };
      });
    });

    socket.on('chat:closed', (payload) => {
      const { chatId } = payload;
      set((state) => {
        const remainingChats = state.chats.filter((c) => c.id !== chatId);
        const nextSelected = state.selectedChatId === chatId ? remainingChats[0]?.id || null : state.selectedChatId;

        return {
          chats: remainingChats,
          selectedChatId: nextSelected,
          mobileShowThread: Boolean(nextSelected),
          me: { ...state.me, activeChatCount: Math.max(0, state.me.activeChatCount - 1) },
        };
      });
    });

    socket.on('agent:capacity_changed', (payload) => {
      const { agentId, chatCapacity } = payload;
      set((state) => ({
        agents: state.agents.map((a) =>
          a.id === agentId ? { ...a, chatCapacity } : a
        ),
        me: state.me.id === agentId ? { ...state.me, chatCapacity } : state.me,
      }));
    });

    set({ socketInitialized: true });
  },

  initManagerSession: async () => {
    set({ isHydrating: true });
    try {
      const [agentsRes, queueRes, meRes] = await Promise.all([
        api.auth.getAgents().catch(() => ({ agents: [] })),
        api.chats.getQueue().catch(() => ({ queue: [] })),
        api.auth.getMe().catch(() => null),
      ]);

      if (meRes?.user) {
        const u = meRes.user;
        const initials = (u.name || u.email || 'Manager')
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        set({
          me: {
            id: u.id,
            name: u.name || 'Operations Manager',
            email: u.email || '',
            team: 'Operations',
            initials: initials || 'MN',
            shiftStatus: 'AVAILABLE',
            chatCapacity: 0,
            activeChatCount: 0,
            avatarUrl: u.avatarUrl || '/avatars/avatar-2.png',
          },
        });
      }

      const rawAgents = (agentsRes as any)?.agents || (agentsRes as any)?.data || [];
      const agents: AgentInfo[] = rawAgents.map((a: any) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        shiftStatus: a.shiftStatus || 'AVAILABLE',
        chatCapacity: a.chatCapacity ?? 3,
        activeChatCount: a.activeChatCount ?? 0,
        lastSeenAt: a.lastSeenAt,
        avatarUrl: a.avatarUrl || '/avatars/avatar-2.png',
      }));

      const rawQueue = (queueRes as any)?.queue || (queueRes as any)?.data || [];
      const queue: Chat[] = rawQueue.map((c: any) => ({
        id: c.id,
        customerId: c.customerId,
        customer: c.customerId,
        customerAvatar: '/avatars/avatar-1.png',
        status: c.status,
        queuedAt: c.queuedAt,
        messages: (c.messages || []).map((m: any) => ({
          id: m.id,
          senderType: m.senderType,
          text: m.text,
          sentAt: m.sentAt,
        })),
        unreadCount: 0,
        unread: 0,
      }));

      set({
        agents,
        queuedChats: queue,
        queue,
        isHydrating: false,
      });
    } catch {
      set({ isHydrating: false });
    }

    const token = getStoredToken() || undefined;
    const socket = createSocketClient({
      role: 'MANAGER',
      userId: 'manager-session',
      token,
    });

    socket.off('agent:status_changed');
    socket.off('agent:capacity_changed');
    socket.off('chat:queued');
    socket.off('chat:assigned');
    socket.off('chat:closed');

    socket.on('agent:status_changed', (payload) => {
      set((state) => ({
        agents: state.agents.map((a) =>
          a.id === payload.agentId ? { ...a, shiftStatus: payload.shiftStatus } : a
        ),
      }));
    });

    socket.on('agent:capacity_changed', (payload) => {
      set((state) => ({
        agents: state.agents.map((a) =>
          a.id === payload.agentId ? { ...a, chatCapacity: payload.chatCapacity } : a
        ),
      }));
    });

    socket.on('chat:queued', (payload) => {
      set((state) => {
        if (state.queuedChats.some((q) => q.id === payload.chatId)) return state;
        const newQueued: Chat = {
          id: payload.chatId,
          customerId: `cust-${payload.chatId.slice(0, 6)}`,
          customer: `cust-${payload.chatId.slice(0, 6)}`,
          customerAvatar: '/avatars/avatar-1.png',
          status: 'WAITING',
          queuedAt: new Date().toISOString(),
          messages: [{ senderType: 'CUSTOMER', text: 'Waiting for specialist...', sentAt: new Date().toISOString() }],
          unreadCount: 0,
          unread: 0,
        };
        const updated = [...state.queuedChats, newQueued];
        return { queuedChats: updated, queue: updated };
      });
    });

    socket.on('chat:assigned', (payload) => {
      set((state) => {
        const remainingQueue = state.queuedChats.filter((q) => q.id !== payload.chatId);
        const updatedAgents = state.agents.map((a) =>
          a.id === payload.agentId ? { ...a, activeChatCount: a.activeChatCount + 1 } : a
        );
        return {
          queuedChats: remainingQueue,
          queue: remainingQueue,
          agents: updatedAgents,
        };
      });
    });

    socket.on('chat:closed', (payload) => {
      set((state) => {
        if (!payload.agentId) return state;
        const updatedAgents = state.agents.map((a) =>
          a.id === payload.agentId ? { ...a, activeChatCount: Math.max(0, a.activeChatCount - 1) } : a
        );
        return { agents: updatedAgents };
      });
    });
  },

  setMeStatus: (shiftStatus: ShiftStatus) => {
    const socket = getActiveSocket();
    if (socket?.connected) {
      socket.emit('agent:status_changed', { agentId: get().me.id, shiftStatus });
    }

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

    const sentAt = new Date().toISOString();
    const clientTempId = 'msg-' + Math.random().toString(36).slice(2, 9);
    const newMessage: Message = {
      clientTempId,
      senderType: 'AGENT',
      text: trimmed,
      sentAt,
    };

    const socket = getActiveSocket();
    if (socket?.connected) {
      socket.emit('chat:message', {
        id: clientTempId,
        clientTempId,
        chatId,
        senderType: 'AGENT',
        text: trimmed,
        sentAt,
      });
    }

    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, newMessage] }
          : c
      ),
    }));
  },

  closeChat: (chatId: string) => {
    const socket = getActiveSocket();
    if (socket?.connected) {
      socket.emit('chat:closed', { chatId });
    }

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
    const clamped = Math.max(1, Math.min(10, capacity));
    const socket = getActiveSocket();
    if (socket?.connected) {
      socket.emit('agent:capacity_changed', { agentId, chatCapacity: clamped });
    }
    const token = getStoredToken();
    fetch(`/api/auth/agents/${agentId}/capacity`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ chatCapacity: clamped }),
    }).catch(() => {});

    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, chatCapacity: clamped } : a
      ),
      me: state.me.id === agentId ? { ...state.me, chatCapacity: clamped } : state.me,
    }));
  },

  syncChatAssigned: (chatId: string, agentId: string, customerId?: string) => {
    set((state) => {
      const custId = customerId || `cust-${chatId.slice(0, 6)}`;
      const updatedChat: Chat = {
        id: chatId,
        customerId: custId,
        customer: custId,
        customerAvatar: '/avatars/avatar-1.png',
        status: 'ACTIVE',
        assignedAgentId: agentId,
        assignedAt: new Date().toISOString(),
        messages: [],
        unreadCount: 0,
        unread: 0,
      };

      return {
        chats: [updatedChat, ...state.chats.filter((c) => c.id !== chatId)],
        selectedChatId: state.selectedChatId || chatId,
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
      customerAvatar: '/avatars/avatar-1.png',
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
