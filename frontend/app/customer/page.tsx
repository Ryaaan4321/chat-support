'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { AppHeader } from '@/components/desk/app-header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textare';
import {
  Clock,
  Send,
  MessageSquare,
  CheckCircle2,
  Headphones,
  Sparkles,
  RotateCcw,
  Loader2,
  ImagePlus,
  X,
  Maximize2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api, getStoredToken } from '@/lib/api';
import { createSocketClient, TypedSocket } from '@/lib/socket';
import { ImageLightbox } from '@/components/desk/image-lightbox';
import {
  uploadImageToCloudinaryDirect,
  validateImageFile,
} from '@/lib/image-upload';

interface ChatMessage {
  id?: string;
  clientTempId?: string;
  senderType: 'CUSTOMER' | 'AGENT';
  messageType?: 'TEXT' | 'IMAGE';
  text: string;
  imageUrl?: string;
  sentAt: string;
}

const ISSUE_TAGS = [
  'Order Delayed',
  'Missing Item',
  'Food Quality',
  'Payment & Refund',
  'Driver Contact',
];

const CANNED_CUSTOMER_QUERIES = [
  'Where is my food delivery driver right now?',
  'One of the items in my order was missing.',
  'Can I cancel and get a full refund?',
  'Thank you, that solved my issue!',
];

