import { AgentInfo } from '../../types/socket.event.types';
import { createSocketClient } from '../socket';
import { api, getStoredToken } from '../api';
import { Chat, StoreSet } from './types';

export async function initManagerSession(set: StoreSet): Promise<void> {
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
      shiftStartedAt: a.shiftStartedAt,
      activeShiftSeconds: a.activeShiftSeconds ?? 0,
      totalBreakSeconds: a.totalBreakSeconds ?? 0,
      shiftDate: a.shiftDate,
      totalLateReplies: a.totalLateReplies ?? 0,
      avgFirstResponseSeconds: a.avgFirstResponseSeconds ?? 0,
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
  socket.off('agent:performance_updated');
  socket.off('agent:shift_updated');
  socket.off('chat:queued');
  socket.off('chat:assigned');
  socket.off('chat:closed');
  socket.off('chat:sla_breach');

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

  socket.on('agent:performance_updated', (payload) => {
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === payload.agentId
          ? {
              ...a,
              totalLateReplies: payload.totalLateReplies,
              avgFirstResponseSeconds: payload.avgFirstResponseSeconds,
            }
          : a
      ),
    }));
  });

  socket.on('agent:shift_updated', (payload) => {
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === payload.agentId
          ? {
              ...a,
              shiftStatus: payload.shiftStatus,
              activeShiftSeconds: payload.activeShiftSeconds,
              totalBreakSeconds: payload.totalBreakSeconds,
              shiftStartedAt: payload.shiftStartedAt,
            }
          : a
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
      const remainingBreaches = state.slaBreaches.filter((b) => b.chatId !== payload.chatId);
      if (!payload.agentId) return { slaBreaches: remainingBreaches };
      const updatedAgents = state.agents.map((a) =>
        a.id === payload.agentId ? { ...a, activeChatCount: Math.max(0, a.activeChatCount - 1) } : a
      );
      return { agents: updatedAgents, slaBreaches: remainingBreaches };
    });
  });

  socket.on('chat:sla_breach', (payload) => {
    set((state) => {
      const exists = state.slaBreaches.some((b) => b.chatId === payload.chatId);
      const updated = exists
        ? state.slaBreaches.map((b) => (b.chatId === payload.chatId ? payload : b))
        : [...state.slaBreaches, payload];
      return { slaBreaches: updated };
    });
  });
}
