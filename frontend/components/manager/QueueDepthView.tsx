'use client';

import React from 'react';
import { Hourglass, CheckCircle2, User, Clock, ArrowRight } from 'lucide-react';
import { ChatItem } from '../../types/socket.event.types';

interface QueueDepthViewProps {
  queuedChats: ChatItem[];
}

export function QueueDepthView({ queuedChats }: QueueDepthViewProps) {
  return (
    <div className="rounded-2xl bg-[#14171C] border border-[#22262B] overflow-hidden shadow-sm flex flex-col">
      <div className="px-5 py-4 border-b border-[#22262B] flex items-center justify-between bg-[#171B21]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1F252E] border border-[#2A3340] flex items-center justify-center text-[#FBBF24]">
            <Hourglass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">FIFO Queue Depth</h3>
            <p className="text-[11px] text-[#6B7280]">Waiting chats ordered by queued timestamp</p>
          </div>
        </div>

        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1C2026] text-[#9CA3AF] border border-[#2B313C]">
          {queuedChats.length} Waiting
        </span>
      </div>

      <div className="p-4 flex-1">
        {queuedChats.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-[#16A34A]/10 border border-[#16A34A]/20 flex items-center justify-center text-[#22C55E] mb-2.5">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-semibold text-white">Queue Empty</h4>
            <p className="text-[11px] text-[#9CA3AF] max-w-xs mt-0.5">
              All incoming customer chats are being matched to available agent slots with zero wait time.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {queuedChats.map((chat, idx) => {
              const lastMsg = chat.messages[chat.messages.length - 1];
              return (
                <div
                  key={chat.id}
                  className="p-3 rounded-xl bg-[#171B21] border border-[#262D38] flex items-center justify-between hover:border-[#374151] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#222833] border border-[#2F3746] flex items-center justify-center text-xs font-mono font-bold text-[#FBBF24]">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <User className="w-3 h-3 text-[#9CA3AF]" />
                          {chat.customerId}
                        </span>
                        <span className="text-[10px] font-mono text-[#6B7280]">
                          {chat.id.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9CA3AF] line-clamp-1 mt-0.5 max-w-md">
                        {lastMsg ? lastMsg.text : 'Waiting for available agent slot...'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-[11px] text-[#6B7280]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{chat.queuedAt ? new Date(chat.queuedAt).toLocaleTimeString() : 'Just now'}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#4B5563]" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
