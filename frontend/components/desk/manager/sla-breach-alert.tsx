'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { AgentInfo, ChatSlaBreachPayload } from '@/types/socket.event.types';

interface SlaBreachAlertProps {
  slaBreaches: ChatSlaBreachPayload[];
  agents: AgentInfo[];
  onDismiss: (chatId: string) => void;
}

export function SlaBreachAlert({
  slaBreaches,
  agents,
  onDismiss,
}: SlaBreachAlertProps) {
  if (slaBreaches.length === 0) return null;

  return (
    <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-rose-800 font-semibold text-sm">
          <AlertTriangle className="size-5 text-rose-600 animate-pulse" />
          <span>
            Active SLA Breach Alert: {slaBreaches.length} customer{slaBreaches.length > 1 ? 's' : ''} waiting without reply &gt; 2 minutes
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {slaBreaches.map((breach) => {
          const matchedAgent = breach.agentId
            ? agents.find((a) => a.id === breach.agentId)
            : null;

          return (
            <div
              key={breach.chatId}
              className="flex items-center justify-between bg-white border border-rose-200 rounded-lg px-3 py-2 text-xs shadow-xs"
            >
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-800">
                  {breach.customerId}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {matchedAgent ? `Assigned: ${matchedAgent.name}` : 'Awaiting assignment'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                  {breach.waitingSeconds}s wait
                </span>
                <button
                  type="button"
                  onClick={() => onDismiss(breach.chatId)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 cursor-pointer"
                  title="Dismiss alert"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
