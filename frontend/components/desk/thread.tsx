'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useDesk, useSelectedChat } from '@/lib/desk-store';
import { Textarea } from '@/components/ui/textare';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Send,
  CheckCircle2,
  ArrowLeft,
  Clock,
  MessageSquareOff,
  ImagePlus,
  X,
  Loader2,
  Maximize2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { TimeDisplay } from './time-display';
import { useSlashCommand } from '@/hooks/use-slash-command';
import { SlashCommandMenu } from './slash-command-menu';
import { ImageLightbox } from './image-lightbox';
import {
  uploadImageToCloudinaryDirect,
  validateImageFile,
} from '@/lib/image-upload';

const CANNED_RESPONSES = [
  'Checking your order status right now.',
  'Could you please provide your order ID?',
  'I have updated your address with our delivery partner.',
  'Is there anything else I can help you with today?',
];

export function Thread() {
  const chat = useSelectedChat();
  const selectChat = useDesk((s) => s.selectChat);
  const sendMessage = useDesk((s) => s.sendMessage);
  const closeChat = useDesk((s) => s.closeChat);
  const setMobileShowThread = useDesk((s) => s.setMobileShowThread);
  const me = useDesk((s) => s.me);
  const isHydrating = useDesk((s) => s.isHydrating);

  const [input, setInput] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    file: File;
    previewUrl: string;
    uploadedUrl?: string;
    progress: number;
    error?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const slashCommand = useSlashCommand({
    text: input,
    setText: setInput,
    textareaRef,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages]);

  if (isHydrating) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-[#F8FAFC] animate-pulse">
        <div className="size-12 rounded-2xl bg-slate-200 mb-3" />
        <div className="h-4 w-36 bg-slate-200 rounded mb-2" />
        <div className="h-3 w-52 bg-slate-100 rounded" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-[#F8FAFC]">
        <div className="size-14 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] shadow-xs mb-4">
          <MessageSquareOff className="size-6" />
        </div>
        <h2 className="text-sm font-semibold text-[#0F172A]">No Active Chat Selected</h2>
        <p className="text-xs text-[#64748B] mt-1.5 max-w-sm leading-relaxed">
          Select an active chat from your assigned queue to view history and respond in real-time.
        </p>
      </div>
    );
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error || 'Invalid image file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingImage({
      file,
      previewUrl,
      progress: 5,
    });
    setIsUploading(true);

    try {
      const res = await uploadImageToCloudinaryDirect(file, {
        onProgress: (percent) => {
          setPendingImage((prev) => (prev ? { ...prev, progress: percent } : null));
        },
      });

      setPendingImage((prev) =>
        prev
          ? {
              ...prev,
              uploadedUrl: res.secureUrl,
              progress: 100,
            }
          : null
      );
    } catch (err: any) {
      setPendingImage((prev) =>
        prev
          ? {
              ...prev,
              error: err?.message || 'Failed to upload image. Please try again.',
            }
          : null
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRetryUpload = async () => {
    if (!pendingImage?.file) return;
    setIsUploading(true);
    setPendingImage((prev) => (prev ? { ...prev, error: undefined, progress: 5 } : null));

    try {
      const res = await uploadImageToCloudinaryDirect(pendingImage.file, {
        onProgress: (percent) => {
          setPendingImage((prev) => (prev ? { ...prev, progress: percent } : null));
        },
      });
      setPendingImage((prev) =>
        prev ? { ...prev, uploadedUrl: res.secureUrl, progress: 100 } : null
      );
    } catch (err: any) {
      setPendingImage((prev) =>
        prev
          ? {
              ...prev,
              error: err?.message || 'Failed to upload image. Please try again.',
            }
          : null
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelImage = () => {
    if (pendingImage?.previewUrl) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }
    setPendingImage(null);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = () => {
    const trimmed = input.trim();
    const uploadedUrl = pendingImage?.uploadedUrl;

    if ((!trimmed && !uploadedUrl) || isUploading || !chat) return;

    if (typeof sendMessage === 'function') {
      sendMessage(chat.id, trimmed, uploadedUrl);
    } else {
      const store = useDesk.getState() as any;
      if (typeof store.sendMessage === 'function') {
        store.sendMessage(chat.id, trimmed, uploadedUrl);
      }
    }

    setInput('');
    if (pendingImage?.previewUrl) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }
    setPendingImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashCommand.handleKeyDown(e)) {
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    if (!chat) return;
    if (typeof closeChat === 'function') {
      closeChat(chat.id);
    } else {
      const store = useDesk.getState() as any;
      if (typeof store.closeChat === 'function') {
        store.closeChat(chat.id);
      }
    }
  };

  const handleBack = () => {
    if (typeof selectChat === 'function') {
      selectChat(null);
    }
    if (typeof setMobileShowThread === 'function') {
      setMobileShowThread(false);
    }
  };

  const customerId = chat.customerId || chat.id;
  const customerObj = typeof chat.customer === 'object' && chat.customer !== null ? chat.customer : null;
  const customerName =
    customerObj?.name ||
    (typeof chat.customer === 'string' ? chat.customer : null) ||
    customerId ||
    'Customer';

  const customerAvatar =
    chat.customerAvatar ||
    (chat as any).avatarUrl ||
    (customerObj as any)?.avatarUrl ||
    '/avatars/avatar-1.png';

  const agentAvatar =
    (me as any)?.avatarUrl ||
    '/avatars/avatar-2.png';

  const canSend = Boolean((input.trim() || pendingImage?.uploadedUrl) && !isUploading);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* Lightbox for clicked images */}
      <ImageLightbox
        src={lightboxUrl}
        onClose={() => setLightboxUrl(null)}
      />

      <header className="flex h-14 items-center justify-between border-b border-[#E2E8F0] px-3 sm:px-4 md:px-5 shrink-0 bg-white gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="lg:hidden p-1.5 -ml-1 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer shrink-0"
          >
            <ArrowLeft className="size-4" />
          </button>

          <div className="size-9 rounded-full relative overflow-hidden bg-[#EFF6FF] border border-[#BFDBFE] shrink-0">
            <Image
              src={customerAvatar}
              alt={customerName}
              fill
              sizes="36px"
              className="object-cover"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-semibold text-[#0F172A] truncate max-w-[110px] sm:max-w-[200px]">
                {customerName}
              </h2>
              <span
                className="size-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100 shrink-0"
                title="Active"
              />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#94A3B8] truncate">
              <span className="flex items-center gap-1">
                <Clock className="size-3 shrink-0" />
                <TimeDisplay timestamp={chat.assignedAt} fallback="Live" />
              </span>
              <span>•</span>
              <span className="truncate">ID: {customerId.slice(0, 8)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold shrink-0">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden xs:inline">Active</span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-[#E2E8F0] text-xs font-medium text-[#475569] transition-all cursor-pointer shrink-0 whitespace-nowrap"
          >
            <CheckCircle2 className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">Resolve & </span>
            <span>Close</span>
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 md:p-5 space-y-3 bg-[#F8FAFC]">
        {(chat.messages || []).map((m: any, idx: number) => {
          const isAgent =
            m.senderType === 'AGENT' ||
            m.from === 'agent' ||
            m.sender === 'agent' ||
            m.role === 'agent';

          const timeVal = m.sentAt || m.timestamp || new Date();
          const avatarToUse = isAgent ? agentAvatar : customerAvatar;

          return (
            <div
              key={idx}
              className={cn(
                'flex gap-2 items-end max-w-[90%] sm:max-w-[80%]',
                isAgent ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'
              )}
            >
              <div className="size-7 rounded-full relative overflow-hidden bg-white border border-[#E2E8F0] shrink-0 mb-1">
                <Image
                  src={avatarToUse}
                  alt={isAgent ? 'Agent' : 'Customer'}
                  fill
                  sizes="28px"
                  className="object-cover"
                />
              </div>

              <div className={cn('flex flex-col', isAgent ? 'items-end' : 'items-start')}>
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-mono text-[#94A3B8]">
                  <span>{isAgent ? 'You (Agent)' : customerName}</span>
                  <span>•</span>
                  <TimeDisplay timestamp={typeof timeVal === 'string' ? timeVal : timeVal.toISOString()} fallback="" />
                </div>

                {/* Attached Image with click to expand lightbox */}
                {m.imageUrl && (
                  <div
                    onClick={() => setLightboxUrl(m.imageUrl)}
                    className="rounded-2xl overflow-hidden border border-slate-200/80 mb-1 cursor-pointer max-w-[260px] group relative hover:opacity-95 transition-all shadow-xs bg-slate-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.imageUrl}
                      alt="Chat attachment"
                      className="w-full max-h-56 object-cover group-hover:scale-102 transition-transform duration-150"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1">
                        <Maximize2 className="size-3" /> Expand
                      </span>
                    </div>
                  </div>
                )}

                {/* Text Message Bubble (if text provided) */}
                {m.text && (
                  <div
                    className={cn(
                      'rounded-2xl px-3.5 py-2 text-xs md:text-sm leading-relaxed break-words shadow-2xs',
                      isAgent
                        ? 'bg-[#2563EB] text-white rounded-br-xs font-normal'
                        : 'bg-white text-[#0F172A] border border-[#E2E8F0] rounded-bl-xs'
                    )}
                  >
                    {m.text}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input section with slash command popup and image upload */}
      <div className="relative border-t border-[#E2E8F0] p-3 bg-white shrink-0 space-y-2">
        {/* Floating Slash Command Menu */}
        <SlashCommandMenu
          isOpen={slashCommand.isOpen}
          query={slashCommand.query}
          items={slashCommand.filteredItems}
          selectedIndex={slashCommand.selectedIndex}
          onSelect={slashCommand.selectItem}
          onClose={slashCommand.closeMenu}
        />

        {/* Quick Canned Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mr-1 shrink-0">
            Type <kbd className="px-1 py-0.2 bg-slate-100 border border-slate-200 rounded text-[9px]">/</kbd> for verbiages or:
          </span>
          {CANNED_RESPONSES.map((resp, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInput(resp)}
              className="text-[11px] font-medium whitespace-nowrap rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 text-[#475569] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] hover:text-[#2563EB] transition-all shrink-0 cursor-pointer"
            >
              {resp}
            </button>
          ))}
        </div>

        {/* Pending Image Attachment Bar */}
        {pendingImage && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative size-12 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingImage.previewUrl}
                  alt="Upload preview"
                  className="size-full object-cover"
                />
                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="size-4 text-white animate-spin" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-[300px]">
                  {pendingImage.file.name}
                </p>
                {isUploading ? (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-200"
                        style={{ width: `${pendingImage.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-blue-600 font-mono font-medium">
                      {pendingImage.progress}%
                    </span>
                  </div>
                ) : pendingImage.error ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-600 mt-0.5">
                    <AlertCircle className="size-3 shrink-0" />
                    <span className="truncate">{pendingImage.error}</span>
                    <button
                      type="button"
                      onClick={handleRetryUpload}
                      className="underline font-semibold hover:text-rose-700 cursor-pointer flex items-center gap-0.5 ml-1"
                    >
                      <RefreshCw className="size-2.5" /> Retry
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium mt-0.5">
                    <CheckCircle2 className="size-3" /> Ready to send
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCancelImage}
              title="Remove image"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="flex items-end gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                slashCommand.checkTrigger(e.target.value, e.target.selectionStart);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type your reply (Type / for canned responses, Enter to send)..."
              className="min-h-[56px] bg-white border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8] rounded-xl text-xs p-2.5 focus:border-[#2563EB]"
            />
          </div>

          {/* Image Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Attach image (JPEG, PNG, WEBP, GIF up to 5MB)"
            className="h-10 w-10 flex items-center justify-center rounded-xl border border-[#E2E8F0] hover:border-blue-300 hover:bg-blue-50/70 text-slate-600 hover:text-blue-600 transition-colors shrink-0 disabled:opacity-40 cursor-pointer"
          >
            <ImagePlus className="size-4" />
          </button>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!canSend}
            className="h-10 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white shrink-0 shadow-xs disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
          >
            <Send className="size-3.5" />
            <span className="text-xs font-semibold">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
