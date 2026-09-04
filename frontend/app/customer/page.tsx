'use client';

import React, { useState } from 'react';
import { AppHeader } from '@/components/desk/app-header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textare';
import { Clock, Send, MessageSquare, CheckCircle2 } from 'lucide-react';

export default function CustomerPage() {
  const [prompt, setPrompt] = useState('');
  const [customerId, setCustomerId] = useState('cust-alex-99');
  const [submitted, setSubmitted] = useState(false);
  const [waitingCount, setWaitingCount] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setSubmitted(true);
    setWaitingCount((prev) => prev + 1);
    setPrompt('');
  };

  return (
    <div className="min-h-dvh w-full max-w-full flex flex-col bg-[#F8FAFC] text-[#0F172A] overflow-x-hidden">
      <AppHeader />
      <main className="flex-1 w-full max-w-full min-w-0 px-3 py-4 sm:p-6 md:p-8 flex flex-col items-center justify-start sm:justify-center overflow-y-auto">
        <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 md:p-8 shadow-xs space-y-5 my-auto min-w-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB] shrink-0">
              <MessageSquare className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-[#0F172A] truncate">
                Customer Support Queue
              </h1>
              <p className="text-xs text-[#64748B] truncate">
                High-concurrency instant agent matching
              </p>
            </div>
          </div>

          {submitted ? (
            <div className="rounded-xl bg-[#F8FAFC] border border-emerald-200 p-4 sm:p-5 text-center space-y-3">
              <div className="size-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-5" />
              </div>
              <h2 className="text-sm font-semibold text-[#0F172A]">Queued in Priority Line</h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Your request has been placed in the queue. An available specialist will claim your session automatically.
              </p>
              <Button
                onClick={() => setSubmitted(false)}
                variant="outline"
                size="sm"
                className="w-full mt-2 cursor-pointer text-xs"
              >
                Queue Another Request
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5">
                  Customer Identifier
                </label>
                <input
                  type="text"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full min-w-0 bg-white border border-[#E2E8F0] rounded-xl px-3.5 py-2 text-xs md:text-sm text-[#0F172A] focus:border-[#2563EB] outline-none transition-all box-border"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5">
                  How can we help you?
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your issue with order, refund, or delivery..."
                  rows={4}
                  className="w-full min-w-0 bg-white border-[#E2E8F0] text-[#0F172A] focus:border-[#2563EB] rounded-xl text-xs box-border"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-10 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] font-semibold text-xs text-white shadow-xs cursor-pointer"
              >
                <Send className="size-3.5" />
                <span>Join Support Queue</span>
              </Button>
            </form>
          )}

          <div className="border-t border-[#E2E8F0] pt-3.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
            <span className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs">
              <Clock className="size-3.5 text-[#2563EB] shrink-0" />
              <span>Queue: {waitingCount} waiting</span>
            </span>
            <span className="font-semibold text-emerald-600 text-[11px] sm:text-xs">Avg wait &lt; 10s</span>
          </div>
        </div>
      </main>
    </div>
  );
}
