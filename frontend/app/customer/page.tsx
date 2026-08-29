'use client';

import React from 'react';
import { CustomerWidget } from '../../components/customer/CustomerWidget';
import { AppShell } from '../../components/shell/AppShell';
import { Shield, Sparkles, Check, HelpCircle, ArrowRight } from 'lucide-react';

export default function CustomerPage() {
  return (
    <AppShell activeRole="CUSTOMER" activeIdentityLabel="Client Portal Preview" isConnected={true}>
      <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full py-4">
        <div className="rounded-3xl bg-gradient-to-b from-[#171C23] to-[#121519] border border-[#272E38] p-8 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#16A34A]/10 text-[#22C55E] text-xs font-semibold uppercase tracking-wider mb-4 border border-[#16A34A]/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Customer Facing Embedded Experience</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Customer Support Widget Demonstration
            </h1>

            <p className="text-xs sm:text-sm text-[#9CA3AF] mt-3 leading-relaxed">
              This page showcases the lightweight client-side widget. Click the green chat bubble in the bottom-right corner to initiate a real-time session, experience the FIFO queue waiting animation, and chat with an assigned agent.
            </p>

            <div className="mt-6 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-xs text-[#D1D5DB]">
                <div className="w-5 h-5 rounded-full bg-[#16A34A]/20 flex items-center justify-center text-[#22C55E]">
                  <Check className="w-3 h-3" />
                </div>
                <span>Zero-auth session generation</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#D1D5DB]">
                <div className="w-5 h-5 rounded-full bg-[#16A34A]/20 flex items-center justify-center text-[#22C55E]">
                  <Check className="w-3 h-3" />
                </div>
                <span>Live queue position listener</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#D1D5DB]">
                <div className="w-5 h-5 rounded-full bg-[#16A34A]/20 flex items-center justify-center text-[#22C55E]">
                  <Check className="w-3 h-3" />
                </div>
                <span>Clean resolution and reset flow</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-[#14171C] border border-[#22262B]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#38BDF8]" />
              <span>How To Test Concurrency Live</span>
            </h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Open the <strong>Agent Workspace</strong> in another browser tab, set the agent status to <strong>Available</strong>, and click <em>Start Live Chat</em> in the widget to watch atomic slot assignment instantly connect.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#14171C] border border-[#22262B]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#FBBF24]" />
              <span>Queue Overflow Testing</span>
            </h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Set agents to <strong>On Break</strong> or fill all available slots. New customer sessions will seamlessly wait in the queued state until an agent resolves a chat.
            </p>
          </div>
        </div>
      </div>

      <CustomerWidget defaultOpen={true} />
    </AppShell>
  );
}
