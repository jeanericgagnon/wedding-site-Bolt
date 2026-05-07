import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MAX_DASHBOARD_MESSAGES,
  MAX_MESSAGE_DELIVERY_MESSAGE_IDS,
  MAX_MESSAGE_DELIVERY_ROWS,
  MAX_MESSAGE_GUESTS,
  MAX_MESSAGE_ITINERARY_EVENTS,
  MAX_MESSAGE_ITINERARY_EVENT_INVITATIONS,
} from './messageService';

describe('message service query bounds', () => {
  it('exports stable delivery query caps', () => {
    expect(MAX_MESSAGE_DELIVERY_MESSAGE_IDS).toBe(50);
    expect(MAX_MESSAGE_DELIVERY_ROWS).toBe(1000);
  });

  it('exports stable itinerary audience query caps', () => {
    expect(MAX_MESSAGE_ITINERARY_EVENTS).toBe(200);
    expect(MAX_MESSAGE_ITINERARY_EVENT_INVITATIONS).toBe(10000);
  });

  it('exports stable dashboard list query caps', () => {
    expect(MAX_DASHBOARD_MESSAGES).toBe(1000);
    expect(MAX_MESSAGE_GUESTS).toBe(5000);
  });

  it('keeps delivery history reads bounded for dashboard usage', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/messages/messageService.ts'), 'utf8');

    expect(source).toContain('const scopedMessageIds = Array.from(new Set(messageIds)).slice(0, MAX_MESSAGE_DELIVERY_MESSAGE_IDS);');
    expect(source).toContain(".in('message_id', scopedMessageIds)");
    expect(source).toContain('.limit(MAX_MESSAGE_DELIVERY_ROWS);');
  });

  it('keeps itinerary audience reads bounded for dashboard usage', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/messages/messageService.ts'), 'utf8');

    expect(source).toContain('.limit(MAX_MESSAGE_ITINERARY_EVENTS);');
    expect(source).toContain('.limit(MAX_MESSAGE_ITINERARY_EVENT_INVITATIONS);');
  });

  it('keeps dashboard message and guest list reads bounded', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/messages/messageService.ts'), 'utf8');

    expect(source).toContain('.limit(MAX_DASHBOARD_MESSAGES);');
    expect(source).toContain('.limit(MAX_MESSAGE_GUESTS);');
  });
});
