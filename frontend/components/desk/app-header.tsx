'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { useMe, useMyActiveChats } from '@/lib/desk-store';
import { StatusPills } from './status-pills';

export function AppHeader() {
  const me = useMe();
  const active = useMyActiveChats();
  const pathname = usePathname() || '/';
  const isManager = pathname.startsWith('/manager');
  const isCustomer = pathname.startsWith('/customer');

  return (
    <header className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-white shrink-0 shadow-xs">
      <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-4 md:px-6 w-full max-w-full">
        <Link href="/" className="flex items-center gap-2.5 min-w-0 shrink-0">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
            <MessageSquare className="size-4" />
          </span>
          <span className="truncate">
            <span className="block text-sm font-semibold tracking-tight text-[#0F172A]">
              SwishQ Desk
            </span>
          </span>
        </Link>

        {!isManager && !isCustomer && (
          <div className="flex items-center justify-center min-w-0">
            <StatusPills />
          </div>
        )}

        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {!isManager && !isCustomer && (
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-[#64748B] uppercase font-mono">Capacity</p>
              <p className="text-xs font-mono font-semibold text-[#0F172A]">
                {active.length}
                <span className="text-[#94A3B8]"> / {me.chatCapacity}</span>
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="hidden md:block text-right">
              <p className="text-xs font-medium text-[#0F172A] leading-tight">{me.name}</p>
              <p className="text-[10px] text-[#64748B]">{me.team}</p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-xs font-bold text-[#2563EB]">
              {me.initials}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}