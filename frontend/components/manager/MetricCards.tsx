'use client';

import React from 'react';
import { Users, Hourglass, MessageSquare, Zap } from 'lucide-react';
import { AgentInfo, ChatItem } from '../../types/socket.event.types';

interface MetricCardsProps {
  agents: AgentInfo[];
  queuedChats: ChatItem[];
  activeChatsCount: number;
}

export function MetricCards({ agents, queuedChats, activeChatsCount }: MetricCardsProps) {
  const onlineAgents = agents.filter((a) => a.shiftStatus === 'AVAILABLE');
  const totalCapacity = agents.reduce((acc, a) => acc + (a.shiftStatus === 'AVAILABLE' ? a.chatCapacity : 0), 0);
  const loadPercentage = totalCapacity > 0 ? Math.min(100, Math.round((activeChatsCount / totalCapacity) * 100)) : 0;

  const metrics = [
    {
      label: 'Agents Online',
      value: `${onlineAgents.length} / ${agents.length}`,
      subtext: `${totalCapacity} concurrent capacity slots`,
      icon: Users,
      color: 'text-[#22C55E]',
      bg: 'bg-[#16A34A]/10 border-[#16A34A]/20',
    },
    {
      label: 'Queue Depth',
      value: queuedChats.length.toString(),
      subtext: queuedChats.length > 0 ? 'Oldest waiting ~2m' : 'Queue clear',
      icon: Hourglass,
      color: queuedChats.length > 0 ? 'text-[#FBBF24]' : 'text-[#9CA3AF]',
      bg: queuedChats.length > 0 ? 'bg-[#F59E0B]/10 border-[#F59E0B]/20' : 'bg-[#1C2026] border-[#2B313C]',
    },
    {
      label: 'Active Conversations',
      value: activeChatsCount.toString(),
      subtext: 'Real-time locked sessions',
      icon: MessageSquare,
      color: 'text-[#38BDF8]',
      bg: 'bg-[#0284C7]/10 border-[#0284C7]/20',
    },
    {
      label: 'Queue System Load',
      value: `${loadPercentage}%`,
      subtext: `${activeChatsCount} of ${totalCapacity} available slots filled`,
      icon: Zap,
      color: loadPercentage > 85 ? 'text-[#EF4444]' : 'text-[#22C55E]',
      bg: loadPercentage > 85 ? 'bg-[#DC2626]/10 border-[#DC2626]/20' : 'bg-[#16A34A]/10 border-[#16A34A]/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m, idx) => {
        const Icon = m.icon;
        return (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-[#14171C] border border-[#22262B] flex items-center justify-between shadow-sm"
          >
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                {m.label}
              </span>
              <div className="text-2xl font-bold font-mono tracking-tight text-white mt-1">
                {m.value}
              </div>
              <span className="text-[11px] text-[#6B7280] block mt-0.5 font-medium">
                {m.subtext}
              </span>
            </div>

            <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${m.bg} ${m.color}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
