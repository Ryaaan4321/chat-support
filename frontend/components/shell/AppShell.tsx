'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Headphones, ShieldAlert, MessageSquare, Radio, Layers } from 'lucide-react';
import { StatusDot } from '../ui/StatusDot';

interface AppShellProps {
  children: React.ReactNode;
  isConnected?: boolean;
  activeRole?: 'AGENT' | 'MANAGER' | 'CUSTOMER';
  activeIdentityLabel?: string;
  headerAction?: React.ReactNode;
}

export function AppShell({
  children,
  isConnected = false,
  activeRole = 'AGENT',
  activeIdentityLabel,
  headerAction,
}: AppShellProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/agent',
      label: 'Agent Workspace',
      icon: Headphones,
      badge: 'Ops',
    },
    {
      href: '/manager',
      label: 'Manager Dashboard',
      icon: ShieldAlert,
      badge: 'Admin',
    },
    {
      href: '/customer',
      label: 'Customer Widget',
      icon: MessageSquare,
      badge: 'Client',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0C0E11] text-[#F3F4F6] font-sans flex flex-col selection:bg-[#16A34A]/30 selection:text-[#22C55E]">
      <header className="sticky top-0 z-40 bg-[#121519]/90 backdrop-blur-md border-b border-[#22262B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0F9D58] to-[#16A34A] flex items-center justify-center shadow-[0_0_12px_rgba(15,157,88,0.4)] ring-1 ring-[#22C55E]/40 group-hover:scale-105 transition-transform">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                  SwishQ <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#16A34A]/10 text-[#22C55E] border border-[#16A34A]/20">Realtime</span>
                </span>
                <span className="text-[11px] text-[#6B7280] block -mt-0.5 font-medium">BPO Concurrency Engine</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 bg-[#181C22] p-1 rounded-lg border border-[#272D36]">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                      isActive
                        ? 'bg-[#222730] text-white shadow-sm border border-[#333A46]'
                        : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1E232B]'
                    )}
                  >
                    <Icon className={clsx('w-3.5 h-3.5', isActive ? 'text-[#22C55E]' : 'text-[#6B7280]')} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {headerAction}

            {activeIdentityLabel && (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#181C22] border border-[#272D36] text-xs font-mono text-[#D1D5DB]">
                <span className="text-[#9CA3AF]">{activeRole}:</span>
                <span className="text-white font-medium">{activeIdentityLabel}</span>
              </div>
            )}

            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#181C22] border border-[#272D36] text-xs">
              <StatusDot status={isConnected ? 'CONNECTED' : 'DISCONNECTED'} size="sm" />
              <span className="text-[#9CA3AF] font-mono text-[11px]">
                {isConnected ? 'Socket :4001' : 'Reconnecting'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {children}
      </main>
    </div>
  );
}
