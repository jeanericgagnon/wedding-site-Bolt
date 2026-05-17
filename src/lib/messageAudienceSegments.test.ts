import { describe, expect, it } from 'vitest';
import { buildMessageAudienceOptions, filterMessageAudienceGuests, getMessageAudienceDetail } from './messageAudienceSegments';

const guests = [
  { id: 'guest-1', rsvp_status: 'pending', invitation_sent_at: null, reminder_last_sent_at: null },
  { id: 'guest-2', rsvp_status: 'pending', invitation_sent_at: '2026-04-01T10:00:00Z', reminder_last_sent_at: null },
  { id: 'guest-3', rsvp_status: 'pending', invitation_sent_at: '2026-04-01T10:00:00Z', reminder_last_sent_at: '2026-04-08T10:00:00Z' },
  {
    id: 'guest-4',
    rsvp_status: 'confirmed',
    invitation_sent_at: '2026-04-01T10:00:00Z',
    reminder_last_sent_at: null,
    meal_choice: 'Chicken',
    mailing_address_line1: '100 Main St',
    mailing_city: 'Sonoma',
    mailing_state: 'CA',
    mailing_postal_code: '95476',
  },
  { id: 'guest-5', rsvp_status: 'declined', invitation_sent_at: '2026-04-01T10:00:00Z', reminder_last_sent_at: null },
  {
    id: 'guest-6',
    preferred_language: 'es-MX',
    rsvp_status: 'confirmed',
    invitation_sent_at: '2026-04-01T10:00:00Z',
    reminder_last_sent_at: null,
    meal_choice: '',
    mailing_address_line1: '200 Pine St',
    mailing_city: '',
    mailing_state: 'CA',
    mailing_postal_code: '94103',
  },
];

describe('messageAudienceSegments', () => {
  it('builds operational invite lifecycle segment counts', () => {
    const options = buildMessageAudienceOptions(guests);
    const byValue = new Map(options.map((option) => [option.value, option.count]));

    expect(byValue.get('all')).toBe(6);
    expect(byValue.get('not_responded')).toBe(3);
    expect(byValue.get('invite_not_sent')).toBe(1);
    expect(byValue.get('invited_pending')).toBe(1);
    expect(byValue.get('reminder_sent_pending')).toBe(1);
    expect(byValue.get('attending')).toBe(2);
    expect(byValue.get('declined')).toBe(1);
    expect(byValue.get('missing_address')).toBe(5);
    expect(byValue.get('missing_meal')).toBe(1);
    expect(byValue.get('language:es')).toBe(1);
  });

  it('filters event audiences without treating event ids as public segments', () => {
    const eventGuestIds = { event_1: new Set(['guest-2', 'guest-4']) };

    expect(filterMessageAudienceGuests(guests, 'event:event_1', eventGuestIds).map((guest) => guest.id)).toEqual(['guest-2', 'guest-4']);
    expect(filterMessageAudienceGuests(guests, 'event:missing', eventGuestIds)).toEqual([]);
    expect(filterMessageAudienceGuests(guests, 'language:es').map((guest) => guest.id)).toEqual(['guest-6']);
  });

  it('ignores malformed guest entries instead of crashing audience filters', () => {
    const malformedGuests = [
      undefined,
      null,
      { id: '', rsvp_status: 'pending' },
      { id: 'guest-7', rsvp_status: 'pending', preferred_language: 'es' },
    ] as any;

    expect(filterMessageAudienceGuests(malformedGuests, 'all').map((guest) => guest.id)).toEqual(['guest-7']);
    expect(filterMessageAudienceGuests(malformedGuests, 'language:es').map((guest) => guest.id)).toEqual(['guest-7']);
  });

  it('describes selected audiences for recipient confidence copy', () => {
    const options = buildMessageAudienceOptions(guests);

    expect(getMessageAudienceDetail('invited_pending', options)).toContain('invitation has gone out');
    expect(getMessageAudienceDetail('missing_address', options)).toContain('mailing address');
    expect(getMessageAudienceDetail('missing_meal', options)).toContain('meal choice');
    expect(getMessageAudienceDetail('language:es', options)).toContain('Spanish');
    expect(getMessageAudienceDetail('event:event_1', options)).toBe('Guests assigned to this itinerary event.');
  });
});
