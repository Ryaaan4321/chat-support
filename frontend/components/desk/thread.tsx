'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useDesk, useSelectedChat } from '@/lib/desk-store';
import { Textarea } from '@/components/ui/textare';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Send, CheckCircle2, ArrowLeft, User, Clock, MessageSquareOff } from 'lucide-react';
import { TimeDisplay } from './time-display';

const CANNED_RESPONSES = [
  'Checking your order status right now.',
  'Could you please provide your order ID?',
  'I have updated your address with our delivery partner.',
  'Is there anything else I can help you with today?',
];

export function Thread() {
  const chat = useSelectedChat();
  const selectChat = useDesk((s) => s.selectChat);
  const sendMessage = useDesk((s) => s.sendMessage);
  const closeChat = useDesk((s) => s.closeChat);
  const setMobileShowThread = useDesk((s) => s.setMobileShowThread);
  const me = useDesk((s) => s.me);
  const isHydrating = useDesk((s) => s.isHydrating);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages]);

  if (isHydrating) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-[#F8FAFC] animate-pulse">
        <div className="size-12 rounded-2xl bg-slate-200 mb-3" />
        <div className="h-4 w-36 bg-slate-200 rounded mb-2" />
        <div className="h-3 w-52 bg-slate-100 rounded" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-[#F8FAFC]">
        <div className="size-14 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] shadow-xs mb-4">
          <MessageSquareOff className="size-6" />
        </div>
        <h2 className="text-sm font-semibold text-[#0F172A]">No Active Chat Selected</h2>
        <p className="text-xs text-[#64748B] mt-1.5 max-w-sm leading-relaxed">
          Select an active chat from your assigned queue to view history and respond in real-time.
        </p>
      </div>
    );
  }


  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || !chat) return;

    if (typeof sendMessage === 'function') {
      sendMessage(chat.id, trimmed);
    } else {
      const store = useDesk.getState() as any;
      if (typeof store.sendMessage === 'function') {
        store.sendMessage(chat.id, trimmed);
      }
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    if (!chat) return;
    if (typeof closeChat === 'function') {
      closeChat(chat.id);
    } else {
      const store = useDesk.getState() as any;
      if (typeof store.closeChat === 'function') {
        store.closeChat(chat.id);
      }
    }
  };

  const handleBack = () => {
    if (typeof selectChat === 'function') {
      selectChat(null);
    }
    if (typeof setMobileShowThread === 'function') {
      setMobileShowThread(false);
    }
  };

  const customerId = chat.customerId || chat.id;
  const customerObj = typeof chat.customer === 'object' && chat.customer !== null ? chat.customer : null;
  const customerName =
    customerObj?.name ||
    (typeof chat.customer === 'string' ? chat.customer : null) ||
    customerId ||
    'Customer';

  const customerAvatar =
    chat.customerAvatar ||
    (chat as any).avatarUrl ||
    (customerObj as any)?.avatarUrl ||
    '/avatars/avatar-1.png';

  const agentAvatar =
    (me as any)?.avatarUrl ||
    '/avatars/avatar-2.png';

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <header className="flex h-14 items-center justify-between border-b border-[#E2E8F0] px-3 sm:px-4 md:px-5 shrink-0 bg-white gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="lg:hidden p-1.5 -ml-1 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer shrink-0"
          >
            <ArrowLeft className="size-4" />
          </button>

          <div className="size-9 rounded-full relative overflow-hidden bg-[#EFF6FF] border border-[#BFDBFE] shrink-0">
            <Image
              src={customerAvatar}
              alt={customerName}
              fill
              sizes="36px"
              className="object-cover"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-semibold text-[#0F172A] truncate max-w-[110px] sm:max-w-[200px]">
                {customerName}
              </h2>
              <span
                className="size-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100 shrink-0"
                title="Active"
              />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#94A3B8] truncate">
              <span className="flex items-center gap-1">
                <Clock className="size-3 shrink-0" />
                <TimeDisplay timestamp={chat.assignedAt} fallback="Live" />
              </span>
              <span>•</span>
              <span className="truncate">ID: {customerId.slice(0, 8)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold shrink-0">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden xs:inline">Active</span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-[#E2E8F0] text-xs font-medium text-[#475569] transition-all cursor-pointer shrink-0 whitespace-nowrap"
          >
            <CheckCircle2 className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">Resolve & </span>
            <span>Close</span>
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 md:p-5 space-y-3 bg-[#F8FAFC]">
        {(chat.messages || []).map((m: { senderType: string; text: string; sentAt: string }, idx: number) => {
          const isAgent =
            m.senderType === 'AGENT' ||
            (m as any).from === 'agent' ||
            (m as any).sender === 'agent' ||
            (m as any).role === 'agent';

          const timeVal = m.sentAt || (m as any).timestamp || new Date();
          const avatarToUse = isAgent ? agentAvatar : customerAvatar;

          return (
            <div
              key={idx}
              className={cn(
                'flex gap-2 items-end max-w-[90%] sm:max-w-[80%]',
                isAgent ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'
              )}
            >
              <div className="size-7 rounded-full relative overflow-hidden bg-white border border-[#E2E8F0] shrink-0 mb-1">
                <Image
                  src={avatarToUse}
                  alt={isAgent ? 'Agent' : 'Customer'}
                  fill
                  sizes="28px"
                  className="object-cover"
                />
              </div>

              <div className={cn('flex flex-col', isAgent ? 'items-end' : 'items-start')}>
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-mono text-[#94A3B8]">
                  <span>{isAgent ? 'You (Agent)' : customerName}</span>
                  <span>•</span>
                  <TimeDisplay timestamp={typeof timeVal === 'string' ? timeVal : timeVal.toISOString()} fallback="" />
                </div>
                <div
                  className={cn(
                    'rounded-2xl px-3.5 py-2 text-xs md:text-sm leading-relaxed break-words shadow-2xs',
                    isAgent
                      ? 'bg-[#2563EB] text-white rounded-br-xs font-normal'
                      : 'bg-white text-[#0F172A] border border-[#E2E8F0] rounded-bl-xs'
                  )}
                >
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[#E2E8F0] p-3 bg-white shrink-0 space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {CANNED_RESPONSES.map((resp, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInput(resp)}
              className="text-[11px] font-medium whitespace-nowrap rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 text-[#475569] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] hover:text-[#2563EB] transition-all shrink-0 cursor-pointer"
            >
              {resp}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your reply (Press Enter to send, Shift+Enter for newline)..."
            className="min-h-[56px] bg-white border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8] rounded-xl text-xs p-2.5 focus:border-[#2563EB]"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim()}
            className="h-10 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white shrink-0 shadow-xs disabled:opacity-40 cursor-pointer"
          >
            <Send className="size-4" />
            <span className="text-xs font-semibold">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
