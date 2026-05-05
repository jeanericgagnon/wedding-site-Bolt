import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEMO_MESSAGES_STORAGE_KEY,
  buildDemoMessageSeed,
  readDemoMessages,
  writeDemoMessages,
} from './messageDemoStorage';
import type { Message } from './messageDashboardTypes';

describe('message demo storage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('builds a stable demo message seed around the provided time', () => {
    const now = Date.parse('2026-05-04T18:00:00Z');

    expect(buildDemoMessageSeed(now)).toEqual([
      expect.objectContaining({
        id: 'demo-msg-1',
        status: 'sent',
        sent_at: '2026-05-01T18:00:00.000Z',
      }),
      expect.objectContaining({
        id: 'demo-msg-2',
        status: 'partial',
        sent_at: '2026-05-03T18:00:00.000Z',
      }),
      expect.objectContaining({
        id: 'demo-msg-3',
        status: 'scheduled',
        scheduled_for: '2026-05-05T04:00:00.000Z',
      }),
      expect.objectContaining({
        id: 'demo-msg-4',
        status: 'draft',
        sent_at: null,
      }),
    ]);
  });

  it('falls back to seeded demo messages when storage is empty, invalid, or blank', () => {
    vi.setSystemTime(new Date('2026-05-04T18:00:00Z'));

    expect(readDemoMessages()).toHaveLength(4);

    localStorage.setItem(DEMO_MESSAGES_STORAGE_KEY, '{broken');
    expect(readDemoMessages()).toHaveLength(4);

    localStorage.setItem(DEMO_MESSAGES_STORAGE_KEY, JSON.stringify([]));
    expect(readDemoMessages()).toHaveLength(4);

    vi.useRealTimers();
  });

  it('reads and writes stored demo message history', () => {
    const messages: Message[] = [
      {
        id: 'stored-message',
        subject: 'Stored',
        body: 'Saved history',
        sent_at: null,
        scheduled_for: null,
        status: 'draft',
        channel: 'email',
        recipient_filter: null,
        audience_filter: 'all',
      },
    ];

    writeDemoMessages(messages);

    expect(readDemoMessages()).toEqual(messages);
  });
});
