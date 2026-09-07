'use client';

import React, { useState, useRef } from 'react';
import { Play, Pause, Maximize2, Volume2, Film } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaBubbleProps {
  mediaUrl: string;
  messageType?: 'IMAGE' | 'AUDIO' | 'VIDEO' | string;
  isAgent?: boolean;
  onExpandImage?: (url: string) => void;
}

export function MediaBubble({
  mediaUrl,
  messageType = 'IMAGE',
  isAgent = false,
  onExpandImage,
}: MediaBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // If detected type is AUDIO
  if (messageType === 'AUDIO') {
    const toggleAudio = () => {
      if (!audioRef.current) return;
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    };

    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        if ((!isFinite(duration) || duration <= 0) && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
          setDuration(audioRef.current.duration);
        }
      }
    };

    const handleLoadedMetadata = async () => {
      if (!audioRef.current) return;
      const audio = audioRef.current;
      const dur = audio.duration;

      if (!isFinite(dur) || isNaN(dur) || dur === Infinity) {
        // Chromium WebM Duration Bug Workaround:
        // Set currentTime to a huge number to force Chrome to calculate the stream end
        const onTimeUpdateWorkaround = () => {
          audio.removeEventListener('timeupdate', onTimeUpdateWorkaround);
          if (isFinite(audio.duration) && audio.duration > 0) {
            setDuration(audio.duration);
          }
          audio.currentTime = 0;
        };
        audio.addEventListener('timeupdate', onTimeUpdateWorkaround);
        audio.currentTime = 1e101;

        // Accurate AudioContext decoder fallback
        try {
          const res = await fetch(mediaUrl);
          const buf = await res.arrayBuffer();
          const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtxClass) {
            const ctx = new AudioCtxClass();
            const decoded = await ctx.decodeAudioData(buf);
            if (decoded && isFinite(decoded.duration) && decoded.duration > 0) {
              setDuration(decoded.duration);
            }
            ctx.close();
          }
        } catch {
          // Keep duration at 0 until user plays
        }
      } else {
        setDuration(dur);
      }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const targetTime = Number(e.target.value);
      if (audioRef.current) {
        audioRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
      }
    };

    const formatSecs = (sec: number) => {
      if (isNaN(sec) || !isFinite(sec) || sec < 0) return '0:00';
      const mins = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${mins}:${s.toString().padStart(2, '0')}`;
    };

    const hasKnownDuration = isFinite(duration) && duration > 0;

    return (
      <div
        className={cn(
          'flex items-center gap-2.5 p-2.5 rounded-2xl border shadow-xs mb-1 min-w-[220px] max-w-[280px]',
          isAgent
            ? 'bg-blue-600 text-white border-blue-500/50'
            : 'bg-white text-slate-800 border-slate-200'
        )}
      >
        <audio
          ref={audioRef}
          src={mediaUrl}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          className="hidden"
        />

        <button
          type="button"
          onClick={toggleAudio}
          className={cn(
            'size-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-95 shadow-xs',
            isAgent
              ? 'bg-white text-blue-600 hover:bg-blue-50'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          )}
        >
          {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5 ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="flex items-center gap-1 font-semibold">
              <Volume2 className="size-3" /> Voice Note
            </span>
            <span className={cn('opacity-80', isAgent ? 'text-blue-100' : 'text-slate-500')}>
              {formatSecs(currentTime)} {hasKnownDuration ? `/ ${formatSecs(duration)}` : ''}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={hasKnownDuration ? duration : Math.max(10, currentTime || 0)}
            value={currentTime}
            onChange={handleSeek}
            className={cn(
              'w-full h-1 rounded-lg appearance-none cursor-pointer',
              isAgent ? 'accent-white bg-blue-400' : 'accent-blue-600 bg-slate-200'
            )}
          />
        </div>
      </div>
    );
  }

  // If detected type is VIDEO
  if (messageType === 'VIDEO') {
    return (
      <div className="rounded-2xl overflow-hidden border border-slate-200/80 mb-1 max-w-[280px] sm:max-w-[320px] shadow-xs bg-slate-950">
        <div className="p-2 bg-slate-900/90 text-slate-300 text-[10px] flex items-center gap-1.5 font-mono">
          <Film className="size-3 text-blue-400" />
          <span className="font-semibold text-white">Video Attachment</span>
        </div>
        <video
          src={mediaUrl}
          controls
          preload="metadata"
          playsInline
          className="w-full max-h-64 object-contain bg-black"
        />
      </div>
    );
  }

  // Default: IMAGE
  return (
    <div
      onClick={() => onExpandImage?.(mediaUrl)}
      className="rounded-2xl overflow-hidden border border-slate-200/80 mb-1 cursor-pointer max-w-[260px] group relative hover:opacity-95 transition-all shadow-xs bg-slate-100"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mediaUrl}
        alt="Chat attachment"
        className="w-full max-h-56 object-cover group-hover:scale-102 transition-transform duration-150"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1">
          <Maximize2 className="size-3" /> Expand
        </span>
      </div>
    </div>
  );
}
