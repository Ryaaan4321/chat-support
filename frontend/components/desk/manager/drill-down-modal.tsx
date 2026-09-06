'use client';

import React from 'react';
import { AlertTriangle, X, Timer, ChevronDown, ChevronUp } from 'lucide-react';
import { AgentInfo } from '@/types/socket.event.types';
import { cn } from '@/lib/utils';
import { PerformanceChat, DrillFilterType } from './types';

interface DrillDownModalProps {
  selectedAgent: AgentInfo | null;
  drillFilter: DrillFilterType;
  onSetFilter: (filter: DrillFilterType) => void;
  drillChats: PerformanceChat[];
  isLoading: boolean;
  expandedChatId: string | null;
  onToggleExpandChat: (chatId: string) => void;
  onClose: () => void;
}

export function DrillDownModal({
  selectedAgent,
  drillFilter,
  onSetFilter,
  drillChats,
  isLoading,
  expandedChatId,
  onToggleExpandChat,
  onClose,
}: DrillDownModalProps) {
  if (!selectedAgent) return null;

  const filteredDrillChats = React.useMemo(() => {
    if (drillFilter === 'LATE') {
      return drillChats.filter(
        (c) => (c.lateReplyCount || 0) > 0 || c.slaBreached
      );
    }
    if (drillFilter === 'SLOW') {
      return drillChats.filter((c) => (c.firstResponseSeconds || 0) > 60);
    }
    return drillChats;
  }, [drillChats, drillFilter]);

  const lateCount = drillChats.filter(
    (c) => (c.lateReplyCount || 0) > 0 || c.slaBreached
  ).length;

  const slowCount = drillChats.filter(
    (c) => (c.firstResponseSeconds || 0) > 60
  ).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {selectedAgent.name}
              </h3>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-semibold border',
                  selectedAgent.shiftStatus === 'AVAILABLE' &&
                    'bg-emerald-50 text-emerald-700 border-emerald-200',
                  selectedAgent.shiftStatus === 'ON_BREAK' &&
                    'bg-amber-50 text-amber-700 border-amber-200',
                  selectedAgent.shiftStatus === 'WRAP_UP' &&
                    'bg-blue-50 text-blue-700 border-blue-200',
                  selectedAgent.shiftStatus === 'OFFLINE' &&
                    'bg-slate-100 text-slate-600 border-slate-200'
                )}
              >
                {selectedAgent.shiftStatus}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              {selectedAgent.email} • Capacity: {selectedAgent.activeChatCount}/
              {selectedAgent.chatCapacity}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSetFilter('ALL')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors',
              drillFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            All Chats ({drillChats.length})
          </button>
          <button
            type="button"
            onClick={() => onSetFilter('LATE')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5',
              drillFilter === 'LATE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            )}
          >
            <AlertTriangle className="size-3" />
            Late Replies ({lateCount})
          </button>
          <button
            type="button"
            onClick={() => onSetFilter('SLOW')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5',
              drillFilter === 'SLOW'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            )}
          >
            <Timer className="size-3" />
            Slow First Response ({slowCount})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-slate-100 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : filteredDrillChats.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No conversations matching the selected filter.
            </div>
          ) : (
            filteredDrillChats.map((chat) => {
              const isExpanded = expandedChatId === chat.id;
              const hasLate =
                (chat.lateReplyCount || 0) > 0 || chat.slaBreached;
              const isSlow = (chat.firstResponseSeconds || 0) > 60;

              return (
                <div
                  key={chat.id}
                  className={cn(
                    'border rounded-xl p-4 bg-white shadow-xs transition-all',
                    hasLate
                      ? 'border-rose-200 bg-rose-50/10'
                      : 'border-slate-200'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {chat.customerId}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          #{chat.id.slice(0, 8)}
                        </span>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-semibold border',
                            chat.status === 'ACTIVE' &&
                              'bg-blue-50 text-blue-700 border-blue-200',
                            chat.status === 'CLOSED' &&
                              'bg-slate-100 text-slate-600 border-slate-200',
                            chat.status === 'WAITING' &&
                              'bg-amber-50 text-amber-700 border-amber-200'
                          )}
                        >
                          {chat.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-600">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Timer className="size-3 text-slate-400" />
                          First Response:{' '}
                          <strong
                            className={
                              isSlow ? 'text-amber-600' : 'text-slate-800'
                            }
                          >
                            {chat.firstResponseSeconds
                              ? `${chat.firstResponseSeconds}s`
                              : 'Pending'}
                          </strong>
                        </span>

                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <AlertTriangle
                            className={cn(
                              'size-3',
                              hasLate ? 'text-rose-500' : 'text-slate-400'
                            )}
                          />
                          Late Replies:{' '}
                          <strong
                            className={
                              hasLate ? 'text-rose-600' : 'text-slate-800'
                            }
                          >
                            {chat.lateReplyCount || 0}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleExpandChat(chat.id)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
                    >
                      <span>{isExpanded ? 'Hide' : 'Inspect Timeline'}</span>
                      {isExpanded ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Message Timeline ({chat.messages.length} messages)
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {chat.messages.map((msg, mIdx) => {
                          const isAgent = msg.senderType === 'AGENT';
                          let isLateResponse = false;
                          if (isAgent && mIdx > 0) {
                            const prevMsg = chat.messages[mIdx - 1];
                            if (
                              prevMsg &&
                              prevMsg.senderType === 'CUSTOMER'
                            ) {
                              const gap = Math.floor(
                                (new Date(msg.sentAt).getTime() -
                                  new Date(prevMsg.sentAt).getTime()) /
                                  1000
                              );
                              if (gap > 120) {
                                isLateResponse = true;
                              }
                            }
                          }

                          return (
                            <div
                              key={msg.id || mIdx}
                              className={cn(
                                'p-2.5 rounded-lg text-xs border',
                                isAgent
                                  ? 'bg-blue-50/60 border-blue-100 text-blue-900 ml-4'
                                  : 'bg-slate-50 border-slate-200 text-slate-800 mr-4',
                                isLateResponse &&
                                  'border-rose-300 bg-rose-50/60 text-rose-950'
                              )}
                            >
                              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                <span className="font-semibold">
                                  {isAgent ? 'Agent' : 'Customer'}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {isLateResponse && (
                                    <span className="text-rose-600 font-bold font-mono">
                                      Late Response (&gt;120s)
                                    </span>
                                  )}
                                  <span className="font-mono">
                                    {new Date(msg.sentAt).toLocaleTimeString()}
                                  </span>
                                </div>
                              </div>
                              <div>{msg.text}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
