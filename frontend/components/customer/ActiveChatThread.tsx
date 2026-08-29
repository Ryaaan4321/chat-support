'use client';

import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Send, CheckCircle2, RotateCcw } from 'lucide-react';
import { ChatItem } from '../../types/socket.event.types';

interface ActiveChatThreadProps {
  chat: ChatItem;
  onSendMessage: (text: string) => void;
  onRestartChat: () => void;
  isClosed?: boolean;
}

export function ActiveChatThread({
  chat,
  onSendMessage,
  onRestartChat,
  isClosed = false,
}: ActiveChatThreadProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isClosed) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F9FAFB]">
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
        {chat.messages.length === 0 ? (
          <div className="text-center my-auto py-6 text-xs text-[#6B7280]">
            Connected to an agent. How can we help you today?
          </div>
        ) : (
          chat.messages.map((msg, idx) => {
            const isCustomer = msg.senderType === 'CUSTOMER';
            return (
              <div
                key={idx}
                className={clsx(
                  'flex flex-col max-w-[80%]',
                  isCustomer ? 'ml-auto items-end' : 'mr-auto items-start'
                )}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-[#9CA3AF]">
                  <span>{isCustomer ? 'You' : 'Support Agent'}</span>
                  <span>•</span>
                  <span>{new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div
                  className={clsx(
                    'px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-xs',
                    isCustomer
                      ? 'bg-[#16A34A] text-white rounded-tr-none'
                      : 'bg-white text-[#111827] border border-[#E5E7EB] rounded-tl-none'
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

      {isClosed ? (
        <div className="p-4 bg-white border-t border-[#E5E7EB] flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            <span>This chat session has been resolved.</span>
          </div>
          <p className="text-[11px] text-[#6B7280]">
            Thank you for reaching out to support.
          </p>
          <button
            type="button"
            onClick={onRestartChat}
            className="mt-1 px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start New Chat</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-[#E5E7EB] flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-[#F3F4F6] border border-[#E5E7EB] focus:border-[#16A34A] focus:bg-white rounded-xl px-3.5 py-2 text-xs text-[#111827] placeholder-[#9CA3AF] outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-8 h-8 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-40 text-white flex items-center justify-center shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}
