'use client';

import React from 'react';
import { Minus, Plus, AlertTriangle, Eye, Timer } from 'lucide-react';
import { AgentInfo } from '@/types/socket.event.types';
import { cn } from '@/lib/utils';
import { DrillFilterType, formatDuration } from './types';

interface AgentPerformanceTableProps {
  agents: AgentInfo[];
  isHydrating: boolean;
  currentTime: number;
  onUpdateCapacity: (agentId: string, capacity: number) => void;
  onOpenDrillDown: (agent: AgentInfo, filter: DrillFilterType) => void;
}

export function AgentPerformanceTable({
  agents,
  isHydrating,
  currentTime,
  onUpdateCapacity,
  onOpenDrillDown,
}: AgentPerformanceTableProps) {
  return (
    <div className="rounded-xl bg-white border border-[#E2E8F0] p-5 shadow-xs space-y-3.5 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-semibold text-[#0F172A] truncate">
            Live Agent Performance Leaderboard
          </h2>
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
                  const elapsed = Math.max(
                    0,
                    Math.floor((currentTime - new Date(agent.shiftStartedAt).getTime()) / 1000)
                  );
                  if (
                    agent.shiftStatus === 'AVAILABLE' ||
                    agent.shiftStatus === 'WRAP_UP'
                  ) {
                    activeSecs += elapsed;
                  } else if (agent.shiftStatus === 'ON_BREAK') {
                    breakSecs += elapsed;
                  }
                }

                const hasLateReplies = (agent.totalLateReplies || 0) > 0;
                const firstResponseSec = agent.avgFirstResponseSeconds
                  ? Math.round(agent.avgFirstResponseSeconds)
                  : null;
                const isSlowFirstResponse = Boolean(
                  firstResponseSec && firstResponseSec > 60
                );

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
                          onClick={() => onOpenDrillDown(agent, 'LATE')}
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
                          onClick={() => onOpenDrillDown(agent, 'SLOW')}
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
                            onUpdateCapacity(agent.id, agent.chatCapacity - 1)
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
                            onUpdateCapacity(agent.id, agent.chatCapacity + 1)
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
                        onClick={() => onOpenDrillDown(agent, 'ALL')}
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
  );
}
