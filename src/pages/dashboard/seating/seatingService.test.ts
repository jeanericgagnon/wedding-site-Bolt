import { describe, expect, it } from 'vitest';
import { deriveEventCountersFromGuests, deriveGuestEventAttendance, type EligibleGuest, type SeatingAssignment } from './seatingService';

describe('deriveGuestEventAttendance', () => {
  it('requires an explicit positive event RSVP when event invitations exist', () => {
    expect(deriveGuestEventAttendance({
      hasEventInvitations: true,
      isInvitedToEvent: true,
      eventRsvp: true,
      rsvpStatus: 'attending',
    })).toBe(true);

    expect(deriveGuestEventAttendance({
      hasEventInvitations: true,
      isInvitedToEvent: true,
      eventRsvp: null,
      rsvpStatus: 'attending',
    })).toBe(false);

    expect(deriveGuestEventAttendance({
      hasEventInvitations: true,
      isInvitedToEvent: false,
      eventRsvp: true,
      rsvpStatus: 'attending',
    })).toBe(false);
  });

  it('falls back to top-level RSVP status only when no event invitations exist', () => {
    expect(deriveGuestEventAttendance({
      hasEventInvitations: false,
      isInvitedToEvent: true,
      eventRsvp: null,
      rsvpStatus: 'attending',
    })).toBe(true);

    expect(deriveGuestEventAttendance({
      hasEventInvitations: false,
      isInvitedToEvent: true,
      eventRsvp: true,
      rsvpStatus: 'declined',
    })).toBe(false);
  });
});

describe('deriveEventCountersFromGuests', () => {
  it('counts only event-invited guests and only valid seated assignments', () => {
    const guests: EligibleGuest[] = [
      {
        id: 'g1',
        full_name: 'Alex Rivera',
        email: 'alex@example.com',
        rsvp_status: 'attending',
        household_id: null,
        group_name: null,
        is_attending: true,
        is_invited_to_event: true,
      },
      {
        id: 'g2',
        full_name: 'Sam Lee',
        email: 'sam@example.com',
        rsvp_status: 'declined',
        household_id: null,
        group_name: null,
        is_attending: false,
        is_invited_to_event: true,
      },
      {
        id: 'g3',
        full_name: 'Taylor Kim',
        email: 'taylor@example.com',
        rsvp_status: 'pending',
        household_id: null,
        group_name: null,
        is_attending: false,
        is_invited_to_event: true,
      },
      {
        id: 'g4',
        full_name: 'Jordan Smith',
        email: 'jordan@example.com',
        rsvp_status: 'attending',
        household_id: null,
        group_name: null,
        is_attending: true,
        is_invited_to_event: false,
      },
    ];

    const assignments: SeatingAssignment[] = [
      {
        id: 'a1',
        seating_event_id: 'se1',
        table_id: 't1',
        guest_id: 'g1',
        seat_index: 1,
        is_valid: true,
      },
      {
        id: 'a2',
        seating_event_id: 'se1',
        table_id: 't1',
        guest_id: 'g2',
        seat_index: 2,
        is_valid: false,
      },
      {
        id: 'a3',
        seating_event_id: 'se1',
        table_id: 't2',
        guest_id: 'g4',
        seat_index: 1,
        is_valid: true,
      },
    ];

    expect(deriveEventCountersFromGuests(guests, assignments)).toEqual({
      invited: 3,
      attending: 1,
      declined: 1,
      pending: 1,
      seated: 1,
      unassigned: 0,
    });
  });

  it('never lets unassigned go negative even if stale valid assignments exceed attending guests', () => {
    const guests: EligibleGuest[] = [
      {
        id: 'g1',
        full_name: 'Alex Rivera',
        email: null,
        rsvp_status: 'attending',
        household_id: null,
        group_name: null,
        is_attending: true,
        is_invited_to_event: true,
      },
    ];

    const assignments: SeatingAssignment[] = [
      {
        id: 'a1',
        seating_event_id: 'se1',
        table_id: 't1',
        guest_id: 'g1',
        seat_index: 1,
        is_valid: true,
      },
      {
        id: 'a2',
        seating_event_id: 'se1',
        table_id: 't1',
        guest_id: 'ghost',
        seat_index: 2,
        is_valid: true,
      },
    ];

    expect(deriveEventCountersFromGuests(guests, assignments)).toEqual({
      invited: 1,
      attending: 1,
      declined: 0,
      pending: 0,
      seated: 1,
      unassigned: 0,
    });
  });

  it('uses explicit event RSVP state for declined and pending counts when event invitations exist', () => {
    const guests: EligibleGuest[] = [
      {
        id: 'g1',
        full_name: 'Alex Rivera',
        email: null,
        rsvp_status: 'attending',
        household_id: null,
        group_name: null,
        is_attending: true,
        is_invited_to_event: true,
        event_rsvp_attending: true,
      },
      {
        id: 'g2',
        full_name: 'Sam Lee',
        email: null,
        rsvp_status: 'attending',
        household_id: null,
        group_name: null,
        is_attending: false,
        is_invited_to_event: true,
        event_rsvp_attending: false,
      },
      {
        id: 'g3',
        full_name: 'Taylor Kim',
        email: null,
        rsvp_status: 'attending',
        household_id: null,
        group_name: null,
        is_attending: false,
        is_invited_to_event: true,
        event_rsvp_attending: null,
      },
      {
        id: 'g4',
        full_name: 'Jordan Smith',
        email: null,
        rsvp_status: 'declined',
        household_id: null,
        group_name: null,
        is_attending: false,
        is_invited_to_event: false,
        event_rsvp_attending: null,
      },
    ];

    expect(deriveEventCountersFromGuests(guests, [])).toEqual({
      invited: 3,
      attending: 1,
      declined: 1,
      pending: 1,
      seated: 0,
      unassigned: 1,
    });
  });
});
