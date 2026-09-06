'use client';

import React, { useEffect, useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt = 'Attached image', onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!src) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [src, onClose]);

  useEffect(() => {
    setScale(1);
    setIsLoading(true);
  }, [src]);

  if (!src) return null;

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((s) => Math.min(s + 0.25, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((s) => Math.max(s - 0.25, 0.5));
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200"
    >
      {/* Controls toolbar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 flex items-center gap-2 bg-slate-900/90 border border-slate-700/60 rounded-full px-3 py-1.5 text-white shadow-xl z-10"
      >
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={scale <= 0.5}
          title="Zoom out"
          className="p-1 hover:text-blue-400 disabled:opacity-40 transition-colors cursor-pointer"
        >
          <ZoomOut className="size-4" />
        </button>
        <span className="text-xs font-mono select-none px-1 text-slate-300">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={scale >= 3}
          title="Zoom in"
          className="p-1 hover:text-blue-400 disabled:opacity-40 transition-colors cursor-pointer"
        >
          <ZoomIn className="size-4" />
        </button>
        {scale !== 1 && (
          <button
            type="button"
            onClick={handleResetZoom}
            title="Reset zoom"
            className="p-1 hover:text-blue-400 transition-colors cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
          </button>
        )}
        <div className="h-4 w-px bg-slate-700 mx-1" />
        <a
          href={src}
          download="chat-image"
          target="_blank"
          rel="noopener noreferrer"
          title="Open in new tab / Download"
          className="p-1 hover:text-emerald-400 transition-colors cursor-pointer"
        >
          <Download className="size-4" />
        </a>
        <button
          type="button"
          onClick={onClose}
          title="Close (Esc)"
          className="p-1 hover:text-rose-400 transition-colors cursor-pointer ml-1"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Image container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-full max-h-[88vh] overflow-auto flex items-center justify-center select-none"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center min-w-[200px] min-h-[200px]">
            <div className="size-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoading(false)}
          style={{ transform: `scale(${scale})`, transition: 'transform 0.15s ease-out' }}
          className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl origin-center"
        />
      </div>
    </div>
  );
}
