import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MAX_RSVP_BOARD_EVENT_INVITATIONS,
  MAX_RSVP_BOARD_EVENTS,
  MAX_RSVP_BOARD_GUESTS,
  RSVP_BOARD_EVENT_INVITATION_SELECT,
  RSVP_BOARD_EVENT_SELECT,
  RSVP_BOARD_GUEST_SELECT,
} from './rsvpBoardService';

describe('rsvpBoardService', () => {
  it('exports stable RSVP board projections and query caps', () => {
    expect(RSVP_BOARD_GUEST_SELECT).toContain('rsvp_status');
    expect(RSVP_BOARD_GUEST_SELECT).toContain('reminder_last_sent_at');
    expect(RSVP_BOARD_GUEST_SELECT).not.toContain('*');
    expect(RSVP_BOARD_EVENT_SELECT).toBe('id');
    expect(RSVP_BOARD_EVENT_INVITATION_SELECT).toBe('event_id, guest_id');
    expect(MAX_RSVP_BOARD_GUESTS).toBe(2000);
    expect(MAX_RSVP_BOARD_EVENTS).toBe(200);
    expect(MAX_RSVP_BOARD_EVENT_INVITATIONS).toBe(10000);
  });

  it('keeps RSVP board guest, event, and invitation reads bounded', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/rsvpBoardService.ts'), 'utf8');

    expect(source).toContain('.limit(MAX_RSVP_BOARD_GUESTS);');
    expect(source).toContain('.limit(MAX_RSVP_BOARD_EVENTS);');
    expect(source).toContain('.limit(MAX_RSVP_BOARD_EVENT_INVITATIONS);');
  });
});
