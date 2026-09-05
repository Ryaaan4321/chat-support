'use client';

import React from 'react';
import Image from 'next/image';
import { useDesk, useMyActiveChats, Chat } from '@/lib/desk-store';
import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';
import { TimeDisplay } from './time-display';

export function ChatList() {
  const chats = useMyActiveChats();
  const selectedChatId = useDesk((s) => s.selectedChatId);
  const selectChat = useDesk((s) => s.selectChat);
  const isHydrating = useDesk((s) => s.isHydrating);

  if (isHydrating) {
    return (
      <div className="flex flex-col gap-2 p-2">
        {[1, 2].map((i) => (
          <div key={i} className="w-full rounded-xl p-3 border border-[#E2E8F0] bg-white animate-pulse flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-full bg-slate-200" />
              <div className="h-3 w-24 bg-slate-200 rounded" />
            </div>
            <div className="h-2.5 w-3/4 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center h-64">
        <div className="size-12 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] mb-3">
          <MessageSquare className="size-5" />
        </div>
        <p className="text-sm font-medium text-[#0F172A]">No active chats assigned</p>
        <p className="text-xs text-[#64748B] mt-1 max-w-xs leading-relaxed">
          Incoming queued chats will be assigned to your open slots automatically.
        </p>
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-2 p-2">
      {chats.map((chat: Chat) => {
        const isSelected = chat.id === selectedChatId;
        const lastMsg = chat.messages[chat.messages.length - 1];
        const customerName =
          chat.customerId ||
          (typeof chat.customer === 'object' ? chat.customer?.name : chat.customer) ||
          chat.id;
        const unreadCount = chat.unreadCount ?? chat.unread ?? 0;
        const avatarUrl =
          chat.customerAvatar ||
          (chat as any).avatarUrl ||
          (chat.customer as any)?.avatarUrl ||
          '/avatars/avatar-1.png';

        return (
          <button
            key={chat.id}
            type="button"
            onClick={() => selectChat(chat.id)}
            className={cn(
              'w-full text-left rounded-xl p-3 transition-all cursor-pointer border flex flex-col gap-1.5 relative',
              isSelected
                ? 'bg-[#EFF6FF] border-[#2563EB] shadow-xs'
                : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
            )}
          >
            {isSelected && (
              <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#2563EB] rounded-r-full" />
            )}

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-7 rounded-full relative overflow-hidden bg-[#EFF6FF] border border-[#BFDBFE] shrink-0">
                  <Image
                    src={avatarUrl}
                    alt={customerName}
                    fill
                    sizes="28px"
                    className="object-cover"
                  />
                </div>
                <span className="text-xs font-semibold text-[#0F172A] truncate">
                  {customerName}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {unreadCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#2563EB] text-white text-[10px] font-bold">
                    {unreadCount} NEW
                  </span>
                ) : null}
                <TimeDisplay
                  timestamp={chat.assignedAt}
                  fallback="Live"
                  className="text-[10px] text-[#94A3B8] font-mono"
                />
              </div>
            </div>

            <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">
              {lastMsg ? lastMsg.text : 'Chat connected. Awaiting response...'}
            </p>
          </button>
        );
      })}
    </div>
  );
}
