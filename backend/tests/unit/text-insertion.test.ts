import { describe, it, expect } from '@jest/globals';
import {
  detectSlashTrigger,
  replaceTextAtCursor,
} from '../../src/utils/slash-command';

describe('Cursor-Position-Aware Text Insertion', () => {
  describe('detectSlashTrigger', () => {
    it('detects slash trigger at the beginning of input', () => {
      const text = '/';
      const result = detectSlashTrigger(text, 1);
      expect(result.active).toBe(true);
      expect(result.query).toBe('');
      expect(result.slashIndex).toBe(0);
    });

    it('detects slash trigger with query at the end of input', () => {
      const text = 'Hello /greet';
      const result = detectSlashTrigger(text, text.length);
      expect(result.active).toBe(true);
      expect(result.query).toBe('greet');
      expect(result.slashIndex).toBe(6);
    });

    it('detects slash trigger in the middle of text when cursor is inside the command', () => {
      const text = 'Hi /ord please check';
      // Cursor is right after "/ord" (index 7)
      const cursor = 'Hi /ord'.length;
      const result = detectSlashTrigger(text, cursor);
      expect(result.active).toBe(true);
      expect(result.query).toBe('ord');
      expect(result.slashIndex).toBe(3);
    });

    it('does NOT trigger on URLs containing slashes', () => {
      const text = 'Check https://example.com/order';
      const result = detectSlashTrigger(text, text.length);
      expect(result.active).toBe(false);
    });

    it('does NOT trigger if there is whitespace between slash and cursor', () => {
      const text = '/greet customer now';
      const result = detectSlashTrigger(text, text.length);
      expect(result.active).toBe(false);
    });

    it('does NOT trigger when cursor is at index 0 or before a slash', () => {
      const text = '/greet';
      const result = detectSlashTrigger(text, 0);
      expect(result.active).toBe(false);
    });
  });

  describe('replaceTextAtCursor', () => {
    const greeting = 'Hello! Thanks for reaching out to Swish support.';

    it('replaces single slash at the start of input and sets cursor offset', () => {
      const text = '/';
      const { newText, newCursorPosition } = replaceTextAtCursor(text, 1, greeting);
      expect(newText).toBe(greeting);
      expect(newCursorPosition).toBe(greeting.length);
    });

    it('replaces /query at the end of a sentence', () => {
      const text = 'Customer says hi, so /greet';
      const cursor = text.length;
      const { newText, newCursorPosition } = replaceTextAtCursor(text, cursor, greeting);
      expect(newText).toBe(`Customer says hi, so ${greeting}`);
      expect(newCursorPosition).toBe(`Customer says hi, so ${greeting}`.length);
    });

    it('replaces /query in the middle of existing text without overwriting surrounding text', () => {
      const text = 'First part /greet then follow up';
      const cursor = 'First part /greet'.length;
      const { newText, newCursorPosition } = replaceTextAtCursor(text, cursor, greeting);
      expect(newText).toBe(`First part ${greeting} then follow up`);
      expect(newCursorPosition).toBe(`First part ${greeting}`.length);
    });

    it('replaces partial query (e.g. /gr) at cursor position', () => {
      const text = 'Hello /gr please';
      const cursor = 'Hello /gr'.length;
      const { newText, newCursorPosition } = replaceTextAtCursor(text, cursor, greeting);
      expect(newText).toBe(`Hello ${greeting} please`);
      expect(newCursorPosition).toBe(`Hello ${greeting}`.length);
    });

    it('falls back to inserting at cursor if no slash trigger was active', () => {
      const text = 'Hello world';
      const cursor = 5; // right after "Hello"
      const { newText, newCursorPosition } = replaceTextAtCursor(text, cursor, ' there');
      expect(newText).toBe('Hello there world');
      expect(newCursorPosition).toBe(11);
    });
  });
});
