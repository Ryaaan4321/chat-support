'use client';

import React, { useEffect, useRef } from 'react';
import { CannedResponseItem } from '@/lib/slash-command';
import { Command, CornerDownLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlashCommandMenuProps {
  isOpen: boolean;
  query: string;
  items: CannedResponseItem[];
  selectedIndex: number;
  onSelect: (item: CannedResponseItem) => void;
  onClose: () => void;
}

export function SlashCommandMenu({
  isOpen,
  query,
  items,
  selectedIndex,
  onSelect,
  onClose,
}: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Keep highlighted item scrolled into view
  useEffect(() => {
    if (isOpen && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [selectedIndex, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      role="listbox"
      aria-label="Canned Responses"
      className="absolute bottom-full mb-2 left-0 right-0 sm:right-auto sm:w-[420px] max-w-[calc(100vw-24px)] bg-white rounded-xl border border-[#E2E8F0] shadow-xl overflow-hidden z-40 animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs text-[#64748B]">
        <div className="flex items-center gap-1.5 font-medium text-[#0F172A]">
          <Sparkles className="size-3.5 text-blue-600" />
          <span>Canned Responses</span>
          {query && (
            <span className="text-[11px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
              /{query}
            </span>
          )}
        </div>
        <span className="text-[11px] text-[#94A3B8]">
          {items.length} {items.length === 1 ? 'match' : 'matches'}
        </span>
      </div>

      {/* Item list */}
      <div className="max-h-[260px] overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-100/60 scrollbar-thin">
        {items.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#94A3B8]">
            No canned responses match <span className="font-mono text-[#0F172A]">/{query}</span>
          </div>
        ) : (
          items.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={item.id || item.shortcut}
                ref={isSelected ? activeItemRef : null}
                type="button"
                onClick={() => onSelect(item)}
                onMouseEnter={() => {}}
                className={cn(
                  'w-full text-left px-2.5 py-2 rounded-lg transition-all flex flex-col gap-0.5 cursor-pointer select-none',
                  isSelected
                    ? 'bg-blue-50/90 text-[#0F172A] ring-1 ring-blue-300/60 shadow-2xs'
                    : 'hover:bg-slate-50 text-[#334155]'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0',
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      )}
                    >
                      /{item.shortcut}
                    </span>
                    <span className="text-xs font-semibold truncate text-[#0F172A]">
                      {item.title}
                    </span>
                  </div>

                  {item.category && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-[#64748B] shrink-0">
                      {item.category}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[#64748B] line-clamp-1 mt-0.5 pl-0.5">
                  {item.text}
                </p>
              </button>
            );
          })
        )}
      </div>

      {/* Keyboard hints footer */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#F8FAFC] border-t border-[#E2E8F0] text-[10px] text-[#94A3B8] select-none">
        <span className="flex items-center gap-1">
          <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-mono">↑</kbd>
          <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-mono">↓</kbd>
          <span>navigate</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-mono flex items-center gap-0.5">
            <CornerDownLeft className="size-2.5" /> Enter
          </kbd>
          <span>or</span>
          <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-mono">Tab</kbd>
          <span>insert</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-mono">Esc</kbd>
          <span>close</span>
        </span>
      </div>
    </div>
  );
}
