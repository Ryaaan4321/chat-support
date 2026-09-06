'use client';

import React from 'react';
import { useDesk, useAllAgents, useWaitingQueue, useSlaBreaches, Chat } from '@/lib/desk-store';
import { AgentInfo, ChatSlaBreachPayload } from '@/types/socket.event.types';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Users,
  Clock,
  Zap,
  Layers,
  Plus,
  Minus,
  AlertTriangle,
  X,
  Eye,
  Activity,
  Timer,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  const secs = seconds % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m`;
}

interface PerformanceChat {
  id: string;
  customerId: string;
  status: string;
  queuedAt: string;
  assignedAt: string | null;
  firstResponseAt: string | null;
  firstResponseSeconds: number | null;
  lateReplyCount: number;
  lastCustomerMessageAt: string | null;
  lastAgentReplyAt: string | null;
  slaBreached: boolean;
  messages: Array<{
    id: string;
    senderType: string;
    text: string;
    sentAt: string;
  }>;
}

export function ManagerBoard() {
  const agents = useAllAgents() as AgentInfo[];
  const queuedChats = useWaitingQueue() as Chat[];
  const slaBreaches = useSlaBreaches() as ChatSlaBreachPayload[];
  const updateCapacity = useDesk((s) => s.updateAgentCapacity);
  const initManagerSession = useDesk((s) => s.initManagerSession);
  const dismissSlaBreach = useDesk((s) => s.dismissSlaBreach);
  const isHydrating = useDesk((s) => s.isHydrating);

  const [selectedAgent, setSelectedAgent] = React.useState<AgentInfo | null>(null);
  const [drillFilter, setDrillFilter] = React.useState<'ALL' | 'LATE' | 'SLOW'>('ALL');
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

  const openDrillDown = React.useCallback((agent: AgentInfo, filter: 'ALL' | 'LATE' | 'SLOW' = 'ALL') => {
    setSelectedAgent(agent);
    setDrillFilter(filter);
    setIsDrillLoading(true);
    setExpandedChatId(null);

    api.chats.getAgentPerformanceChats(agent.id)
      .then((res) => {
        setDrillChats(res.chats || []);
      })
      .catch(() => {
        setDrillChats([]);
      })
      .finally(() => {
        setIsDrillLoading(false);
      });
  }, []);

  const activeAgents = agents.filter((a: AgentInfo) => a.shiftStatus === 'AVAILABLE');
  const totalSlots = agents.reduce((acc: number, a: AgentInfo) => acc + a.chatCapacity, 0);
  const occupiedSlots = agents.reduce((acc: number, a: AgentInfo) => acc + a.activeChatCount, 0);
  const totalLateRepliesCount = agents.reduce((acc: number, a: AgentInfo) => acc + (a.totalLateReplies || 0), 0);

  const filteredDrillChats = React.useMemo(() => {
    if (drillFilter === 'LATE') {
      return drillChats.filter((c) => (c.lateReplyCount || 0) > 0 || c.slaBreached);
    }
    if (drillFilter === 'SLOW') {
      return drillChats.filter((c) => (c.firstResponseSeconds || 0) > 60);
    }
    return drillChats;
  }, [drillChats, drillFilter]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full scrollbar-thin">
      <div>
        <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
          Queue Supervision & Concurrency Dashboard
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          PostgreSQL <code className="font-mono text-[#2563EB] font-semibold">SKIP LOCKED</code> transaction engine metrics and real-time agent performance telemetry.
        </p>
      </div>

      {slaBreaches.length > 0 && (
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
              const matchedAgent = breach.agentId ? agents.find((a) => a.id === breach.agentId) : null;
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
                      onClick={() => dismissSlaBreach(breach.chatId)}
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
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl bg-white border border-[#E2E8F0] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Queue Depth
            </span>
            <div className="size-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
              <Clock className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F172A] mt-2 font-mono">
            {queuedChats.length}
          </p>
          <span className="text-[11px] text-[#64748B] mt-1 block">
            {queuedChats.length === 0 ? 'Queue clear' : 'Awaiting slot release'}
          </span>
        </div>

        <div className="rounded-xl bg-white border border-[#E2E8F0] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Active Agents
            </span>
            <div className="size-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
              <Users className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F172A] mt-2 font-mono">
            {activeAgents.length}{' '}
            <span className="text-xs font-normal text-[#64748B]">/ {agents.length}</span>
          </p>
          <span className="text-[11px] text-[#64748B] mt-1 block">
            Available on shift
          </span>
        </div>

        <div className="rounded-xl bg-white border border-[#E2E8F0] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Slot Concurrency
            </span>
            <div className="size-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
              <Layers className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F172A] mt-2 font-mono">
            {occupiedSlots}{' '}
            <span className="text-xs font-normal text-[#64748B]">/ {totalSlots}</span>
          </p>
          <span className="text-[11px] text-[#64748B] mt-1 block">
            Occupied capacity slots
          </span>
        </div>

        <div className="rounded-xl bg-white border border-[#E2E8F0] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Late Replies Today
            </span>
            <div className={cn(
              'size-8 rounded-lg flex items-center justify-center',
              totalLateRepliesCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
            )}>
              <Activity className="size-4" />
            </div>
          </div>
          <p className={cn(
            'text-2xl font-bold mt-2 font-mono',
            totalLateRepliesCount > 0 ? 'text-rose-600' : 'text-emerald-600'
          )}>
            {totalLateRepliesCount}
          </p>
          <span className="text-[11px] text-[#64748B] mt-1 block">
            Responses taking &gt; 120s
          </span>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-[#E2E8F0] p-5 shadow-xs space-y-3.5 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-semibold text-[#0F172A] truncate">Live Agent Performance Leaderboard</h2>
            <span
              className="inline-flex items-center gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0"
              title="Live Socket"
            >
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
              </span>
              <span className="hidden sm:inline whitespace-nowrap">Live Socket</span>
            </span>
          </div>
          <span className="text-xs text-[#64748B] font-mono shrink-0">
            {agents.length} Specialists
          </span>
        </div>

        <div className="overflow-x-auto w-full min-w-0">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase text-[10px] tracking-wider bg-[#F8FAFC]">
                <th className="py-2.5 px-3">Specialist</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-center">Active Chats</th>
                <th className="py-2.5 px-3 text-center">Late Replies (&gt;2m)</th>
                <th className="py-2.5 px-3 text-center">First Response</th>
                <th className="py-2.5 px-3 text-center">Shift Time Today</th>
                <th className="py-2.5 px-3 text-center">Capacity (1–4)</th>
                <th className="py-2.5 px-3 text-right">Load</th>
                <th className="py-2.5 px-3 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {isHydrating ? (
                [1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-3">
                      <div className="h-3.5 w-24 bg-slate-200 rounded mb-1" />
                      <div className="h-2.5 w-32 bg-slate-100 rounded" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-5 w-20 bg-slate-100 rounded" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-4 w-6 bg-slate-100 rounded mx-auto" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-4 w-10 bg-slate-100 rounded mx-auto" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-4 w-10 bg-slate-100 rounded mx-auto" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-4 w-16 bg-slate-100 rounded mx-auto" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-6 w-20 bg-slate-100 rounded mx-auto" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-2 w-16 bg-slate-100 rounded ml-auto" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-6 w-12 bg-slate-100 rounded mx-auto" />
                    </td>
                  </tr>
                ))
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-[#64748B]">
                    No agents currently registered in database.
                  </td>
                </tr>
              ) : (
                agents.map((agent: AgentInfo) => {
                  const percent = Math.round(
                    (agent.activeChatCount / agent.chatCapacity) * 100
                  );

                  let activeSecs = agent.activeShiftSeconds || 0;
                  let breakSecs = agent.totalBreakSeconds || 0;

                  if (agent.shiftStartedAt) {
                    const elapsed = Math.max(0, Math.floor((currentTime - new Date(agent.shiftStartedAt).getTime()) / 1000));
                    if (agent.shiftStatus === 'AVAILABLE' || agent.shiftStatus === 'WRAP_UP') {
                      activeSecs += elapsed;
                    } else if (agent.shiftStatus === 'ON_BREAK') {
                      breakSecs += elapsed;
                    }
                  }

                  const hasLateReplies = (agent.totalLateReplies || 0) > 0;
                  const firstResponseSec = agent.avgFirstResponseSeconds ? Math.round(agent.avgFirstResponseSeconds) : null;
                  const isSlowFirstResponse = Boolean(firstResponseSec && firstResponseSec > 60);

                  return (
                    <tr
                      key={agent.id}
                      className={cn(
                        'hover:bg-[#F8FAFC] transition-colors',
                        hasLateReplies && 'bg-rose-50/20'
                      )}
                    >
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#0F172A]">{agent.name}</div>
                        <div className="text-[11px] text-[#64748B] font-mono">
                          {agent.email}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border',
                            agent.shiftStatus === 'AVAILABLE' &&
                              'bg-emerald-50 text-emerald-700 border-emerald-200',
                            agent.shiftStatus === 'ON_BREAK' &&
                              'bg-amber-50 text-amber-700 border-amber-200',
                            agent.shiftStatus === 'WRAP_UP' &&
                              'bg-blue-50 text-blue-700 border-blue-200',
                            agent.shiftStatus === 'OFFLINE' &&
                              'bg-slate-100 text-slate-600 border-slate-200'
                          )}
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          <span>{agent.shiftStatus}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-semibold text-[#0F172A]">
                        {agent.activeChatCount}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {hasLateReplies ? (
                          <button
                            type="button"
                            onClick={() => openDrillDown(agent, 'LATE')}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer transition-colors"
                            title="Click to view late replies"
                          >
                            <AlertTriangle className="size-3 text-rose-600" />
                            <span>{agent.totalLateReplies}</span>
                          </button>
                        ) : (
                          <span className="font-mono text-slate-400 text-xs">0</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {firstResponseSec !== null ? (
                          <button
                            type="button"
                            onClick={() => openDrillDown(agent, 'SLOW')}
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] border cursor-pointer transition-colors',
                              isSlowFirstResponse
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 font-bold'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            )}
                            title="Click to view first response performance"
                          >
                            <Timer className="size-3" />
                            <span>{firstResponseSec}s</span>
                          </button>
                        ) : (
                          <span className="font-mono text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="space-y-0.5 font-mono text-[11px]">
                          <div className="text-emerald-700 font-medium">
                            {formatDuration(activeSecs)} active
                          </div>
                          {breakSecs > 0 && (
                            <div className="text-amber-600 text-[10px]">
                              {formatDuration(breakSecs)} break
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateCapacity(agent.id, agent.chatCapacity - 1)
                            }
                            disabled={agent.chatCapacity <= 1}
                            className="size-6 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] flex items-center justify-center disabled:opacity-30 cursor-pointer"
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="font-mono text-xs w-4 text-center font-semibold text-[#0F172A]">
                            {agent.chatCapacity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateCapacity(agent.id, agent.chatCapacity + 1)
                            }
                            disabled={agent.chatCapacity >= 4}
                            className="size-6 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] flex items-center justify-center disabled:opacity-30 cursor-pointer"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                percent >= 100
                                  ? 'bg-[#DC2626]'
                                  : percent >= 66
                                  ? 'bg-[#D97706]'
                                  : 'bg-[#2563EB]'
                              )}
                              style={{ width: `${Math.min(100, percent)}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-[#64748B] w-8">
                            {percent}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => openDrillDown(agent, 'ALL')}
                          className="size-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center mx-auto cursor-pointer transition-colors"
                          title="Inspect agent chats"
                        >
                          <Eye className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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

              const waitingMs = chat.queuedAt ? currentTime - new Date(chat.queuedAt).getTime() : 0;
              const waitingSec = Math.max(0, Math.floor(waitingMs / 1000));
              const isBreached = waitingSec > 120;

              return (
                <div
                  key={chat.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border transition-colors',
                    isBreached ? 'bg-rose-50/50 border-rose-300' : 'bg-[#F8FAFC] border-[#E2E8F0]'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={cn(
                      'size-6 rounded-md flex items-center justify-center text-[10px] font-mono font-bold',
                      isBreached ? 'bg-rose-100 text-rose-700' : 'bg-[#EFF6FF] text-[#2563EB]'
                    )}>
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
                    <span className={cn(
                      'px-2 py-0.5 rounded-md text-[10px] font-mono uppercase border',
                      isBreached ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-amber-50 text-amber-700 border-amber-200'
                    )}>
                      {waitingSec}s in queue
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedAgent && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedAgent.name}
                  </h3>
                  <span className={cn(
                    'px-2 py-0.5 rounded text-[11px] font-semibold border',
                    selectedAgent.shiftStatus === 'AVAILABLE' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    selectedAgent.shiftStatus === 'ON_BREAK' && 'bg-amber-50 text-amber-700 border-amber-200',
                    selectedAgent.shiftStatus === 'WRAP_UP' && 'bg-blue-50 text-blue-700 border-blue-200',
                    selectedAgent.shiftStatus === 'OFFLINE' && 'bg-slate-100 text-slate-600 border-slate-200'
                  )}>
                    {selectedAgent.shiftStatus}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedAgent.email} • Capacity: {selectedAgent.activeChatCount}/{selectedAgent.chatCapacity}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="size-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDrillFilter('ALL')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors',
                  drillFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                All Chats ({drillChats.length})
              </button>
              <button
                type="button"
                onClick={() => setDrillFilter('LATE')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5',
                  drillFilter === 'LATE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                )}
              >
                <AlertTriangle className="size-3" />
                Late Replies (
                {drillChats.filter((c) => (c.lateReplyCount || 0) > 0 || c.slaBreached).length}
                )
              </button>
              <button
                type="button"
                onClick={() => setDrillFilter('SLOW')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5',
                  drillFilter === 'SLOW'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                )}
              >
                <Timer className="size-3" />
                Slow First Response (
                {drillChats.filter((c) => (c.firstResponseSeconds || 0) > 60).length}
                )
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {isDrillLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredDrillChats.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No conversations matching the selected filter.
                </div>
              ) : (
                filteredDrillChats.map((chat) => {
                  const isExpanded = expandedChatId === chat.id;
                  const hasLate = (chat.lateReplyCount || 0) > 0 || chat.slaBreached;
                  const isSlow = (chat.firstResponseSeconds || 0) > 60;

                  return (
                    <div
                      key={chat.id}
                      className={cn(
                        'border rounded-xl p-4 bg-white shadow-xs transition-all',
                        hasLate ? 'border-rose-200 bg-rose-50/10' : 'border-slate-200'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">
                              {chat.customerId}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              #{chat.id.slice(0, 8)}
                            </span>
                            <span className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-semibold border',
                              chat.status === 'ACTIVE' && 'bg-blue-50 text-blue-700 border-blue-200',
                              chat.status === 'CLOSED' && 'bg-slate-100 text-slate-600 border-slate-200',
                              chat.status === 'WAITING' && 'bg-amber-50 text-amber-700 border-amber-200'
                            )}>
                              {chat.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <Timer className="size-3 text-slate-400" />
                              First Response:{' '}
                              <strong className={isSlow ? 'text-amber-600' : 'text-slate-800'}>
                                {chat.firstResponseSeconds ? `${chat.firstResponseSeconds}s` : 'Pending'}
                              </strong>
                            </span>

                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <AlertTriangle className={cn('size-3', hasLate ? 'text-rose-500' : 'text-slate-400')} />
                              Late Replies:{' '}
                              <strong className={hasLate ? 'text-rose-600' : 'text-slate-800'}>
                                {chat.lateReplyCount || 0}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedChatId(isExpanded ? null : chat.id)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
                        >
                          <span>{isExpanded ? 'Hide' : 'Inspect Timeline'}</span>
                          {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            Message Timeline ({chat.messages.length} messages)
                          </div>

                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {chat.messages.map((msg, mIdx) => {
                              const isAgent = msg.senderType === 'AGENT';
                              let isLateResponse = false;
                              if (isAgent && mIdx > 0) {
                                const prevMsg = chat.messages[mIdx - 1];
                                if (prevMsg && prevMsg.senderType === 'CUSTOMER') {
                                  const gap = Math.floor(
                                    (new Date(msg.sentAt).getTime() - new Date(prevMsg.sentAt).getTime()) / 1000
                                  );
                                  if (gap > 120) {
                                    isLateResponse = true;
                                  }
                                }
                              }

                              return (
                                <div
                                  key={msg.id || mIdx}
                                  className={cn(
                                    'p-2.5 rounded-lg text-xs border',
                                    isAgent
                                      ? 'bg-blue-50/60 border-blue-100 text-blue-900 ml-4'
                                      : 'bg-slate-50 border-slate-200 text-slate-800 mr-4',
                                    isLateResponse && 'border-rose-300 bg-rose-50/60 text-rose-950'
                                  )}
                                >
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                    <span className="font-semibold">
                                      {isAgent ? 'Agent' : 'Customer'}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      {isLateResponse && (
                                        <span className="text-rose-600 font-bold font-mono">
                                          Late Response (&gt;120s)
                                        </span>
                                      )}
                                      <span className="font-mono">
                                        {new Date(msg.sentAt).toLocaleTimeString()}
                                      </span>
                                    </div>
                                  </div>
                                  <div>{msg.text}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
