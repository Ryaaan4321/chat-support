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
  Mic,
  Film,
  Volume2,
} from 'lucide-react';
import { TimeDisplay } from './time-display';
import { useSlashCommand } from '@/hooks/use-slash-command';
import { SlashCommandMenu } from './slash-command-menu';
import { ImageLightbox } from './image-lightbox';
import {
  uploadMediaToCloudinaryDirect,
  validateMediaFile,
} from '@/lib/media-upload';
import { VoiceRecorder } from './voice-recorder';
import { MediaBubble } from './media-bubble';
import { UserAvatar } from './user-avatar';
import { resolveAvatarUrl } from '@/lib/avatars';

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
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{
    file: File;
    previewUrl: string;
    uploadedUrl?: string;
    messageType: 'IMAGE' | 'AUDIO' | 'VIDEO';
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

    const validation = validateMediaFile(file);
    if (!validation.valid || !validation.messageType) {
      alert(validation.error || 'Invalid media file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingMedia({
      file,
      previewUrl,
      messageType: validation.messageType,
      progress: 5,
    });
    setIsUploading(true);

    try {
      const res = await uploadMediaToCloudinaryDirect(file, {
        onProgress: (percent) => {
          setPendingMedia((prev) => (prev ? { ...prev, progress: percent } : null));
        },
      });

      setPendingMedia((prev) =>
        prev
          ? {
              ...prev,
              uploadedUrl: res.secureUrl,
              messageType: res.messageType,
              progress: 100,
            }
          : null
      );
    } catch (err: any) {
      setPendingMedia((prev) =>
        prev
          ? {
              ...prev,
              error: err?.message || 'Failed to upload media. Please try again.',
            }
          : null
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendVoiceNote = async (audioFile: File) => {
    if (!chat) return;
    setIsRecordingVoice(false);
    setIsUploading(true);
    const previewUrl = URL.createObjectURL(audioFile);
    setPendingMedia({
      file: audioFile,
      previewUrl,
      messageType: 'AUDIO',
      progress: 15,
    });

    try {
      const res = await uploadMediaToCloudinaryDirect(audioFile, {
        onProgress: (percent) => {
          setPendingMedia((prev) => (prev ? { ...prev, progress: percent } : null));
        },
      });

      if (typeof sendMessage === 'function') {
        sendMessage(chat.id, '', res.secureUrl, 'AUDIO');
      } else {
        const store = useDesk.getState() as any;
        if (typeof store.sendMessage === 'function') {
          store.sendMessage(chat.id, '', res.secureUrl, 'AUDIO');
        }
      }
      setPendingMedia(null);
    } catch (err: any) {
      setPendingMedia((prev) =>
        prev
          ? {
              ...prev,
              error: err?.message || 'Failed to upload voice note. Please try again.',
            }
          : null
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetryUpload = async () => {
    if (!pendingMedia?.file) return;
    setIsUploading(true);
    setPendingMedia((prev) => (prev ? { ...prev, error: undefined, progress: 5 } : null));

    try {
      const res = await uploadMediaToCloudinaryDirect(pendingMedia.file, {
        onProgress: (percent) => {
          setPendingMedia((prev) => (prev ? { ...prev, progress: percent } : null));
        },
      });
      setPendingMedia((prev) =>
        prev ? { ...prev, uploadedUrl: res.secureUrl, messageType: res.messageType, progress: 100 } : null
      );
    } catch (err: any) {
      setPendingMedia((prev) =>
        prev
          ? {
              ...prev,
              error: err?.message || 'Failed to upload media. Please try again.',
            }
          : null
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelMedia = () => {
    if (pendingMedia?.previewUrl) {
      URL.revokeObjectURL(pendingMedia.previewUrl);
    }
    setPendingMedia(null);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = () => {
    const trimmed = input.trim();
    const uploadedUrl = pendingMedia?.uploadedUrl;
    const messageType = pendingMedia?.messageType;

    if ((!trimmed && !uploadedUrl) || isUploading || !chat) return;

    if (typeof sendMessage === 'function') {
      sendMessage(chat.id, trimmed, uploadedUrl, messageType);
    } else {
      const store = useDesk.getState() as any;
      if (typeof store.sendMessage === 'function') {
        store.sendMessage(chat.id, trimmed, uploadedUrl, messageType);
      }
    }

    setInput('');
    if (pendingMedia?.previewUrl) {
      URL.revokeObjectURL(pendingMedia.previewUrl);
    }
    setPendingMedia(null);
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

  const customerAvatar = resolveAvatarUrl(
    chat.customerAvatar ||
    (chat as any).avatarUrl ||
    (customerObj as any)?.avatarUrl,
    'CUSTOMER'
  );

  const agentAvatar = resolveAvatarUrl(
    (me as any)?.avatarUrl,
    'AGENT'
  );

  const canSend = (Boolean(input.trim()) || Boolean(pendingMedia?.uploadedUrl)) && !isUploading;

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

          <UserAvatar
            src={customerAvatar}
            alt={customerName}
            size="lg"
            fallbackText={customerName}
            className="bg-[#EFF6FF] border-[#BFDBFE]"
          />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-semibold text-[#0F172A] truncate max-w-[110px] sm:max-w-[200px]">
                {customerName}
              </h2>
              <span
                className="size-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100 shrink-0"
                title="Active"
              />
              <span className="text-[11px] text-[#64748B] font-mono hidden xs:inline truncate">
                {customerObj?.email || `${customerId.slice(0, 8)}@guest.swish`}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#64748B] font-mono">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                <span>{chat.messages.length} msg{chat.messages.length !== 1 ? 's' : ''}</span>
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
              <UserAvatar
                src={avatarToUse}
                alt={isAgent ? 'Agent' : customerName}
                size="sm"
                fallbackText={isAgent ? 'Agent' : customerName}
                className="mb-1 bg-white border-[#E2E8F0]"
              />

              <div className={cn('flex flex-col', isAgent ? 'items-end' : 'items-start')}>
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-mono text-[#94A3B8]">
                  <span>{isAgent ? 'You (Agent)' : customerName}</span>
                  <span>•</span>
                  <TimeDisplay timestamp={typeof timeVal === 'string' ? timeVal : timeVal.toISOString()} fallback="" />
                </div>

                {/* Attached Media (Image, Audio Voice Note, Video) */}
                {m.imageUrl && (
                  <MediaBubble
                    mediaUrl={m.imageUrl}
                    messageType={m.messageType || 'IMAGE'}
                    isAgent={isAgent}
                    onExpandImage={(url) => setLightboxUrl(url)}
                  />
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

        {/* Pending Media Attachment Bar */}
        {pendingMedia && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative size-12 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0 flex items-center justify-center">
                {pendingMedia.messageType === 'IMAGE' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pendingMedia.previewUrl}
                    alt="Upload preview"
                    className="size-full object-cover"
                  />
                ) : pendingMedia.messageType === 'AUDIO' ? (
                  <div className="flex items-center justify-center size-full bg-blue-50 text-blue-600">
                    <Volume2 className="size-6" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center size-full bg-indigo-50 text-indigo-600">
                    <Film className="size-6" />
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="size-4 text-white animate-spin" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-700">
                    {pendingMedia.messageType}
                  </span>
                  <p className="text-xs font-semibold text-slate-800 truncate max-w-[180px] sm:max-w-[280px]">
                    {pendingMedia.file.name}
                  </p>
                </div>
                {isUploading ? (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-200"
                        style={{ width: `${pendingMedia.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-blue-600 font-mono font-medium">
                      {pendingMedia.progress}%
                    </span>
                  </div>
                ) : pendingMedia.error ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-600 mt-0.5">
                    <AlertCircle className="size-3 shrink-0" />
                    <span className="truncate">{pendingMedia.error}</span>
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
              onClick={handleCancelMedia}
              title="Remove media"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* In-Browser Voice Note Recorder */}
        {isRecordingVoice && (
          <VoiceRecorder
            onSendVoiceNote={handleSendVoiceNote}
            onCancel={() => setIsRecordingVoice(false)}
            isUploading={isUploading}
          />
        )}

        {/* Input Bar */}
        <div className="flex items-end gap-2">
          {/* Hidden file input for images, audio, video */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
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

          {/* Voice Note Recorder Button */}
          <button
            type="button"
            onClick={() => setIsRecordingVoice((prev) => !prev)}
            disabled={isUploading}
            title={isRecordingVoice ? 'Close voice recorder' : 'Record voice note'}
            className={cn(
              'h-10 w-10 flex items-center justify-center rounded-xl border transition-colors shrink-0 disabled:opacity-40 cursor-pointer',
              isRecordingVoice
                ? 'bg-rose-50 border-rose-300 text-rose-600'
                : 'border-[#E2E8F0] hover:border-rose-300 hover:bg-rose-50/70 text-slate-600 hover:text-rose-600'
            )}
          >
            <Mic className="size-4" />
          </button>

          {/* Media Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Attach media (Images, Audio, Video)"
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
