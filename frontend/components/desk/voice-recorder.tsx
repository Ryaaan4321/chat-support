'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onSendVoiceNote: (audioFile: File) => void;
  onCancel: () => void;
  isUploading?: boolean;
}

export function VoiceRecorder({
  onSendVoiceNote,
  onCancel,
  isUploading = false,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Auto-start recording on mount
  useEffect(() => {
    startRecording();
    return () => {
      cleanupStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg')
        ? 'audio/ogg'
        : '';

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });
        setAudioBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setAudioUrl(url);
      };

      mediaRecorder.start(200);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('[VoiceRecorder] microphone error:', err);
      setMicError(
        err?.message?.includes('Permission')
          ? 'Microphone permission denied. Please allow mic access.'
          : err?.message || 'Unable to access microphone.'
      );
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      cleanupStream();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSend = () => {
    if (!audioBlob) return;
    const extension = audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
    const audioFile = new File(
      [audioBlob],
      `voice_note_${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`,
      { type: audioBlob.type || 'audio/webm' }
    );
    onSendVoiceNote(audioFile);
  };

  const handleCancel = () => {
    stopRecording();
    cleanupStream();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    onCancel();
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatSecs = (total: number) => {
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (micError) {
    return (
      <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-4 text-rose-600 shrink-0" />
          <span>{micError}</span>
        </div>
        <button
          type="button"
          onClick={handleCancel}
          className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 font-semibold cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-2.5 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-150 gap-3">
      {/* Recording in progress */}
      {isRecording ? (
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative flex items-center justify-center size-8 rounded-full bg-rose-600/20 text-rose-500 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-60" />
            <Mic className="size-4 text-rose-500 relative" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                Recording voice note...
              </span>
              <span className="font-mono text-xs text-rose-400 font-semibold">
                {formatSecs(recordingSeconds)}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Speak clearly into your microphone
            </p>
          </div>
        </div>
      ) : (
        /* Stopped, previewing audio */
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {audioUrl && (
            <audio
              ref={audioPlayerRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          )}
          <button
            type="button"
            onClick={togglePlayback}
            className="size-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-xs"
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
          </button>

          <div className="min-w-0">
            <span className="text-xs font-bold text-white">
              Voice note ready ({formatSecs(recordingSeconds)})
            </span>
            <p className="text-[10px] text-slate-400">
              Listen to preview or click send
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleCancel}
          title="Discard voice note"
          className="size-8 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-colors"
        >
          <Trash2 className="size-4" />
        </button>

        {isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
          >
            <Square className="size-3 fill-current" />
            <span>Done</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
          >
            <Send className="size-3" />
            <span>{isUploading ? 'Sending...' : 'Send Voice Note'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
