'use client';

import React from 'react';
import clsx from 'clsx';
import { Minus, Plus, Shield, Clock } from 'lucide-react';
import { AgentInfo } from '../../types/socket.event.types';
import { StatusDot } from '../ui/StatusDot';
import { CapacityPips } from '../ui/CapacityPips';

interface AgentTableProps {
  agents: AgentInfo[];
  onUpdateCapacity: (agentId: string, newCapacity: number) => void;
}

export function AgentTable({ agents, onUpdateCapacity }: AgentTableProps) {
  return (
    <div className="rounded-2xl bg-[#14171C] border border-[#22262B] overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-[#22262B] flex items-center justify-between bg-[#171B21]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1F252E] border border-[#2A3340] flex items-center justify-center text-[#22C55E]">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Agent Live Ops & Capacity Control</h3>
            <p className="text-[11px] text-[#6B7280]">Real-time shift statuses and concurrency bounds</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#22262B] bg-[#121519]/70 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
              <th className="py-3 px-5">Agent</th>
              <th className="py-3 px-5">Shift Status</th>
              <th className="py-3 px-5">Active Workload</th>
              <th className="py-3 px-5">Capacity (1–4)</th>
              <th className="py-3 px-5 text-right">Heartbeat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1D222A] text-xs">
            {agents.map((agent) => {
              return (
                <tr key={agent.id} className="hover:bg-[#181C22] transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">{agent.name}</span>
                      <span className="text-[11px] font-mono text-[#6B7280]">{agent.email}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-5">
                    <StatusDot status={agent.shiftStatus} showLabel size="md" />
                  </td>

                  <td className="py-3.5 px-5">
                    <CapacityPips
                      activeCount={agent.activeChatCount}
                      capacity={agent.chatCapacity}
                    />
                  </td>

                  <td className="py-3.5 px-5">
                    <div className="inline-flex items-center gap-2 bg-[#1C2026] border border-[#2B323D] rounded-lg p-1">
                      <button
                        type="button"
                        onClick={() => onUpdateCapacity(agent.id, Math.max(1, agent.chatCapacity - 1))}
                        disabled={agent.chatCapacity <= 1}
                        className="w-6 h-6 rounded bg-[#252C36] hover:bg-[#323B49] disabled:opacity-30 disabled:hover:bg-[#252C36] text-white flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
                        title="Decrease capacity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <span className="w-5 text-center font-mono font-bold text-white text-xs">
                        {agent.chatCapacity}
                      </span>

                      <button
                        type="button"
                        onClick={() => onUpdateCapacity(agent.id, Math.min(4, agent.chatCapacity + 1))}
                        disabled={agent.chatCapacity >= 4}
                        className="w-6 h-6 rounded bg-[#252C36] hover:bg-[#323B49] disabled:opacity-30 disabled:hover:bg-[#252C36] text-white flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
                        title="Increase capacity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  <td className="py-3.5 px-5 text-right font-mono text-[11px] text-[#6B7280]">
                    <div className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {agent.lastSeenAt
                        ? new Date(agent.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : 'Never'}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
