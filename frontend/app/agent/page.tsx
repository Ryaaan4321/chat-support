'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AppShell } from '../../components/shell/AppShell';
import { StatusSegmentedControl, ShiftStatus } from '../../components/agent/StatusSegmentedControl';
import { CapacitySlotList } from '../../components/agent/CapacitySlotList';
import { ChatWindow } from '../../components/agent/ChatWindow';
import { INITIAL_AGENTS, INITIAL_CHATS } from '../../lib/mock-data';
import { AgentInfo, ChatItem, ChatAssignedPayload, ChatMessagePayload, ChatClosedPayload } from '../../types/socket.event.types';
import { createSocketClient, TypedSocket } from '../../lib/socket';
import { UserCheck, RefreshCw } from 'lucide-react';

export default function AgentPage() {
  const [agents, setAgents] = useState<AgentInfo[]>(INITIAL_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(INITIAL_AGENTS[0].id);
  const [chats, setChats] = useState<ChatItem[]>(INITIAL_CHATS);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(INITIAL_CHATS[0]?.id || null);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<TypedSocket | null>(null);

  const currentAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];
  const activeChatsForAgent = chats.filter((c) => c.assignedAgentId === currentAgent.id && c.status === 'ACTIVE');
  const selectedChat = activeChatsForAgent.find((c) => c.id === selectedChatId) || activeChatsForAgent[0] || null;

  useEffect(() => {
    const socket = createSocketClient({
      role: 'AGENT',
      userId: currentAgent.id,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('chat:assigned', (payload: ChatAssignedPayload) => {
      if (payload.agentId === currentAgent.id) {
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
              unreadCount: 1,
            },
          ];
        });
        setSelectedChatId(payload.chatId);
      }
    });

    socket.on('chat:message', (payload: ChatMessagePayload) => {
      setChats((prev) =>
        prev.map((c) => {
          if (c.id === payload.chatId) {
            if (c.messages.some((m) => m.sentAt === payload.sentAt && m.text === payload.text)) {
              return c;
            }
            return {
              ...c,
              messages: [
                ...c.messages,
                {
                  senderType: payload.senderType,
                  text: payload.text,
                  sentAt: payload.sentAt,
                },
              ],
              unreadCount: payload.senderType === 'CUSTOMER' && selectedChatId !== payload.chatId
                ? (c.unreadCount ?? 0) + 1
                : 0,
            };
          }
          return c;
        })
      );
    });

    socket.on('chat:closed', (payload: ChatClosedPayload) => {
      setChats((prev) =>
        prev.map((c) => (c.id === payload.chatId ? { ...c, status: 'CLOSED' } : c))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [currentAgent.id, selectedChatId]);

  const handleStatusChange = (newStatus: ShiftStatus) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === currentAgent.id ? { ...a, shiftStatus: newStatus } : a))
    );
    if (socketRef.current) {
      socketRef.current.emit('agent:status_changed', {
        agentId: currentAgent.id,
        shiftStatus: newStatus,
      });
    }
  };

  const handleSendMessage = (chatId: string, text: string) => {
    const sentAt = new Date().toISOString();
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              messages: [...c.messages, { senderType: 'AGENT', text, sentAt }],
            }
          : c
      )
    );

    if (socketRef.current) {
      socketRef.current.emit('chat:message', {
        chatId,
        senderType: 'AGENT',
        text,
        sentAt,
      });
    }
  };

  const handleCloseChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, status: 'CLOSED' } : c))
    );

    if (socketRef.current) {
      socketRef.current.emit('chat:closed', { chatId });
    }
  };

  return (
    <AppShell
      activeRole="AGENT"
      activeIdentityLabel={currentAgent.name}
      isConnected={isConnected}
      headerAction={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#181C22] border border-[#272D36] rounded-lg px-2.5 py-1 text-xs text-[#9CA3AF]">
            <UserCheck className="w-3.5 h-3.5 text-[#22C55E]" />
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="bg-transparent text-white text-xs outline-none cursor-pointer pr-1 font-medium"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id} className="bg-[#14171C] text-white">
                  {a.name} ({a.chatCapacity} slots)
                </option>
              ))}
            </select>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6 flex-1">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#14171C] border border-[#22262B]">
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>{currentAgent.name}</span>
              <span className="text-[11px] font-mono text-[#6B7280]">({currentAgent.email})</span>
            </h1>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Concurrent Capacity: <strong className="font-mono text-[#22C55E]">{currentAgent.chatCapacity} chats max</strong>
            </p>
          </div>

          <StatusSegmentedControl
            currentStatus={currentAgent.shiftStatus as ShiftStatus}
            onChange={handleStatusChange}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          <div className="lg:col-span-4 flex flex-col">
            <CapacitySlotList
              capacity={currentAgent.chatCapacity}
              activeChats={activeChatsForAgent}
              selectedChatId={selectedChat?.id || null}
              onSelectChat={(id) => setSelectedChatId(id)}
            />
          </div>

          <div className="lg:col-span-8 flex flex-col">
            <ChatWindow
              chat={selectedChat}
              onSendMessage={handleSendMessage}
              onCloseChat={handleCloseChat}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
