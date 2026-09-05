'use client';

import React, { useState, useEffect } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { AppHeader } from './app-header';
import { ChatList } from './chat-list';
import { Thread } from './thread';
import { useDesk, useMyActiveChats } from '@/lib/desk-store';

export function AgentWorkspace() {
  const selected = useDesk((s) => s.selectedChatId);
  const mobileThread = useDesk((s) => s.mobileShowThread);
  const chats = useMyActiveChats();
  const initSocketSession = useDesk((s) => s.initSocketSession);
  const showThread = Boolean(selected && mobileThread);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    initSocketSession();
  }, [initSocketSession]);

  return (
    <div className="flex h-screen min-h-0 w-full max-w-full flex-col bg-[#F8FAFC] text-[#0F172A] overflow-hidden">
      <AppHeader />
      <div className="flex-1 min-h-0 w-full max-w-full flex flex-col overflow-hidden">
        <div className="flex h-full min-h-0 w-full max-w-full lg:hidden overflow-hidden">
          {!showThread ? (
            <section className="flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] bg-white shrink-0">
                <h1 className="text-sm font-semibold text-[#0F172A]">Your Assigned Chats</h1>
                <span className="rounded-md bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 text-xs font-semibold text-[#2563EB]">
                  {chats.length} active
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
                <ChatList />
              </div>
            </section>
          ) : (
            <section className="h-full min-h-0 w-full max-w-full bg-white overflow-hidden">
              <Thread />
            </section>
          )}
        </div>

        <div className="hidden h-full min-h-0 w-full max-w-full lg:flex flex-1 overflow-hidden">
          {!mounted ? (
            <div className="flex h-full w-full max-w-full overflow-hidden">
              <section style={{ width: '320px' }} className="flex h-full min-h-0 flex-col bg-white shrink-0 border-r border-[#E2E8F0] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E2E8F0] shrink-0">
                  <h1 className="text-sm font-semibold text-[#0F172A]">Your Assigned Chats</h1>
                  <span className="rounded-md bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 text-xs font-semibold text-[#2563EB]">
                    {chats.length} active
                  </span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
                  <ChatList />
                </div>
              </section>
              <section className="flex-1 h-full min-h-0 flex flex-col bg-white overflow-hidden">
                <Thread />
              </section>
            </div>
          ) : (
            <Group orientation="horizontal" className="h-full w-full max-w-full overflow-hidden">
              <Panel defaultSize="320px" minSize="260px" maxSize="460px" className="min-h-0 h-full">
                <section className="flex h-full min-h-0 w-full flex-col bg-white border-r border-[#E2E8F0] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E2E8F0] shrink-0">
                    <h1 className="text-sm font-semibold text-[#0F172A]">Your Assigned Chats</h1>
                    <span className="rounded-md bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 text-xs font-semibold text-[#2563EB]">
                      {chats.length} active
                    </span>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
                    <ChatList />
                  </div>
                </section>
              </Panel>

              <Separator className="w-1.5 relative flex items-center justify-center bg-[#F8FAFC] hover:bg-[#EFF6FF] transition-colors cursor-col-resize group select-none">
                <div className="w-0.5 h-8 rounded-full bg-[#CBD5E1] group-hover:bg-[#2563EB] transition-colors" />
              </Separator>

              <Panel minSize="400px" className="min-h-0 h-full">
                <section className="flex h-full min-h-0 w-full flex-col bg-white overflow-hidden">
                  <Thread />
                </section>
              </Panel>
            </Group>
          )}
        </div>
      </div>
    </div>
  );
}