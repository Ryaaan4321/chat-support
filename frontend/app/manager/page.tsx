'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AppShell } from '../../components/shell/AppShell';
import { MetricCards } from '../../components/manager/MetricCards';
import { AgentTable } from '../../components/manager/AgentTable';
import { QueueDepthView } from '../../components/manager/QueueDepthView';
import { INITIAL_AGENTS, INITIAL_CHATS, INITIAL_QUEUED_CHATS } from '../../lib/mock-data';
import { AgentInfo, ChatItem, AgentStatusChangedPayload, ChatAssignedPayload, ChatClosedPayload } from '../../types/socket.event.types';
import { createSocketClient, TypedSocket } from '../../lib/socket';
import { PlusCircle, ShieldCheck } from 'lucide-react';

export default function ManagerPage() {
  const [agents, setAgents] = useState<AgentInfo[]>(INITIAL_AGENTS);
  const [chats, setChats] = useState<ChatItem[]>(INITIAL_CHATS);
  const [queuedChats, setQueuedChats] = useState<ChatItem[]>(INITIAL_QUEUED_CHATS);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<TypedSocket | null>(null);

  useEffect(() => {
    const socket = createSocketClient({
      role: 'MANAGER',
      userId: 'manager-main',
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('agent:status_changed', (payload: AgentStatusChangedPayload) => {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === payload.agentId
            ? { ...a, shiftStatus: payload.shiftStatus, lastSeenAt: new Date().toISOString() }
            : a
        )
      );
    });

    socket.on('chat:queued', (payload) => {
      setQueuedChats((prev) => {
        if (prev.some((c) => c.id === payload.chatId)) return prev;
        return [
          ...prev,
          {
            id: payload.chatId,
            customerId: `customer-${payload.chatId.slice(0, 6)}`,
            status: 'WAITING',
            queuedAt: new Date().toISOString(),
            messages: [],
          },
        ];
      });
    });

    socket.on('chat:assigned', (payload: ChatAssignedPayload) => {
      setQueuedChats((prev) => prev.filter((c) => c.id !== payload.chatId));

      setChats((prev) => {
        const exists = prev.find((c) => c.id === payload.chatId);
        if (exists) {
          return prev.map((c) =>
            c.id === payload.chatId
              ? { ...c, status: 'ACTIVE', assignedAgentId: payload.agentId, assignedAt: payload.assignedAt }
              : c
          );
        }
        return [
          ...prev,
          {
            id: payload.chatId,
            customerId: `customer-${payload.chatId.slice(0, 6)}`,
            status: 'ACTIVE',
            assignedAgentId: payload.agentId,
            assignedAt: payload.assignedAt,
            messages: [],
          },
        ];
      });

      setAgents((prev) =>
        prev.map((a) =>
          a.id === payload.agentId
            ? { ...a, activeChatCount: a.activeChatCount + 1 }
            : a
        )
      );
    });

    socket.on('chat:closed', (payload: ChatClosedPayload) => {
      setChats((prev) =>
        prev.map((c) => (c.id === payload.chatId ? { ...c, status: 'CLOSED' } : c))
      );

      if (payload.agentId) {
        setAgents((prev) =>
          prev.map((a) =>
            a.id === payload.agentId
              ? { ...a, activeChatCount: Math.max(0, a.activeChatCount - 1) }
              : a
          )
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleUpdateCapacity = (agentId: string, newCapacity: number) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, chatCapacity: newCapacity } : a))
    );
  };

  const handleSimulateNewQueuedChat = () => {
    const randomId = `chat-sim-${Math.random().toString(36).slice(2, 6)}`;
    const custId = `cust-${Math.random().toString(36).slice(2, 6)}`;

    setQueuedChats((prev) => [
      ...prev,
      {
        id: randomId,
        customerId: custId,
        status: 'WAITING',
        queuedAt: new Date().toISOString(),
        messages: [{ senderType: 'CUSTOMER', text: 'Simulated customer waiting in line', sentAt: new Date().toISOString() }],
      },
    ]);

    if (socketRef.current) {
      socketRef.current.emit('chat:new', { customerId: custId });
    }
  };

  const activeChatsCount = chats.filter((c) => c.status === 'ACTIVE').length;

  return (
    <AppShell
      activeRole="MANAGER"
      activeIdentityLabel="Queue Supervisor"
      isConnected={isConnected}
      headerAction={
        <button
          type="button"
          onClick={handleSimulateNewQueuedChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Simulate Incoming Chat</span>
        </button>
      }
    >
      <div className="flex flex-col gap-6 flex-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Manager Operations & Queue Supervisor</h1>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Live capacity tuning, active concurrency bounds, and queue wait times
            </p>
          </div>
        </div>

        <MetricCards
          agents={agents}
          queuedChats={queuedChats}
          activeChatsCount={activeChatsCount}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 flex flex-col">
            <AgentTable
              agents={agents}
              onUpdateCapacity={handleUpdateCapacity}
            />
          </div>

          <div className="lg:col-span-4 flex flex-col">
            <QueueDepthView queuedChats={queuedChats} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
