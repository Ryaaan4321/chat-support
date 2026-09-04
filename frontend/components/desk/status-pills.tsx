'use client';

import React from 'react';
import { useDesk } from '@/lib/desk-store';
import { ShiftStatus } from '@/types/socket.event.types';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

const STATUS_CONFIG: {
  key: ShiftStatus;
  label: string;
  shortLabel: string;
  dotColor: string;
  activeBg: string;
  activeBorder: string;
}[] = [
  {
    key: 'AVAILABLE',
    label: 'Available',
    shortLabel: 'Available',
    dotColor: 'bg-[#16A34A]',
    activeBg: 'bg-emerald-50 text-emerald-700',
    activeBorder: 'border-emerald-300',
  },
  {
    key: 'ON_BREAK',
    label: 'Break',
    shortLabel: 'Break',
    dotColor: 'bg-[#D97706]',
    activeBg: 'bg-amber-50 text-amber-700',
    activeBorder: 'border-amber-300',
  },
  {
    key: 'WRAP_UP',
    label: 'Wrap Up',
    shortLabel: 'Wrap',
    dotColor: 'bg-[#2563EB]',
    activeBg: 'bg-blue-50 text-blue-700',
    activeBorder: 'border-blue-300',
  },
  {
    key: 'OFFLINE',
    label: 'Offline',
    shortLabel: 'Offline',
    dotColor: 'bg-[#94A3B8]',
    activeBg: 'bg-slate-100 text-slate-700',
    activeBorder: 'border-slate-300',
  },
];

export function StatusPills({ compact = false }: { compact?: boolean }) {
  const currentStatus = useDesk((s) => s.me?.shiftStatus || 'AVAILABLE');
  const setStatus = useDesk((s) => s.setMeStatus || s.setStatus);
  const currentConfig = STATUS_CONFIG.find((s) => s.key === currentStatus) || STATUS_CONFIG[0];

  return (
    <>
      <div className={cn('sm:hidden relative inline-flex items-center shrink-0')}>
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-2xs',
            currentConfig.activeBg,
            currentConfig.activeBorder
          )}
        >
          <span className={cn('size-2 rounded-full shrink-0', currentConfig.dotColor)} />
          <span className="whitespace-nowrap">{currentConfig.shortLabel}</span>
          <ChevronDown className="size-3 opacity-60 ml-0.5 shrink-0" />
        </div>
        <select
          value={currentStatus}
          onChange={(e) => setStatus(e.target.value as ShiftStatus)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs"
        >
          {STATUS_CONFIG.map((status) => (
            <option key={status.key} value={status.key}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <div
        className={cn(
          'hidden sm:inline-flex items-center rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] p-1 gap-1 shrink-0',
          compact && 'scale-95 origin-center'
        )}
      >
        {STATUS_CONFIG.map((status) => {
          const isActive = currentStatus === status.key;
          return (
            <button
              key={status.key}
              type="button"
              onClick={() => setStatus(status.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0',
                isActive
                  ? `${status.activeBg} border ${status.activeBorder} font-semibold shadow-xs`
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white border border-transparent'
              )}
            >
              <span
                className={cn(
                  'size-2 rounded-full shrink-0',
                  status.dotColor,
                  isActive && 'ring-2 ring-white'
                )}
              />
              <span className="hidden md:inline">{status.label}</span>
              <span className="md:hidden">{status.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
