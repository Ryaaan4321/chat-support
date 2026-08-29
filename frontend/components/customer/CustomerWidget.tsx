'use client';

import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { MessageSquare, X, Minus, Sparkles, ShieldCheck, ChevronRight } from 'lucide-react';
import { createSocketClient, TypedSocket } from '../../lib/socket';
import { ChatItem, ChatMessagePayload, ChatAssignedPayload, ChatClosedPayload } from '../../types/socket.event.types';
import { QueuedState } from './QueuedState';
import { ActiveChatThread } from './ActiveChatThread';
import { StatusDot } from '../ui/StatusDot';

interface CustomerWidgetProps {
  initialCustomerId?: string;
  defaultOpen?: boolean;
}

export function CustomerWidget({ initialCustomerId, defaultOpen = false }: CustomerWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [customerId, setCustomerId] = useState(() => initialCustomerId || `cust-${Math.random().toString(36).slice(2, 8)}`);
  const [widgetState, setWidgetState] = useState<'IDLE' | 'QUEUED' | 'ACTIVE' | 'CLOSED'>('IDLE');
  const [queuePosition, setQueuePosition] = useState(1);
  const [currentChat, setCurrentChat] = useState<ChatItem | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<TypedSocket | null>(null);

  useEffect(() => {
    const socket = createSocketClient({
      role: 'CUSTOMER',
      userId: customerId,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('chat:queued', (payload) => {
      setQueuePosition(payload.position || 1);
      setWidgetState('QUEUED');
      setCurrentChat({
        id: payload.chatId,
        customerId,
        status: 'WAITING',
        messages: [],
      });
    });

    socket.on('chat:assigned', (payload: ChatAssignedPayload) => {
      setWidgetState('ACTIVE');
      setCurrentChat((prev) => ({
        id: payload.chatId,
        customerId,
        status: 'ACTIVE',
        assignedAgentId: payload.agentId,
        assignedAt: payload.assignedAt,
        messages: prev?.messages || [],
      }));
    });

    socket.on('chat:message', (payload: ChatMessagePayload) => {
      setCurrentChat((prev) => {
        if (!prev) return null;
        if (prev.messages.some((m) => m.sentAt === payload.sentAt && m.text === payload.text)) {
          return prev;
        }
        return {
          ...prev,
          messages: [
            ...prev.messages,
            {
              senderType: payload.senderType,
              text: payload.text,
              sentAt: payload.sentAt,
            },
          ],
        };
      });
    });

    socket.on('chat:closed', (payload: ChatClosedPayload) => {
      setWidgetState('CLOSED');
      setCurrentChat((prev) => (prev ? { ...prev, status: 'CLOSED' } : null));
    });

    return () => {
      socket.disconnect();
    };
  }, [customerId]);

  const handleStartChat = () => {
    if (!socketRef.current) return;
    setWidgetState('QUEUED');
    socketRef.current.emit('chat:new', { customerId });
  };

  const handleSendMessage = (text: string) => {
    if (!socketRef.current || !currentChat) return;
    socketRef.current.emit('chat:message', {
      chatId: currentChat.id,
      senderType: 'CUSTOMER',
      text,
      sentAt: new Date().toISOString(),
    });
  };

  const handleRestart = () => {
    const nextId = `cust-${Math.random().toString(36).slice(2, 8)}`;
    setCustomerId(nextId);
    setWidgetState('IDLE');
    setCurrentChat(null);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[540px] bg-white rounded-3xl shadow-2xl border border-[#E5E7EB] flex flex-col overflow-hidden mb-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="bg-[#111827] text-white px-5 py-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F9D58] to-[#16A34A] flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2">
                  Customer Support
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] font-mono">
                  <StatusDot status={isConnected ? 'CONNECTED' : 'DISCONNECTED'} size="sm" />
                  <span>{isConnected ? 'Live Assistant' : 'Connecting...'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/10 text-[#9CA3AF] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {widgetState === 'IDLE' && (
            <div className="flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-[#FFFFFF] to-[#F9FAFB]">
              <div className="pt-4">
                <div className="w-12 h-12 rounded-2xl bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#111827] tracking-tight mb-2">
                  How can we help?
                </h3>
                <p className="text-xs text-[#4B5563] leading-relaxed">
                  Connect instantly with our support team. We match you with an available agent the moment a slot frees up.
                </p>

                <div className="mt-6 p-3.5 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] flex items-center gap-3 text-xs text-[#374151]">
                  <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <span>Session: <strong className="font-mono text-[#111827]">{customerId}</strong></span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartChat}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#16A34A]/25 transition-all cursor-pointer group"
              >
                <span>Start Live Chat</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}

          {widgetState === 'QUEUED' && (
            <QueuedState position={queuePosition} customerId={customerId} />
          )}

          {(widgetState === 'ACTIVE' || widgetState === 'CLOSED') && currentChat && (
            <ActiveChatThread
              chat={currentChat}
              onSendMessage={handleSendMessage}
              onRestartChat={handleRestart}
              isClosed={widgetState === 'CLOSED'}
            />
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 cursor-pointer',
          isOpen
            ? 'bg-[#111827] text-white hover:bg-[#1F2937]'
            : 'bg-gradient-to-br from-[#0F9D58] to-[#16A34A] text-white hover:scale-105 shadow-[0_0_20px_rgba(22,163,74,0.4)] ring-2 ring-[#22C55E]/40'
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </div>
  );
}
