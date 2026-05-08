import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEMO_MESSAGES_RETENTION_MS,
  DEMO_MESSAGES_STORAGE_KEY,
  buildDemoMessageSeed,
  readDemoMessages,
  writeDemoMessages,
} from './messageDemoStorage';
import type { Message } from './messageDashboardTypes';

describe('message demo storage helpers', () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-04T18:00:00Z'));

    expect(readDemoMessages()).toHaveLength(4);

    localStorage.setItem(DEMO_MESSAGES_STORAGE_KEY, '{broken');
    expect(readDemoMessages()).toHaveLength(4);

    localStorage.setItem(DEMO_MESSAGES_STORAGE_KEY, JSON.stringify([]));
    expect(readDemoMessages()).toHaveLength(4);
  });

  it('reads and writes stored demo message history', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
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

    expect(readDemoMessages()).toEqual([{
      ...messages[0],
      recipient_count: null,
      delivered_count: null,
      failed_count: null,
    }]);
    expect(JSON.parse(localStorage.getItem(DEMO_MESSAGES_STORAGE_KEY) ?? '{}')).toMatchObject({
      savedAtISO: '2026-05-06T12:00:00.000Z',
      value: [{
        id: 'stored-message',
        subject: 'Stored',
      }],
    });
  });

  it('migrates active legacy demo message history into timestamped envelopes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    localStorage.setItem(DEMO_MESSAGES_STORAGE_KEY, JSON.stringify([{
      id: ' legacy-message ',
      subject: ' RSVP update ',
      body: ' Bring a jacket ',
      sent_at: null,
      scheduled_for: null,
      status: 'sent',
      channel: 'email',
      recipient_filter: { audience: 'all', recipient_count: 12.9, debug: 'drop me' },
      audience_filter: 'all',
      recipient_count: 12.9,
      delivered_count: 11.8,
      failed_count: 1.2,
    }]));

    expect(readDemoMessages()).toEqual([{
      id: 'legacy-message',
      subject: 'RSVP update',
      body: 'Bring a jacket',
      sent_at: null,
      scheduled_for: null,
      status: 'sent',
      channel: 'email',
      recipient_filter: { audience: 'all', recipient_count: 12 },
      audience_filter: 'all',
      recipient_count: 12,
      delivered_count: 11,
      failed_count: 1,
    }]);
    expect(JSON.parse(localStorage.getItem(DEMO_MESSAGES_STORAGE_KEY) ?? '{}')).toMatchObject({
      savedAtISO: '2026-05-06T12:00:00.000Z',
    });
  });

  it('removes stale demo message history envelopes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    localStorage.setItem(DEMO_MESSAGES_STORAGE_KEY, JSON.stringify({
      savedAtISO: new Date(Date.now() - DEMO_MESSAGES_RETENTION_MS - 1).toISOString(),
      value: [{
        id: 'old',
        subject: 'Old',
        body: 'Old body',
        sent_at: null,
        scheduled_for: null,
        status: 'draft',
        channel: 'email',
        recipient_filter: null,
        audience_filter: 'all',
      }],
    }));

    expect(readDemoMessages()).toHaveLength(4);
    expect(localStorage.getItem(DEMO_MESSAGES_STORAGE_KEY)).toBeNull();
  });

  it('bounds stored demo message rows and text', () => {
    const messages: Message[] = Array.from({ length: 30 }, (_, index) => ({
      id: `message-${index}`,
      subject: 'x'.repeat(220),
      body: 'y'.repeat(2200),
      sent_at: null,
      scheduled_for: null,
      status: 'provider-error',
      channel: 'push',
      recipient_filter: { audience: 'a'.repeat(220), recipient_count: 5.9, secret: 'drop me' },
      audience_filter: 'a'.repeat(220),
      recipient_count: 5.9,
      delivered_count: -1,
      failed_count: 2.3,
    }));

    writeDemoMessages(messages);
    const stored = readDemoMessages();
    expect(stored).toHaveLength(24);
    expect(stored[0]?.subject).toHaveLength(160);
    expect(stored[0]?.body).toHaveLength(2000);
    expect(stored[0]?.status).toBe('draft');
    expect(stored[0]?.channel).toBe('email');
    expect(stored[0]?.recipient_filter).toEqual({ audience: 'a'.repeat(160), recipient_count: 5 });
    expect(stored[0]?.recipient_count).toBe(5);
    expect(stored[0]?.delivered_count).toBe(0);
    expect(stored[0]?.failed_count).toBe(2);
  });
});
