'use client';

import React from 'react';
import { Hourglass, Sparkles } from 'lucide-react';

interface QueuedStateProps {
  position: number;
  customerId: string;
}

export function QueuedState({ position, customerId }: QueuedStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#F9FAFB] to-[#F3F4F6]">
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-full bg-[#16A34A]/10 border border-[#16A34A]/20 flex items-center justify-center text-[#16A34A]">
          <Hourglass className="w-7 h-7 animate-pulse" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#16A34A] text-white flex items-center justify-center text-[10px] font-bold shadow-md">
          <Sparkles className="w-3 h-3" />
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16A34A]/10 text-[#15803D] text-xs font-semibold uppercase tracking-wider mb-2 border border-[#16A34A]/20">
        Queue Position #{position > 0 ? position : 1}
      </div>

      <h3 className="text-base font-bold text-[#111827] mb-1">
        Finding an Available Agent
      </h3>

      <p className="text-xs text-[#4B5563] max-w-xs leading-relaxed mb-6">
        You are in the priority queue. The moment an agent slot opens, your conversation will connect automatically.
      </p>

      <div className="w-full max-w-xs p-3 rounded-xl bg-white border border-[#E5E7EB] shadow-xs text-left">
        <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
          <span>Session Identifier</span>
          <span className="font-mono text-[#111827] font-semibold">{customerId}</span>
        </div>
      </div>
    </div>
  );
}
