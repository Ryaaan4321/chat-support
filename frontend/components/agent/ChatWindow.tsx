'use client';

import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Send, CheckCircle2, User, ShieldCheck, Clock, MessageSquareOff } from 'lucide-react';
import { ChatItem } from '../../types/socket.event.types';

interface ChatWindowProps {
  chat: ChatItem | null;
  onSendMessage: (chatId: string, text: string) => void;
  onCloseChat: (chatId: string) => void;
  disabled?: boolean;
}

export function ChatWindow({
  chat,
  onSendMessage,
  onCloseChat,
  disabled = false,
}: ChatWindowProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !chat || disabled) return;
    onSendMessage(chat.id, inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  if (!chat) {
    return (
      <div className="h-full min-h-[480px] rounded-2xl bg-[#14171C] border border-[#22262B] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#1A1F26] border border-[#272E38] flex items-center justify-center mb-4 text-[#4B5563]">
          <MessageSquareOff className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">No Active Chat Selected</h3>
        <p className="text-xs text-[#9CA3AF] max-w-sm">
          Incoming queued chats will be assigned to your open slots automatically when you are in Available status.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[540px] rounded-2xl bg-[#14171C] border border-[#22262B] flex flex-col overflow-hidden shadow-xl">
      <div className="px-5 py-3.5 bg-[#171B21] border-b border-[#22262B] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1C222B] border border-[#2A3340] flex items-center justify-center text-[#22C55E]">
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-white">{chat.customerId}</h3>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#16A34A]/10 text-[#22C55E] border border-[#16A34A]/20">
                Active Session
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#6B7280]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {chat.assignedAt ? `Assigned ${new Date(chat.assignedAt).toLocaleTimeString()}` : 'Live'}
              </span>
              <span>•</span>
              <span>ID: {chat.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onCloseChat(chat.id)}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#222730] hover:bg-[#B91C1C]/20 hover:text-[#EF4444] hover:border-[#EF4444]/30 border border-[#303844] text-xs font-medium text-[#D1D5DB] transition-all group"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#EF4444]" />
          <span>Resolve & Close</span>
        </button>
      </div>

      <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-3.5 bg-[#0F1216]">
        {chat.messages.length === 0 ? (
          <div className="text-center my-auto py-8 text-xs text-[#6B7280]">
            Chat connected. Customer is waiting for your response.
          </div>
        ) : (
          chat.messages.map((msg, idx) => {
            const isAgent = msg.senderType === 'AGENT';
            return (
              <div
                key={idx}
                className={clsx(
                  'flex flex-col max-w-[75%]',
                  isAgent ? 'ml-auto items-end' : 'mr-auto items-start'
                )}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-mono text-[#6B7280]">
                  <span>{isAgent ? 'You (Agent)' : chat.customerId}</span>
                  <span>•</span>
                  <span>{new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div
                  className={clsx(
                    'px-4 py-2.5 rounded-2xl text-xs leading-relaxed break-words',
                    isAgent
                      ? 'bg-gradient-to-r from-[#0F9D58] to-[#16A34A] text-white rounded-tr-none shadow-md'
                      : 'bg-[#1C2026] text-[#F3F4F6] border border-[#2C333E] rounded-tl-none'
                  )}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3.5 bg-[#171B21] border-t border-[#22262B] flex items-end gap-2.5">
        <div className="flex-1 relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Type your response... (Press Enter to send)"
            rows={2}
            className="w-full resize-none bg-[#121519] border border-[#272E38] focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#6B7280] outline-none transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={!inputText.trim() || disabled}
          className="h-10 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-40 disabled:hover:bg-[#16A34A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(22,163,74,0.3)] transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
