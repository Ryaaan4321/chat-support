'use client';

import React from 'react';
import { Users, Clock, Layers, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricsCardsProps {
  queuedCount: number;
  activeAgentsCount: number;
  totalAgentsCount: number;
  occupiedSlots: number;
  totalSlots: number;
  totalLateRepliesCount: number;
}

export function MetricsCards({
  queuedCount,
  activeAgentsCount,
  totalAgentsCount,
  occupiedSlots,
  totalSlots,
  totalLateRepliesCount,
}: MetricsCardsProps) {
  return (
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
          {queuedCount}
        </p>
        <span className="text-[11px] text-[#64748B] mt-1 block">
          {queuedCount === 0 ? 'Queue clear' : 'Awaiting slot release'}
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
          {activeAgentsCount}{' '}
          <span className="text-xs font-normal text-[#64748B]">/ {totalAgentsCount}</span>
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
          <div
            className={cn(
              'size-8 rounded-lg flex items-center justify-center',
              totalLateRepliesCount > 0
                ? 'bg-rose-50 text-rose-600'
                : 'bg-emerald-50 text-emerald-600'
            )}
          >
            <Activity className="size-4" />
          </div>
        </div>
        <p
          className={cn(
            'text-2xl font-bold mt-2 font-mono',
            totalLateRepliesCount > 0 ? 'text-rose-600' : 'text-emerald-600'
          )}
        >
          {totalLateRepliesCount}
        </p>
        <span className="text-[11px] text-[#64748B] mt-1 block">
          Responses taking &gt; 120s
        </span>
      </div>
    </div>
  );
}
