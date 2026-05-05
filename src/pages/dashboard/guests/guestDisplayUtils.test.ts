import { describe, expect, it } from 'vitest';
import {
  formatCustomAnswers,
  getAuditActionTone,
  getAuditGuestLabel,
  parseRsvpEventSelections,
  summarizeAuditEntry,
} from './guestDisplayUtils';

describe('guestDisplayUtils', () => {
  it('summarizes guest audit updates without leaking raw row objects', () => {
    expect(summarizeAuditEntry({
      action: 'update',
      old_data: { rsvp_status: 'pending', email: 'old@example.com' },
      new_data: { rsvp_status: 'confirmed', email: 'new@example.com' },
    })).toBe('RSVP status: pending → confirmed · Email: old@example.com → new@example.com');
  });

  it('keeps audit labels and tones stable after extraction', () => {
    expect(getAuditActionTone('delete')).toContain('bg-surface-subtle');
    expect(getAuditGuestLabel({
      action: 'delete',
      old_data: { first_name: 'Alex', last_name: 'Rivera' },
      new_data: null,
    })).toBe('Alex Rivera');
  });

  it('parses stored ceremony/reception selections from RSVP notes', () => {
    expect(parseRsvpEventSelections('[Events ceremony: yes, reception: no]')).toEqual({
      ceremony: true,
      reception: false,
    });
  });

  it('formats custom answers for exports and audit display', () => {
    expect(formatCustomAnswers({
      q_song: 'At Last',
      q_food: ['Tacos', 'Cake'],
      empty: '',
    })).toBe('question_song: At Last | question_food: Tacos,Cake');
  });
});
