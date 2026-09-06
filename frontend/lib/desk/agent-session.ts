import { ShiftStatus } from '../../types/socket.event.types';
import { createSocketClient } from '../socket';
import { api, getStoredToken } from '../api';
import { AgentProfile, Chat, StoreSet, StoreGet } from './types';

export async function initAgentSession(
  set: StoreSet,
  get: StoreGet,
  agentData?: Partial<AgentProfile>
): Promise<void> {
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
        messageType: m.messageType,
        text: m.text,
        imageUrl: m.imageUrl,
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
    const { chatId, senderType, text, sentAt, clientTempId, id, imageUrl, messageType } = payload;
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
            imageUrl: imageUrl || updatedMsgs[existingIndex].imageUrl,
            messageType: messageType || updatedMsgs[existingIndex].messageType,
          };
          return { ...c, messages: updatedMsgs };
        }

        return {
          ...c,
          messages: [
            ...c.messages,
            {
              id,
              clientTempId,
              senderType,
              messageType: messageType || (imageUrl ? 'IMAGE' : 'TEXT'),
              text,
              imageUrl,
              sentAt,
            },
          ],
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
      const nextSelected =
        state.selectedChatId === chatId ? remainingChats[0]?.id || null : state.selectedChatId;

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
}
