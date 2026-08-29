'use client';

import React from 'react';
import clsx from 'clsx';

interface CapacityPipsProps {
  activeCount: number;
  capacity: number;
  maxSlots?: number;
  className?: string;
  size?: 'sm' | 'md';
}

export function CapacityPips({
  activeCount,
  capacity,
  maxSlots = 4,
  className,
  size = 'md',
}: CapacityPipsProps) {
  const pipSizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  };

  return (
    <div className={clsx('flex items-center gap-1.5', className)} title={`${activeCount} of ${capacity} active slots`}>
      {Array.from({ length: maxSlots }).map((_, index) => {
        const isEligibleSlot = index < capacity;
        const isFilled = index < activeCount;

        return (
          <span
            key={index}
            className={clsx(
              'rounded-full transition-all duration-200',
              pipSizes[size],
              !isEligibleSlot && 'bg-[#22262B] border border-dashed border-[#343B45]',
              isEligibleSlot && !isFilled && 'bg-[#1C2026] border border-[#3B4350]',
              isEligibleSlot && isFilled && 'bg-[#16A34A] shadow-[0_0_8px_rgba(22,163,74,0.5)] ring-1 ring-[#22C55E]'
            )}
          />
        );
      })}
      <span className="ml-1 text-xs font-mono text-[#9CA3AF]">
        {activeCount}/{capacity}
      </span>
    </div>
  );
}
