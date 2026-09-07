import { ShiftStatus, ChatItem } from '../../types/socket.event.types';
import { getActiveSocket } from '../socket';
import { getStoredToken } from '../api';
import { Chat, Message, StoreSet, StoreGet } from './types';
import { DEFAULT_CUSTOMER_AVATAR } from '../avatars';

export function createChatActions(set: StoreSet, get: StoreGet) {
  return {
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

    sendMessage: (
      chatId: string,
      text: string,
      imageUrl?: string,
      explicitMessageType?: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO'
    ) => {
      const trimmed = text.trim();
      if (!trimmed && !imageUrl) return;

      const sentAt = new Date().toISOString();
      const clientTempId = 'msg-' + Math.random().toString(36).slice(2, 9);
      const messageType = explicitMessageType || (imageUrl ? 'IMAGE' : 'TEXT');
      const newMessage: Message = {
        clientTempId,
        senderType: 'AGENT',
        messageType,
        text: trimmed,
        imageUrl,
        sentAt,
      };

      const socket = getActiveSocket();
      if (socket?.connected) {
        socket.emit('chat:message', {
          id: clientTempId,
          clientTempId,
          chatId,
          senderType: 'AGENT',
          messageType,
          text: trimmed,
          imageUrl,
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
          customerAvatar: DEFAULT_CUSTOMER_AVATAR,
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
        customerAvatar: DEFAULT_CUSTOMER_AVATAR,
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

    dismissSlaBreach: (chatId: string) => {
      set((state) => ({
        slaBreaches: state.slaBreaches.filter((b) => b.chatId !== chatId),
      }));
    },
  };
}
