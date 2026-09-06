import { describe, it, expect } from '@jest/globals';
import {
  filterCannedResponses,
  DEFAULT_CANNED_RESPONSES,
  CannedResponseItem,
} from '../../src/utils/slash-command';

describe('Slash Command Filtering Logic', () => {
  const sampleResponses: CannedResponseItem[] = [
    { shortcut: 'greet', title: 'Greeting Customer', category: 'General', text: 'Hello! How can I help you?' },
    { shortcut: 'order', title: 'Order Inquiries', category: 'Orders', text: 'Looking into your order now.' },
    { shortcut: 'refund', title: 'Refund Policy', category: 'Billing', text: 'Refund has been issued to your card.' },
    { shortcut: 'address', title: 'Change Delivery Address', category: 'Delivery', text: 'Address updated successfully.' },
    { shortcut: 'bye', title: 'Closing conversation', category: 'General', text: 'Have a great day!' },
  ];

  it('returns all canned responses when query is empty or just "/"', () => {
    expect(filterCannedResponses(sampleResponses, '')).toHaveLength(5);
    expect(filterCannedResponses(sampleResponses, '/')).toHaveLength(5);
    expect(filterCannedResponses(sampleResponses, '   ')).toHaveLength(5);
  });

  it('filters accurately by shortcut prefix (e.g. /gr -> greet)', () => {
    const results = filterCannedResponses(sampleResponses, '/gr');
    expect(results).toHaveLength(1);
    expect(results[0].shortcut).toBe('greet');
  });

  it('filters case-insensitively (e.g. /ORDER -> order)', () => {
    const results = filterCannedResponses(sampleResponses, '/ORDER');
    expect(results).toHaveLength(1);
    expect(results[0].shortcut).toBe('order');
  });

  it('matches by title or category if shortcut does not match', () => {
    const results = filterCannedResponses(sampleResponses, 'Billing');
    expect(results).toHaveLength(1);
    expect(results[0].shortcut).toBe('refund');

    const addressResults = filterCannedResponses(sampleResponses, 'Delivery');
    expect(addressResults).toHaveLength(1);
    expect(addressResults[0].shortcut).toBe('address');
  });

  it('matches text content inside the response body', () => {
    const results = filterCannedResponses(sampleResponses, 'card');
    expect(results).toHaveLength(1);
    expect(results[0].shortcut).toBe('refund');
  });

  it('returns empty array when no responses match the query', () => {
    const results = filterCannedResponses(sampleResponses, 'nonexistentquery123');
    expect(results).toHaveLength(0);
  });

  it('places shortcut prefix matches before body/category matches', () => {
    const items: CannedResponseItem[] = [
      { shortcut: 'help', title: 'Generic assistance', category: 'Support', text: 'We offer support here' },
      { shortcut: 'support', title: 'Help desk', category: 'Desk', text: 'Contact help desk' },
    ];
    const results = filterCannedResponses(items, 'support');
    expect(results[0].shortcut).toBe('support');
  });
});
