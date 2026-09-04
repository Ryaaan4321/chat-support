'use client';

import React from 'react';
import { useDesk, useAllAgents, useWaitingQueue, Chat } from '@/lib/desk-store';
import { AgentInfo } from '@/types/socket.event.types';
import { cn } from '@/lib/utils';
import {
  Users,
  Clock,
  Zap,
  Layers,
  Plus,
  Minus,
} from 'lucide-react';

export function ManagerBoard() {
  const agents = useAllAgents() as AgentInfo[];
  const queuedChats = useWaitingQueue() as Chat[];
  const updateCapacity = useDesk((s) => s.updateAgentCapacity);

  const activeAgents = agents.filter((a: AgentInfo) => a.shiftStatus === 'AVAILABLE');
  const totalSlots = agents.reduce((acc: number, a: AgentInfo) => acc + a.chatCapacity, 0);
  const occupiedSlots = agents.reduce((acc: number, a: AgentInfo) => acc + a.activeChatCount, 0);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full scrollbar-thin">
      <div>
        <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
          Queue Supervision & Concurrency Dashboard
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          PostgreSQL <code className="font-mono text-[#2563EB] font-semibold">SKIP LOCKED</code> transaction engine metrics and real-time agent capacity controls.
        </p>
      </div>

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
              SLA Target
            </span>
            <div className="size-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Zap className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2 font-mono">&lt; 10s</p>
          <span className="text-[11px] text-[#64748B] mt-1 block">
            Instant matching target
          </span>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-[#E2E8F0] p-5 shadow-xs space-y-3.5 overflow-hidden">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#0F172A]">Agent Operations Roster</h2>
          <span className="text-xs text-[#64748B] font-mono">
            {agents.length} Specialists
          </span>
        </div>

        <div className="overflow-x-auto w-full min-w-0">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase text-[10px] tracking-wider bg-[#F8FAFC]">
                <th className="py-2.5 px-3">Agent</th>
                <th className="py-2.5 px-3">Shift Status</th>
                <th className="py-2.5 px-3">Active Chats</th>
                <th className="py-2.5 px-3 text-center">Chat Capacity (1–4)</th>
                <th className="py-2.5 px-3 text-right">Load Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {agents.map((agent: AgentInfo) => {
                const percent = Math.round(
                  (agent.activeChatCount / agent.chatCapacity) * 100
                );
                return (
                  <tr key={agent.id} className="hover:bg-[#F8FAFC] transition-colors">
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

                    <td className="py-3 px-3 font-mono font-semibold text-[#0F172A]">
                      {agent.activeChatCount}
                    </td>

                    <td className="py-3 px-3">
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
                        <div className="w-20 h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
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
                  </tr>
                );
              })}
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

              return (
                <div
                  key={chat.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="size-6 rounded-md bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-[10px] font-mono font-bold">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="text-xs font-semibold text-[#0F172A]">
                        {customerName}
                      </span>
                      <p className="text-[11px] text-[#64748B] font-mono">
                        {chat.messages[0]?.text || 'Waiting for specialist...'}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono uppercase">
                    Queued
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