export default function CustomerPage() {
  const [customerId, setCustomerId] = useState('cust-guest');
  const [customerName, setCustomerName] = useState('Customer');
  const [customerAvatar, setCustomerAvatar] = useState('/avatars/avatar-1.png');

  const [prompt, setPrompt] = useState('');
  const [selectedTag, setSelectedTag] = useState(ISSUE_TAGS[0]);

  const [chatId, setChatId] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<'IDLE' | 'QUEUED' | 'ACTIVE' | 'CLOSED'>('IDLE');
  const [assignedAgentName, setAssignedAgentName] = useState<string | null>(null);
  const [assignedAgentId, setAssignedAgentId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [socket, setSocket] = useState<TypedSocket | null>(null);

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const bindSocketEvents = (client: TypedSocket) => {
    client.off('chat:queued');
    client.off('chat:assigned');
    client.off('chat:message');
    client.off('chat:closed');
    client.off('chat:sync');
    client.off('chat:rejoin_failed');

    client.on('chat:queued', (payload) => {
      setChatId(payload.chatId);
      setSessionState('QUEUED');
      if (typeof window !== 'undefined') {
        localStorage.setItem('swish_customer_chat_id', payload.chatId);
      }
    });

    client.on('chat:assigned', (payload) => {
      setChatId(payload.chatId);
      setSessionState('ACTIVE');
      setAssignedAgentId(payload.agentId);
      setAssignedAgentName((payload as any).agentName || 'Agent Support');
      if (typeof window !== 'undefined') {
        localStorage.setItem('swish_customer_chat_id', payload.chatId);
      }
    });

    client.on('chat:sync', (payload) => {
      setChatId(payload.chatId);
      setSessionState(payload.status === 'CLOSED' ? 'CLOSED' : payload.status === 'WAITING' ? 'QUEUED' : 'ACTIVE');
      if (payload.agentId) setAssignedAgentId(payload.agentId);
      if (payload.agentName) setAssignedAgentName(payload.agentName);
      if (payload.messages && Array.isArray(payload.messages)) {
        setMessages(payload.messages as any);
      }
      if (payload.status === 'CLOSED' && typeof window !== 'undefined') {
        localStorage.removeItem('swish_customer_chat_id');
      }
    });

    client.on('chat:rejoin_failed', () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('swish_customer_chat_id');
      }
      setSessionState('IDLE');
      setChatId(null);
    });

    client.on('chat:message', (payload) => {
      setMessages((prev) => {
        const existingIndex = prev.findIndex(
          (m: any) =>
            (payload.id && m.id === payload.id) ||
            (payload.clientTempId && m.clientTempId === payload.clientTempId) ||
            (m.text === payload.text && (payload.imageUrl ? m.imageUrl === payload.imageUrl : true) && Math.abs(new Date(m.sentAt).getTime() - new Date(payload.sentAt).getTime()) < 4000)
        );
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            id: payload.id || updated[existingIndex].id,
            sentAt: payload.sentAt || updated[existingIndex].sentAt,
            imageUrl: payload.imageUrl || updated[existingIndex].imageUrl,
            messageType: payload.messageType || updated[existingIndex].messageType,
          };
          return updated;
        }
        return [
          ...prev,
          {
            id: payload.id,
            clientTempId: payload.clientTempId,
            senderType: payload.senderType as any,
            messageType: payload.messageType,
            text: payload.text,
            imageUrl: payload.imageUrl,
            sentAt: payload.sentAt,
          },
        ];
      });
    });

    client.on('chat:closed', () => {
      setSessionState('CLOSED');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('swish_customer_chat_id');
      }
    });
  };

  useEffect(() => {
    const initCustomer = async () => {
      let resolvedCustId = 'cust-guest';
      try {
        const res = await api.auth.getMe();
        if (res?.user) {
          resolvedCustId = res.user.id;
          setCustomerId(res.user.id);
          setCustomerName(res.user.name || res.user.email || 'Customer');
          if (res.user.avatarUrl) {
            setCustomerAvatar(res.user.avatarUrl);
          }
        }
      } catch {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('swish_customer_id') : null;
        if (stored) {
          resolvedCustId = stored;
          setCustomerId(stored);
        } else {
          resolvedCustId = `cust-${Math.random().toString(36).slice(2, 8)}`;
          setCustomerId(resolvedCustId);
          if (typeof window !== 'undefined') {
            localStorage.setItem('swish_customer_id', resolvedCustId);
          }
        }
      }

      const activeChatId = typeof window !== 'undefined' ? localStorage.getItem('swish_customer_chat_id') : null;
      if (activeChatId) {
        const token = getStoredToken() || undefined;
        const client = createSocketClient({
          role: 'CUSTOMER',
          userId: resolvedCustId,
          token,
        });
        setSocket(client);
        bindSocketEvents(client);
        setChatId(activeChatId);
        setSessionState('ACTIVE');
        client.emit('chat:rejoin', { chatId: activeChatId });
      }
    };

    initCustomer();
  }, []);

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    const initialText = prompt.trim() || `Issue: ${selectedTag}`;

    const token = getStoredToken() || undefined;
    const client = createSocketClient({
      role: 'CUSTOMER',
      userId: customerId,
      token,
    });

    setSocket(client);
    setSessionState('QUEUED');
    bindSocketEvents(client);

    client.emit('chat:new', { customerId });

    if (initialText) {
      const sentAt = new Date().toISOString();
      const clientTempId = 'cust-msg-' + Math.random().toString(36).slice(2, 9);
      setMessages([
        {
          id: clientTempId,
          clientTempId,
          senderType: 'CUSTOMER',
          text: initialText,
          sentAt,
        },
      ]);
      client.once('chat:assigned', (payload) => {
        client.emit('chat:message', {
          id: clientTempId,
          clientTempId,
          chatId: payload.chatId,
          senderType: 'CUSTOMER',
          text: initialText,
          sentAt,
        });
      });
      client.once('chat:queued', (payload) => {
        client.emit('chat:message', {
          id: clientTempId,
          clientTempId,
          chatId: payload.chatId,
          senderType: 'CUSTOMER',
          text: initialText,
          sentAt,
        });
      });
    }
  };

  const handleSendMessage = () => {
    const trimmed = inputText.trim();
    const uploadedUrl = pendingImage?.uploadedUrl;
    if ((!trimmed && !uploadedUrl) || isUploading || !chatId || !socket?.connected) return;

    const sentAt = new Date().toISOString();
    const clientTempId = 'cust-msg-' + Math.random().toString(36).slice(2, 9);
    const messageType = uploadedUrl ? 'IMAGE' : 'TEXT';

    socket.emit('chat:message', {
      id: clientTempId,
      clientTempId,
      chatId,
      senderType: 'CUSTOMER',
      messageType,
      text: trimmed,
      imageUrl: uploadedUrl,
      sentAt,
    });

    setMessages((prev) => [
      ...prev,
      {
        id: clientTempId,
        clientTempId,
        senderType: 'CUSTOMER',
        messageType,
        text: trimmed,
        imageUrl: uploadedUrl,
        sentAt,
      },
    ]);

    setInputText('');
    if (pendingImage?.previewUrl) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }
    setPendingImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    if (chatId && socket?.connected) {
      socket.emit('chat:closed', { chatId });
    }
    if (socket) {
      socket.disconnect();
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('swish_customer_chat_id');
    }
    setChatId(null);
    setSessionState('IDLE');
    setMessages([]);
    setPrompt('');
    setInputText('');
    setAssignedAgentName(null);
    setAssignedAgentId(null);
    setSocket(null);
  };


  return (
    <div className="min-h-dvh w-full max-w-full flex flex-col bg-[#F8FAFC] text-[#0F172A] overflow-x-hidden">
      <AppHeader />

      <main className="flex-1 w-full max-w-full min-w-0 px-3 py-3 sm:p-5 md:p-6 flex flex-col items-center justify-center overflow-y-auto">
        {sessionState === 'IDLE' ? (
          <div className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-7 shadow-xs space-y-6 my-auto min-w-0">
            <div className="flex items-center gap-3.5">
              <div className="size-12 rounded-full relative overflow-hidden bg-[#EFF6FF] border border-[#BFDBFE] shrink-0">
                <Image
                  src={customerAvatar}
                  alt={customerName}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-[#0F172A] truncate">
                  Hello, {customerName}
                </h1>
                <p className="text-xs text-[#64748B] truncate">
                  Connect live with our fast dedicated support team
                </p>
              </div>
            </div>

            <form onSubmit={handleStartChat} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-2">
                  What can we help you with?
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ISSUE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        selectedTag === tag
                          ? 'bg-[#2563EB] text-white shadow-xs'
                          : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5">
                  Describe the issue
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Tell us details about ${selectedTag.toLowerCase()}...`}
                  rows={3}
                  className="w-full min-w-0 bg-white border-[#E2E8F0] text-[#0F172A] focus:border-[#2563EB] rounded-xl text-xs box-border"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] font-semibold text-xs text-white shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <Headphones className="size-4" />
                <span>Start Live Chat Support</span>
              </Button>
            </form>

            <div className="border-t border-[#E2E8F0] pt-3.5 flex items-center justify-between text-xs text-[#64748B]">
              <span className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs">
                <Clock className="size-3.5 text-[#2563EB] shrink-0" />
                <span>Live Agent Assignment</span>
              </span>
              <span className="font-semibold text-emerald-600 text-[11px] sm:text-xs">
                Instant Response
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-2xl h-[84vh] min-h-[500px] bg-white border border-[#E2E8F0] rounded-2xl shadow-sm flex flex-col overflow-hidden my-auto relative">
            {/* Lightbox for clicked attachments */}
            <ImageLightbox
              src={lightboxUrl}
              onClose={() => setLightboxUrl(null)}
            />

            <header className="flex h-14 items-center justify-between border-b border-[#E2E8F0] px-3.5 sm:px-5 shrink-0 bg-white gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-9 rounded-full relative overflow-hidden bg-[#EFF6FF] border border-[#BFDBFE] shrink-0">
                  <Image
                    src={sessionState === 'ACTIVE' ? '/avatars/avatar-2.png' : customerAvatar}
                    alt="Agent"
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs sm:text-sm font-semibold text-[#0F172A] truncate max-w-[130px] sm:max-w-[240px]">
                      {sessionState === 'ACTIVE'
                        ? assignedAgentName || 'Agent Support'
                        : sessionState === 'QUEUED'
                        ? 'Priority Support Line'
                        : 'Session Closed'}
                    </h2>

                    {sessionState === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold shrink-0">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Live</span>
                      </span>
                    ) : sessionState === 'QUEUED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold shrink-0">
                        <Loader2 className="size-3 animate-spin text-amber-600" />
                        <span>Matching</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-semibold shrink-0">
                        <span>Resolved</span>
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] font-mono text-[#94A3B8] truncate">
                    {chatId ? `Session ID: ${chatId.slice(0, 8)}` : 'Connecting...'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetChat}
                className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 border border-[#E2E8F0] text-xs font-medium text-[#475569] transition-all cursor-pointer shrink-0"
              >
                <RotateCcw className="size-3.5 shrink-0" />
                <span>End</span>
              </button>
            </header>

            {sessionState === 'QUEUED' && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs text-amber-800">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-amber-600 shrink-0" />
                  <span>You are #1 in line. Assigning to the next available specialist...</span>
                </span>
                <span className="font-semibold">&lt; 15s</span>
              </div>
            )}

            {sessionState === 'CLOSED' && (
              <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3 flex items-center justify-between text-xs text-emerald-800">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>This chat has been resolved and closed by your support agent.</span>
                </span>
                <button
                  type="button"
                  onClick={handleResetChat}
                  className="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 cursor-pointer"
                >
                  New Request
                </button>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 bg-[#F8FAFC]">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center p-8 text-center text-[#94A3B8] h-48">
                  <MessageSquare className="size-8 mb-2 opacity-50 text-[#2563EB]" />
                  <p className="text-xs">Your support chat is ready. Send a message to start.</p>
                </div>
              )}

              {messages.map((m, idx) => {
                const isCustomer = m.senderType === 'CUSTOMER';
                const avatar = isCustomer ? customerAvatar : '/avatars/avatar-2.png';
                const senderTitle = isCustomer ? 'You' : assignedAgentName || 'Support Agent';

                return (
                  <div
                    key={idx}
                    className={`flex gap-2 items-end max-w-[88%] sm:max-w-[80%] ${
                      isCustomer ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'
                    }`}
                  >
                    <div className="size-7 rounded-full relative overflow-hidden bg-white border border-[#E2E8F0] shrink-0 mb-1">
                      <Image
                        src={avatar}
                        alt={senderTitle}
                        fill
                        sizes="28px"
                        className="object-cover"
                      />
                    </div>

                    <div className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-mono text-[#94A3B8]">
                        <span>{senderTitle}</span>
                        <span>•</span>
                        <span>{new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {/* Image Attachment Preview */}
                      {m.imageUrl && (
                        <div
                          onClick={() => setLightboxUrl(m.imageUrl || null)}
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

                      {/* Text Bubble */}
                      {m.text && (
                        <div
                          className={`rounded-2xl px-3.5 py-2 text-xs md:text-sm leading-relaxed break-words shadow-2xs ${
                            isCustomer
                              ? 'bg-[#2563EB] text-white rounded-br-xs font-normal'
                              : 'bg-white text-[#0F172A] border border-[#E2E8F0] rounded-bl-xs'
                          }`}
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

            <div className="border-t border-[#E2E8F0] p-3 sm:p-3.5 bg-white shrink-0 space-y-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {CANNED_CUSTOMER_QUERIES.map((query, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={sessionState === 'CLOSED'}
                    onClick={() => setInputText(query)}
                    className="text-[11px] font-medium whitespace-nowrap rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 text-[#475569] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] hover:text-[#2563EB] transition-all shrink-0 cursor-pointer disabled:opacity-40"
                  >
                    {query}
                  </button>
                ))}
              </div>

              {/* Pending Upload Preview */}
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

              <div className="flex items-end gap-2">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <Textarea
                  value={inputText}
                  disabled={sessionState === 'CLOSED'}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    sessionState === 'CLOSED'
                      ? 'Chat has been closed. Click End to start a new chat.'
                      : 'Type your message (Press Enter to send)...'
                  }
                  className="min-h-[56px] bg-white border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8] rounded-xl text-xs p-2.5 focus:border-[#2563EB] disabled:bg-slate-50"
                />

                {/* Attach Image Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || sessionState === 'CLOSED'}
                  title="Attach image (JPEG, PNG, WEBP, GIF up to 5MB)"
                  className="h-10 w-10 flex items-center justify-center rounded-xl border border-[#E2E8F0] hover:border-blue-300 hover:bg-blue-50/70 text-slate-600 hover:text-blue-600 transition-colors shrink-0 disabled:opacity-40 cursor-pointer"
                >
                  <ImagePlus className="size-4" />
                </button>

                <Button
                  onClick={handleSendMessage}
                  disabled={
                    (!inputText.trim() && !pendingImage?.uploadedUrl) ||
                    isUploading ||
                    sessionState === 'CLOSED'
                  }
                  className="h-10 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white shrink-0 shadow-xs disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="size-3.5" />
                  <span className="text-xs font-semibold">Send</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
