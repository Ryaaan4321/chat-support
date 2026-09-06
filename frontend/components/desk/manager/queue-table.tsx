'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Chat } from '@/lib/desk-store';
import { cn } from '@/lib/utils';

interface QueueTableProps {
  queuedChats: Chat[];
  currentTime: number;
}

export function QueueTable({ queuedChats, currentTime }: QueueTableProps) {
  return (
    <div className="rounded-xl bg-white border border-[#E2E8F0] p-5 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#0F172A]">FIFO Waiting Queue</h2>
        <span className="text-xs text-[#64748B] font-mono">
          {queuedChats.length} In Queue
        </span>
      </div>

      {queuedChats.length === 0 ? (
        <p className="text-xs text-[#64748B] py-4 text-center">
          No chats currently waiting in queue.
        </p>
      ) : (
        <div className="space-y-2">
          {queuedChats.map((chat: Chat, idx: number) => {
            const customerName =
              chat.customerId ||
              (typeof chat.customer === 'object' ? chat.customer?.name : chat.customer) ||
              chat.id;

            const waitingMs = chat.queuedAt
              ? currentTime - new Date(chat.queuedAt).getTime()
              : 0;
            const waitingSec = Math.max(0, Math.floor(waitingMs / 1000));
            const isBreached = waitingSec > 120;

            return (
              <div
                key={chat.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-colors',
                  isBreached
                    ? 'bg-rose-50/50 border-rose-300'
                    : 'bg-[#F8FAFC] border-[#E2E8F0]'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'size-6 rounded-md flex items-center justify-center text-[10px] font-mono font-bold',
                      isBreached
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-[#EFF6FF] text-[#2563EB]'
                    )}
                  >
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#0F172A]">
                        {customerName}
                      </span>
                      {isBreached && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.2 rounded">
                          <AlertTriangle className="size-2.5" /> SLA Breach ({waitingSec}s)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#64748B] font-mono">
                      {chat.messages[0]?.text || 'Waiting for specialist...'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-md text-[10px] font-mono uppercase border',
                      isBreached
                        ? 'bg-rose-100 text-rose-700 border-rose-300'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    )}
                  >
                    {waitingSec}s in queue
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
