'use client';

import React from 'react';
import { useDesk, useAllAgents, useWaitingQueue, useSlaBreaches, Chat } from '@/lib/desk-store';
import { AgentInfo, ChatSlaBreachPayload } from '@/types/socket.event.types';
import { api } from '@/lib/api';
import { PerformanceChat, DrillFilterType } from './manager/types';
import { SlaBreachAlert } from './manager/sla-breach-alert';
import { MetricsCards } from './manager/metrics-cards';
import { AgentPerformanceTable } from './manager/agent-performance-table';
import { QueueTable } from './manager/queue-table';
import { DrillDownModal } from './manager/drill-down-modal';

export function ManagerBoard() {
  const agents = useAllAgents() as AgentInfo[];
  const queuedChats = useWaitingQueue() as Chat[];
  const slaBreaches = useSlaBreaches() as ChatSlaBreachPayload[];
  const updateCapacity = useDesk((s) => s.updateAgentCapacity);
  const initManagerSession = useDesk((s) => s.initManagerSession);
  const dismissSlaBreach = useDesk((s) => s.dismissSlaBreach);
  const isHydrating = useDesk((s) => s.isHydrating);

  const [selectedAgent, setSelectedAgent] = React.useState<AgentInfo | null>(null);
  const [drillFilter, setDrillFilter] = React.useState<DrillFilterType>('ALL');
  const [drillChats, setDrillChats] = React.useState<PerformanceChat[]>([]);
  const [isDrillLoading, setIsDrillLoading] = React.useState(false);
  const [expandedChatId, setExpandedChatId] = React.useState<string | null>(null);
  const [currentTime, setCurrentTime] = React.useState<number>(Date.now());

  React.useEffect(() => {
    initManagerSession();
  }, [initManagerSession]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const openDrillDown = React.useCallback(
    (agent: AgentInfo, filter: DrillFilterType = 'ALL') => {
      setSelectedAgent(agent);
      setDrillFilter(filter);
      setIsDrillLoading(true);
      setExpandedChatId(null);

      api.chats
        .getAgentPerformanceChats(agent.id)
        .then((res) => {
          setDrillChats(res.chats || []);
        })
        .catch(() => {
          setDrillChats([]);
        })
        .finally(() => {
          setIsDrillLoading(false);
        });
    },
    []
  );

  const activeAgents = agents.filter((a: AgentInfo) => a.shiftStatus === 'AVAILABLE');
  const totalSlots = agents.reduce((acc: number, a: AgentInfo) => acc + a.chatCapacity, 0);
  const occupiedSlots = agents.reduce((acc: number, a: AgentInfo) => acc + a.activeChatCount, 0);
  const totalLateRepliesCount = agents.reduce(
    (acc: number, a: AgentInfo) => acc + (a.totalLateReplies || 0),
    0
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full scrollbar-thin">
      <div>
        <h1 className="text-xs text-[#64748B] mt-1 tracking-tight font-mono text-[#2563EB] font-semibold">
          Queue Supervision & Concurrency Dashboard
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          Transaction engine metrics and real-time agent performance telemetry.
        </p>
      </div>

      <SlaBreachAlert
        slaBreaches={slaBreaches}
        agents={agents}
        onDismiss={dismissSlaBreach}
      />

      <MetricsCards
        queuedCount={queuedChats.length}
        activeAgentsCount={activeAgents.length}
        totalAgentsCount={agents.length}
        occupiedSlots={occupiedSlots}
        totalSlots={totalSlots}
        totalLateRepliesCount={totalLateRepliesCount}
      />

      <AgentPerformanceTable
        agents={agents}
        isHydrating={isHydrating}
        currentTime={currentTime}
        onUpdateCapacity={updateCapacity}
        onOpenDrillDown={openDrillDown}
      />

      <QueueTable queuedChats={queuedChats} currentTime={currentTime} />

      <DrillDownModal
        selectedAgent={selectedAgent}
        drillFilter={drillFilter}
        onSetFilter={setDrillFilter}
        drillChats={drillChats}
        isLoading={isDrillLoading}
        expandedChatId={expandedChatId}
        onToggleExpandChat={(chatId) =>
          setExpandedChatId(expandedChatId === chatId ? null : chatId)
        }
        onClose={() => setSelectedAgent(null)}
      />
    </div>
  );
}
