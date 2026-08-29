'use client';

import React from 'react';
import clsx from 'clsx';
import { StatusDot } from '../ui/StatusDot';

export type ShiftStatus = 'AVAILABLE' | 'ON_BREAK' | 'WRAP_UP' | 'OFFLINE';

interface StatusSegmentedControlProps {
  currentStatus: ShiftStatus;
  onChange: (status: ShiftStatus) => void;
  disabled?: boolean;
}

export function StatusSegmentedControl({
  currentStatus,
  onChange,
  disabled = false,
}: StatusSegmentedControlProps) {
  const options: Array<{ status: ShiftStatus; label: string; bgActiveClass: string }> = [
    { status: 'AVAILABLE', label: 'Available', bgActiveClass: 'bg-[#16A34A]/20 text-[#22C55E] border-[#16A34A]/40' },
    { status: 'ON_BREAK', label: 'Break', bgActiveClass: 'bg-[#F59E0B]/20 text-[#FBBF24] border-[#F59E0B]/40' },
    { status: 'WRAP_UP', label: 'Wrap-Up', bgActiveClass: 'bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6]/40' },
    { status: 'OFFLINE', label: 'Offline', bgActiveClass: 'bg-[#374151]/40 text-[#9CA3AF] border-[#4B5563]/40' },
  ];

  return (
    <div className="inline-flex items-center p-1 rounded-lg bg-[#14171C] border border-[#22262B] shadow-inner gap-1">
      {options.map((opt) => {
        const isSelected = currentStatus === opt.status;
        return (
          <button
            key={opt.status}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.status)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
              disabled && 'opacity-50 cursor-not-allowed',
              isSelected
                ? clsx('shadow-sm border', opt.bgActiveClass)
                : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1C2026] border border-transparent'
            )}
          >
            <StatusDot status={opt.status} size="sm" pulse={isSelected} />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
