import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getMessageAccessToken,
  MAX_DASHBOARD_MESSAGES,
  MAX_MESSAGE_DELIVERY_MESSAGE_IDS,
  MAX_MESSAGE_DELIVERY_ROWS,
  MAX_MESSAGE_GUESTS,
  MAX_MESSAGE_ITINERARY_EVENTS,
  MAX_MESSAGE_ITINERARY_EVENT_INVITATIONS,
  MAX_SMS_CREDIT_TRANSACTIONS,
  triggerDashboardBulkSend,
  triggerScheduledMessageDispatch,
} from './messageService';

const { getSessionMock, rpcMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
    from: vi.fn(),
    rpc: rpcMock,
  },
}));

describe('message service query bounds', () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    rpcMock.mockReset();
    vi.unstubAllGlobals();
  });

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
    expect(MAX_SMS_CREDIT_TRANSACTIONS).toBe(20);
  });

  it('keeps delivery history reads bounded for dashboard usage', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/messages/messageService.ts'), 'utf8');

    expect(source).toContain("'guest_id'");
    expect(source).toContain('const scopedMessageIds = Array.from(new Set(messageIds)).slice(0, MAX_MESSAGE_DELIVERY_MESSAGE_IDS);');
    expect(source).toContain(".in('message_id', scopedMessageIds)");
    expect(source).toContain('.limit(MAX_MESSAGE_DELIVERY_ROWS);');
  });

  it('keeps focused retry and exclusion filters inside the send-bulk runtime', () => {
    const source = readFileSync(join(process.cwd(), 'supabase/functions/send-bulk-message/index.ts'), 'utf8');

    expect(source).toContain('retry_guest_ids');
    expect(source).toContain('excluded_guest_ids');
    expect(source).toContain('const scopedGuests = allGuests');
    expect(source).toContain('const eligibleGuests = scopedGuests.filter');
    expect(source).toContain('const skippedGuests = scopedGuests.filter');
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
    expect(source).toContain('.limit(MAX_SMS_CREDIT_TRANSACTIONS);');
    expect(source).toContain(".from('rsvps')");
    expect(source).toContain(".select('guest_id, meal_choice')");
    expect(source).toContain('mergeGuestsWithCanonicalMealChoices');
  });

  it('routes dashboard message writes through RPCs', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/messages/messageService.ts'), 'utf8');

    expect(source).toContain("supabase.rpc('dashboard_message_write'");
    expect(source).not.toContain("supabase.from('messages').insert(payload)");
    expect(source).not.toContain(".from('messages')\n    .update(patch)");
  });

  it('loads the bulk-send auth token through the message service', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'token-123' } } });

    await expect(getMessageAccessToken()).resolves.toBe('token-123');
  });

  it('routes dashboard bulk send through the message service', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'token-123' } } });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ delivered: 3, failed: 0, total: 3, status: 'sent' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(triggerDashboardBulkSend('message-1')).resolves.toEqual({
      delivered: 3,
      failed: 0,
      total: 3,
      status: 'sent',
    });
  });

  it('routes scheduled dispatch through the message service', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'token-123' } } });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ processed: 2, sent: 1, failed: 0, partial: 0, skippedMessages: 0, skippedRecipients: 1 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(triggerScheduledMessageDispatch(12)).resolves.toEqual({
      processed: 2,
      sent: 1,
      failed: 0,
      partial: 0,
      skippedMessages: 0,
      skippedRecipients: 1,
    });
  });
});
