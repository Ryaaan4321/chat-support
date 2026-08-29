'use client';

import React from 'react';
import clsx from 'clsx';
import { MessageSquare, User, Clock, Inbox } from 'lucide-react';
import { ChatItem } from '../../types/socket.event.types';

interface CapacitySlotListProps {
  capacity: number;
  activeChats: ChatItem[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
}

export function CapacitySlotList({
  capacity,
  activeChats,
  selectedChatId,
  onSelectChat,
}: CapacitySlotListProps) {
  const slots = Array.from({ length: capacity }).map((_, index) => {
    const chat = activeChats[index] || null;
    return { slotIndex: index + 1, chat };
  });

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
          Active Slots ({activeChats.length}/{capacity})
        </span>
        <span className="text-[11px] font-mono text-[#6B7280]">
          Auto-Assign Engine
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {slots.map(({ slotIndex, chat }) => {
          if (!chat) {
            return (
              <div
                key={`empty-slot-${slotIndex}`}
                className="h-20 rounded-xl border border-dashed border-[#272D36] bg-[#121519]/50 flex items-center justify-center gap-2.5 text-[#6B7280] select-none transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-[#181C22] border border-[#272D36] flex items-center justify-center text-[10px] font-mono text-[#4B5563]">
                  {slotIndex}
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Inbox className="w-3.5 h-3.5 text-[#4B5563]" />
                  <span>Available Slot</span>
                </div>
              </div>
            );
          }

          const isSelected = selectedChatId === chat.id;
          const lastMsg = chat.messages[chat.messages.length - 1];

          return (
            <button
              key={chat.id}
              type="button"
              onClick={() => onSelectChat(chat.id)}
              className={clsx(
                'w-full text-left p-3 rounded-xl border transition-all duration-150 flex flex-col gap-1.5 relative overflow-hidden group',
                isSelected
                  ? 'bg-[#1A1F26] border-[#16A34A] shadow-[0_0_15px_rgba(22,163,74,0.15)] ring-1 ring-[#16A34A]/50'
                  : 'bg-[#14171C] border-[#22262B] hover:border-[#333A46] hover:bg-[#181C22]'
              )}
            >
              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#16A34A]" />
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#1C2026] border border-[#2B323C] flex items-center justify-center text-[10px] font-mono text-[#22C55E]">
                    {slotIndex}
                  </div>
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <User className="w-3 h-3 text-[#9CA3AF]" />
                    {chat.customerId}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono text-[#6B7280]">
                  <Clock className="w-3 h-3" />
                  <span>
                    {chat.assignedAt
                      ? new Date(chat.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Live'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#9CA3AF] line-clamp-1 pl-7">
                {lastMsg ? `${lastMsg.senderType === 'AGENT' ? 'You: ' : ''}${lastMsg.text}` : 'Conversation started'}
              </p>

              {(chat.unreadCount ?? 0) > 0 && (
                <div className="absolute right-3 bottom-3 px-1.5 py-0.5 rounded-full bg-[#16A34A] text-white text-[10px] font-bold">
                  {chat.unreadCount}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
