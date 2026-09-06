export interface CannedResponseItem {
  id?: string;
  shortcut: string;
  title: string;
  text: string;
  category?: string;
}

export const DEFAULT_CANNED_RESPONSES: CannedResponseItem[] = [
  {
    shortcut: 'greet',
    title: 'Warm Greeting',
    category: 'Greeting',
    text: 'Hello! Thanks for reaching out to Swish support. How can I assist you today?',
  },
  {
    shortcut: 'order',
    title: 'Check Order Status',
    category: 'Order Status',
    text: 'Checking your order status right now. One moment please.',
  },
  {
    shortcut: 'id',
    title: 'Request Order ID',
    category: 'Order Status',
    text: 'Could you please provide your Order ID so I can pull up your account details?',
  },
  {
    shortcut: 'address',
    title: 'Update Address',
    category: 'Delivery',
    text: 'I have updated your delivery address with our logistics partner.',
  },
  {
    shortcut: 'delay',
    title: 'Apologize for Delay',
    category: 'Delivery',
    text: 'We sincerely apologize for the delay. Your order is with our courier and arriving as quickly as possible.',
  },
  {
    shortcut: 'refund',
    title: 'Refund Confirmation',
    category: 'Billing',
    text: 'A full refund has been initiated to your original payment method. It will reflect in 3-5 business days.',
  },
  {
    shortcut: 'escalate',
    title: 'Escalate to Specialist',
    category: 'Escalation',
    text: 'I am transferring your request to our priority escalation team for immediate follow-up.',
  },
  {
    shortcut: 'bye',
    title: 'Closing / Satisfaction',
    category: 'Closing',
    text: 'Is there anything else I can help you with today? Have a wonderful day!',
  },
];

export function filterCannedResponses(
  responses: CannedResponseItem[],
  query: string
): CannedResponseItem[] {
  const isExplicitSlash = query.startsWith('/');
  const clean = isExplicitSlash ? query.slice(1).trim().toLowerCase() : query.trim().toLowerCase();
  if (!clean) {
    return responses;
  }

  const shortcutPrefixMatches: CannedResponseItem[] = [];
  const shortcutSubMatches: CannedResponseItem[] = [];
  const titleMatches: CannedResponseItem[] = [];
  const bodyMatches: CannedResponseItem[] = [];

  for (const item of responses) {
    const shortcut = (item.shortcut || '').toLowerCase();
    const title = (item.title || '').toLowerCase();
    const body = (item.text || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();

    if (shortcut.startsWith(clean)) {
      shortcutPrefixMatches.push(item);
    } else if (shortcut.includes(clean)) {
      shortcutSubMatches.push(item);
    } else if (title.includes(clean) || cat.includes(clean)) {
      titleMatches.push(item);
    } else if (body.includes(clean)) {
      bodyMatches.push(item);
    }
  }

  // If user explicitly typed slash (e.g. /gr), prioritize shortcut and title matches over body text
  if (isExplicitSlash && (shortcutPrefixMatches.length > 0 || shortcutSubMatches.length > 0 || titleMatches.length > 0)) {
    return [...shortcutPrefixMatches, ...shortcutSubMatches, ...titleMatches];
  }

  return [...shortcutPrefixMatches, ...shortcutSubMatches, ...titleMatches, ...bodyMatches];
}

export interface SlashTriggerResult {
  active: boolean;
  query: string;
  slashIndex: number;
}

export function detectSlashTrigger(
  fullText: string,
  cursorPosition: number
): SlashTriggerResult {
  if (cursorPosition <= 0 || cursorPosition > fullText.length) {
    return { active: false, query: '', slashIndex: -1 };
  }

  const textBeforeCursor = fullText.slice(0, cursorPosition);
  const slashIndex = textBeforeCursor.lastIndexOf('/');

  if (slashIndex === -1) {
    return { active: false, query: '', slashIndex: -1 };
  }

  if (slashIndex > 0) {
    const prevChar = textBeforeCursor[slashIndex - 1];
    if (prevChar !== ' ' && prevChar !== '\n' && prevChar !== '\t' && prevChar !== '\r') {
      return { active: false, query: '', slashIndex: -1 };
    }
  }

  const queryPart = textBeforeCursor.slice(slashIndex + 1);

  if (/\s/.test(queryPart)) {
    return { active: false, query: '', slashIndex: -1 };
  }

  return {
    active: true,
    query: queryPart,
    slashIndex,
  };
}

export interface ReplaceTextResult {
  newText: string;
  newCursorPosition: number;
}

export function replaceTextAtCursor(
  fullText: string,
  cursorPosition: number,
  replacementText: string
): ReplaceTextResult {
  const trigger = detectSlashTrigger(fullText, cursorPosition);

  if (!trigger.active || trigger.slashIndex === -1) {
    const before = fullText.slice(0, cursorPosition);
    const after = fullText.slice(cursorPosition);
    return {
      newText: before + replacementText + after,
      newCursorPosition: cursorPosition + replacementText.length,
    };
  }

  const prefix = fullText.slice(0, trigger.slashIndex);
  const suffix = fullText.slice(cursorPosition);

  const newText = prefix + replacementText + suffix;
  const newCursorPosition = trigger.slashIndex + replacementText.length;

  return {
    newText,
    newCursorPosition,
  };
}
