'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { MessageSquare, LogOut } from 'lucide-react';
import { useMe, useMyActiveChats } from '@/lib/desk-store';
import { StatusPills } from './status-pills';
import { api } from '@/lib/api';
import { getActiveSocket, disconnectActiveSocket } from '@/lib/socket';

export function AppHeader() {
  const router = useRouter();
  const me = useMe();
  const active = useMyActiveChats();
  const pathname = usePathname() || '/';
  const isManager = pathname.startsWith('/manager');
  const isCustomer = pathname.startsWith('/customer');

  const avatarUrl = (me as any)?.avatarUrl || '/avatars/avatar-2.png';

  const handleLogout = async () => {
    const socket = getActiveSocket();
    if (socket && !isManager && !isCustomer && me?.id) {
      socket.emit('agent:status_changed', { agentId: me.id, shiftStatus: 'OFFLINE' });
    }
    await api.auth.logout();
    disconnectActiveSocket();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-white shrink-0 shadow-xs">
      <div className="flex h-14 items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 w-full max-w-full min-w-0">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] shrink-0">
            <MessageSquare className="size-4" />
          </span>
          <span className="truncate">
            <span className="block text-sm font-semibold tracking-tight text-[#0F172A] truncate">
              {isCustomer ? 'Customer Support' : isManager ? 'Supervisor Desk' : 'Agent Desk'}
            </span>
          </span>
        </div>

        {!isManager && !isCustomer && (
          <div className="flex items-center justify-center min-w-0">
            <StatusPills />
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
            {!isCustomer && (
              <div className="hidden md:block text-right">
                <p className="text-xs font-medium text-[#0F172A] leading-tight">{me.name}</p>
                <p className="text-[10px] text-[#64748B]">{isManager ? 'Operations' : me.team}</p>
              </div>
            )}
            <div className="hidden sm:block size-8 rounded-full relative overflow-hidden bg-[#EFF6FF] border border-[#BFDBFE] shrink-0">
              <Image
                src={avatarUrl}
                alt={me.name || 'User'}
                fill
                sizes="32px"
                className="object-cover"
              />
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}