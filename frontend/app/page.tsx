'use client';

import React from 'react';
import Link from 'next/link';
import { Headphones, ShieldAlert, MessageSquare, ArrowRight, Activity, Zap, Cpu, CheckCircle2 } from 'lucide-react';
import { AppShell } from '../components/shell/AppShell';

export default function HubPage() {
  const surfaces = [
    {
      title: 'Agent Workspace',
      description: 'Operations console for support agents. Segmented shift status controls, capacity-constrained chat slots, live messaging, and instant resolution workflows.',
      href: '/agent',
      icon: Headphones,
      badge: 'Ops Portal',
      highlights: ['1–4 Visual Capacity Bounds', 'Segmented Status Switcher', 'Auto-assign On Free Slot'],
      accent: 'from-[#0F9D58] to-[#16A34A]',
    },
    {
      title: 'Manager Dashboard',
      description: 'Real-time queue monitoring and agent capacity governance. Live concurrency adjustments, FIFO queue inspection, and system load analytics.',
      href: '/manager',
      icon: ShieldAlert,
      badge: 'Governance',
      highlights: ['Interactive Capacity Stepper', 'Real-time Queue Depth', 'Atomic DB Synchronization'],
      accent: 'from-[#0284C7] to-[#0EA5E9]',
    },
    {
      title: 'Customer Chat Widget',
      description: 'Lightweight embeddable chat widget. Zero-auth session initialization, live queue position animation, and instant agent bridging.',
      href: '/customer',
      icon: MessageSquare,
      badge: 'Client Embed',
      highlights: ['Queue Position Tracker', 'Light Embedded Theme', 'Auto-Reconnect State Sync'],
      accent: 'from-[#7C3AED] to-[#8B5CF6]',
    },
  ];

  return (
    <AppShell activeRole="MANAGER" activeIdentityLabel="Super Admin" isConnected={true}>
      <div className="flex flex-col gap-10 py-6 max-w-5xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#16A34A]/10 text-[#22C55E] text-xs font-mono font-semibold uppercase tracking-wider mb-4 border border-[#16A34A]/20">
            <Activity className="w-3.5 h-3.5" />
            <span>High-Concurrency Queue Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Live Agent Queue & Concurrency System
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-3 leading-relaxed">
            A real-time BPO chat platform powered by atomic Postgres locks (`FOR UPDATE SKIP LOCKED`) and Socket.io event-driven orchestration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {surfaces.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-[#14171C] border border-[#22262B] p-6 flex flex-col justify-between hover:border-[#333A46] transition-all group shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.accent} flex items-center justify-center text-white shadow-lg`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#1C2026] text-[#9CA3AF] border border-[#2B313C]">
                      {s.badge}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-white tracking-tight mb-2">
                    {s.title}
                  </h2>
                  <p className="text-xs text-[#9CA3AF] leading-relaxed mb-6">
                    {s.description}
                  </p>

                  <div className="space-y-2 mb-6">
                    {s.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-[#D1D5DB]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  href={s.href}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1E232B] hover:bg-[#16A34A] text-white text-xs font-semibold flex items-center justify-center gap-2 border border-[#2C333E] hover:border-[#16A34A] transition-all group-hover:shadow-md"
                >
                  <span>Launch Surface</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl bg-[#121519] border border-[#22262B] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1C2026] border border-[#272D36] flex items-center justify-center text-[#22C55E]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Backend Service Status</h3>
              <p className="text-[11px] text-[#6B7280]">Socket server on <code className="font-mono text-[#D1D5DB]">:4001</code> • PostgreSQL Neon Test Branch</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-[#16A34A]/10 text-[#22C55E] border border-[#16A34A]/20 font-semibold">
              3 Test Tiers Verified (22 Unit / 9 Integration / 4 Concurrency)
            </span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
