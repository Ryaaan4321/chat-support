'use client';

import React from 'react';
import clsx from 'clsx';

export type StatusType = 'AVAILABLE' | 'ON_BREAK' | 'WRAP_UP' | 'OFFLINE' | 'SHIFT_ENDED' | 'CONNECTED' | 'DISCONNECTED' | 'WAITING' | 'ACTIVE';

interface StatusDotProps {
  status: StatusType;
  showLabel?: boolean;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusDot({
  status,
  showLabel = false,
  pulse = true,
  size = 'md',
  className,
}: StatusDotProps) {
  const getStatusColor = (st: StatusType) => {
    switch (st) {
      case 'AVAILABLE':
      case 'CONNECTED':
      case 'ACTIVE':
        return {
          dot: 'bg-[#16A34A] ring-[#16A34A]/30',
          pulse: 'bg-[#22C55E]',
          text: 'text-[#22C55E]',
          label: 'Available',
        };
      case 'ON_BREAK':
        return {
          dot: 'bg-[#F59E0B] ring-[#F59E0B]/30',
          pulse: 'bg-[#FBBF24]',
          text: 'text-[#FBBF24]',
          label: 'On Break',
        };
      case 'WRAP_UP':
        return {
          dot: 'bg-[#8B5CF6] ring-[#8B5CF6]/30',
          pulse: 'bg-[#A78BFA]',
          text: 'text-[#A78BFA]',
          label: 'Wrap-Up',
        };
      case 'WAITING':
        return {
          dot: 'bg-[#3B82F6] ring-[#3B82F6]/30',
          pulse: 'bg-[#60A5FA]',
          text: 'text-[#60A5FA]',
          label: 'In Queue',
        };
      case 'OFFLINE':
      case 'SHIFT_ENDED':
      case 'DISCONNECTED':
      default:
        return {
          dot: 'bg-[#6B7280] ring-[#6B7280]/20',
          pulse: '',
          text: 'text-[#9CA3AF]',
          label: 'Offline',
        };
    }
  };

  const config = getStatusColor(status);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  const shouldPulse = pulse && (status === 'AVAILABLE' || status === 'ON_BREAK' || status === 'WRAP_UP' || status === 'WAITING' || status === 'CONNECTED');

  return (
    <div className={clsx('inline-flex items-center gap-2', className)}>
      <span className="relative flex items-center justify-center">
        {shouldPulse && (
          <span
            className={clsx(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              config.pulse
            )}
          />
        )}
        <span
          className={clsx(
            'relative inline-flex rounded-full ring-2 ring-offset-1 ring-offset-[#0C0E11]',
            config.dot,
            sizeClasses[size]
          )}
        />
      </span>
      {showLabel && (
        <span className={clsx('text-xs font-medium tracking-wide uppercase', config.text)}>
          {config.label}
        </span>
      )}
    </div>
  );
}
