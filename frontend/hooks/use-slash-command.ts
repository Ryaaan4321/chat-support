'use client';

import { useState, useEffect, useCallback, RefObject } from 'react';
import {
  CannedResponseItem,
  DEFAULT_CANNED_RESPONSES,
  detectSlashTrigger,
  filterCannedResponses,
  replaceTextAtCursor,
} from '@/lib/slash-command';
import { api } from '@/lib/api';

interface UseSlashCommandOptions {
  text: string;
  setText: (newText: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  customResponses?: CannedResponseItem[];
}

export function useSlashCommand({
  text,
  setText,
  textareaRef,
  customResponses,
}: UseSlashCommandOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [responses, setResponses] = useState<CannedResponseItem[]>(
    customResponses || DEFAULT_CANNED_RESPONSES
  );

  // Load from database if available, fall back cleanly
  useEffect(() => {
    let isMounted = true;
    api.chats
      .getCannedResponses()
      .then((res) => {
        if (isMounted && res?.cannedResponses && res.cannedResponses.length > 0) {
          setResponses(res.cannedResponses);
        }
      })
      .catch(() => {
        // Keep default responses
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredItems = filterCannedResponses(responses, query);

  // Keep selected index within bounds when filtered results change
  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(Math.max(0, filteredItems.length - 1));
    }
  }, [filteredItems.length, selectedIndex]);

  const checkTrigger = useCallback(
    (currentText: string, cursorPosition: number) => {
      const trigger = detectSlashTrigger(currentText, cursorPosition);
      if (trigger.active) {
        setIsOpen(true);
        setQuery(trigger.query);
      } else {
        setIsOpen(false);
        setQuery('');
      }
    },
    []
  );

  const selectItem = useCallback(
    (item: CannedResponseItem) => {
      const textarea = textareaRef.current;
      const cursor = textarea?.selectionStart ?? text.length;

      const { newText, newCursorPosition } = replaceTextAtCursor(
        text,
        cursor,
        item.text
      );

      setText(newText);
      setIsOpen(false);
      setQuery('');

      // Restore focus and position cursor right after inserted text
      requestAnimationFrame(() => {
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      });
    },
    [text, setText, textareaRef]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (!isOpen || filteredItems.length === 0) {
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
        return false;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
        return true;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
        return true;
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredItems[selectedIndex];
        if (selected) {
          selectItem(selected);
        }
        return true;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return true;
      }

      return false;
    },
    [isOpen, filteredItems, selectedIndex, selectItem]
  );

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    query,
    selectedIndex,
    filteredItems,
    responses,
    selectItem,
    closeMenu,
    handleKeyDown,
    checkTrigger,
  };
}
