import { isAttendingRsvpStatus, isDeclinedRsvpStatus, isPendingRsvpStatus } from './rsvpStatus';

export type MessageAudienceSegmentId =
  | 'all'
  | 'attending'
  | 'not_responded'
  | 'declined'
  | 'invite_not_sent'
  | 'invited_pending'
  | 'reminder_sent_pending'
  | 'missing_address'
  | 'missing_meal';

export interface MessageAudienceGuest {
  id: string;
  rsvp_status?: string | null;
  invitation_sent_at?: string | null;
  reminder_last_sent_at?: string | null;
  mailing_address_line1?: string | null;
  mailing_city?: string | null;
  mailing_state?: string | null;
  mailing_postal_code?: string | null;
  meal_choice?: string | null;
}

export interface MessageAudienceOption {
  value: MessageAudienceSegmentId;
  label: string;
  count: number;
  detail: string;
}

const MESSAGE_AUDIENCE_SEGMENTS: Array<Omit<MessageAudienceOption, 'count'>> = [
  {
    value: 'all',
    label: 'All Guests',
    detail: 'Everyone currently on the guest list.',
  },
  {
    value: 'attending',
    label: 'Attending',
    detail: 'Guests whose RSVP is in an attending state.',
  },
  {
    value: 'not_responded',
    label: 'RSVP pending',
    detail: 'Guests who have not replied yet.',
  },
  {
    value: 'declined',
    label: 'Declined',
    detail: 'Guests who have declined.',
  },
  {
    value: 'invite_not_sent',
    label: 'Invite not sent',
    detail: 'Pending guests without a recorded invite send.',
  },
  {
    value: 'invited_pending',
    label: 'Invited, no reply',
    detail: 'Pending guests whose invitation has gone out but who have not replied.',
  },
  {
    value: 'reminder_sent_pending',
    label: 'Reminder sent, no reply',
    detail: 'Pending guests who already received at least one reminder.',
  },
  {
    value: 'missing_address',
    label: 'Missing address',
    detail: 'Guests who still need a mailing address on file.',
  },
  {
    value: 'missing_meal',
    label: 'Missing meal',
    detail: 'Attending guests without a meal choice on file.',
  },
];

function hasMailingAddress(guest: MessageAudienceGuest): boolean {
  return Boolean(
    guest.mailing_address_line1?.trim()
    && guest.mailing_city?.trim()
    && guest.mailing_state?.trim()
    && guest.mailing_postal_code?.trim()
  );
}

function hasMealChoice(guest: MessageAudienceGuest): boolean {
  return Boolean(guest.meal_choice?.trim());
}

export function filterMessageAudienceGuests<T extends MessageAudienceGuest>(
  guests: T[],
  audience: string,
  eventGuestIds?: Record<string, Set<string>>
): T[] {
  if (audience.startsWith('event:')) {
    const eventId = audience.replace('event:', '');
    const ids = eventGuestIds?.[eventId];
    if (!ids) return [];
    return guests.filter((guest) => ids.has(guest.id));
  }

  switch (audience as MessageAudienceSegmentId) {
    case 'attending':
      return guests.filter((guest) => isAttendingRsvpStatus(guest.rsvp_status));
    case 'not_responded':
      return guests.filter((guest) => isPendingRsvpStatus(guest.rsvp_status));
    case 'declined':
      return guests.filter((guest) => isDeclinedRsvpStatus(guest.rsvp_status));
    case 'invite_not_sent':
      return guests.filter((guest) => isPendingRsvpStatus(guest.rsvp_status) && !guest.invitation_sent_at && !guest.reminder_last_sent_at);
    case 'invited_pending':
      return guests.filter((guest) => isPendingRsvpStatus(guest.rsvp_status) && Boolean(guest.invitation_sent_at) && !guest.reminder_last_sent_at);
    case 'reminder_sent_pending':
      return guests.filter((guest) => isPendingRsvpStatus(guest.rsvp_status) && Boolean(guest.reminder_last_sent_at));
    case 'missing_address':
      return guests.filter((guest) => !hasMailingAddress(guest));
    case 'missing_meal':
      return guests.filter((guest) => isAttendingRsvpStatus(guest.rsvp_status) && !hasMealChoice(guest));
    case 'all':
    default:
      return guests;
  }
}

export function buildMessageAudienceOptions(guests: MessageAudienceGuest[]): MessageAudienceOption[] {
  return MESSAGE_AUDIENCE_SEGMENTS.map((segment) => ({
    ...segment,
    count: filterMessageAudienceGuests(guests, segment.value).length,
  }));
}

export function getMessageAudienceDetail(audience: string, options: Array<{ value: string; detail?: string }>): string {
  if (audience.startsWith('event:')) return 'Guests assigned to this itinerary event.';
  return options.find((option) => option.value === audience)?.detail ?? 'Selected guest audience.';
}
