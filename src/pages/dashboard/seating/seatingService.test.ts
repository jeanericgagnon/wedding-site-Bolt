import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  deriveEventCountersFromGuests,
  deriveGuestEventAttendance,
  exportPlaceCardsCSV,
  exportSeatingCSV,
  mapSeatingLookupRows,
  MAX_SEATING_ELIGIBLE_GUESTS,
  MAX_SEATING_EVENT_INVITATIONS,
  MAX_SEATING_ITINERARY_EVENTS,
  MAX_SEATING_ASSIGNMENT_ROWS,
  MAX_SEATING_LOOKUP_GUEST_IDS,
  MAX_SEATING_LOOKUP_EVENT_ROWS,
  MAX_SEATING_LOOKUP_TABLE_IDS,
  MAX_SEATING_TABLE_ROWS,
  MAX_SEATING_VERSION_ROWS,
  type EligibleGuest,
  type SeatingAssignment,
  type SeatingTable,
} from './seatingService';

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

describe('seating CSV exports', () => {
  it('neutralizes spreadsheet formulas in guest and table fields', () => {
    const guests: EligibleGuest[] = [
      {
        id: 'g1',
        full_name: '=HYPERLINK("https://bad.example")',
        email: '+bad@example.com',
        rsvp_status: 'attending',
        household_id: null,
        group_name: null,
        is_attending: true,
        is_invited_to_event: true,
      },
    ];
    const tables: SeatingTable[] = [
      {
        id: 't1',
        seating_event_id: 'se1',
        table_name: '@Head Table',
        capacity: 8,
        sort_order: 1,
        notes: '',
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
    ];

    expect(exportSeatingCSV(guests, tables, assignments, '-Ceremony')).toContain('"\'=HYPERLINK(""https://bad.example"")"');
    expect(exportSeatingCSV(guests, tables, assignments, '-Ceremony')).toContain('"\'@Head Table"');
    expect(exportPlaceCardsCSV(guests, tables, assignments)).toContain('"\'@Head Table"');
  });
});

describe('mapSeatingLookupRows', () => {
  it('builds quick lookup rows from assignments, tables, and guest names', () => {
    expect(mapSeatingLookupRows(
      [
        { guest_id: 'guest-1', table_id: 'table-1', seat_index: 2, checked_in_at: null },
        { guest_id: 'guest-2', table_id: null, seat_index: null, checked_in_at: '2026-01-01T00:00:00Z' },
        { guest_id: 'guest-3', table_id: 'missing-table', seat_index: 1, checked_in_at: null },
      ],
      [{ id: 'table-1', table_name: 'Sweetheart Table' }],
      [
        { id: 'guest-1', first_name: 'Alex', last_name: 'Rivera', name: 'Alex R.', email: 'alex@example.com', rsvp_status: 'attending' },
        { id: 'guest-2', first_name: null, last_name: null, name: 'Sam Lee', email: null, rsvp_status: 'confirmed' },
      ],
    )).toEqual([
      {
        guest_id: 'guest-1',
        full_name: 'Alex Rivera',
        email: 'alex@example.com',
        table_name: 'Sweetheart Table',
        seat_index: 2,
        checked_in_at: null,
        rsvp_status: 'attending',
      },
      {
        guest_id: 'guest-2',
        full_name: 'Sam Lee',
        email: null,
        table_name: 'Unassigned',
        seat_index: null,
        checked_in_at: '2026-01-01T00:00:00Z',
        rsvp_status: 'confirmed',
      },
      {
        guest_id: 'guest-3',
        full_name: 'Guest',
        email: null,
        table_name: 'Unassigned',
        seat_index: 1,
        checked_in_at: null,
        rsvp_status: null,
      },
    ]);
  });

  it('exports stable seating lookup fan-out caps', () => {
    expect(MAX_SEATING_ITINERARY_EVENTS).toBe(200);
    expect(MAX_SEATING_LOOKUP_TABLE_IDS).toBe(500);
    expect(MAX_SEATING_LOOKUP_GUEST_IDS).toBe(2000);
    expect(MAX_SEATING_LOOKUP_EVENT_ROWS).toBe(1);
    expect(MAX_SEATING_ELIGIBLE_GUESTS).toBe(5000);
    expect(MAX_SEATING_EVENT_INVITATIONS).toBe(10000);
    expect(MAX_SEATING_TABLE_ROWS).toBe(500);
    expect(MAX_SEATING_ASSIGNMENT_ROWS).toBe(10000);
    expect(MAX_SEATING_VERSION_ROWS).toBe(12);
  });

  it('keeps seating itinerary, lookup, and eligible-guest fan-out bounded', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/seating/seatingService.ts'), 'utf8');

    expect(source).toContain('MAX_SEATING_ITINERARY_EVENTS');
    expect(source).toContain('MAX_SEATING_LOOKUP_TABLE_IDS');
    expect(source).toContain('MAX_SEATING_LOOKUP_GUEST_IDS');
    expect(source).toContain('MAX_SEATING_LOOKUP_EVENT_ROWS');
    expect(source).toContain('MAX_SEATING_ELIGIBLE_GUESTS');
    expect(source).toContain('MAX_SEATING_EVENT_INVITATIONS');
    expect(source).toContain('MAX_SEATING_TABLE_ROWS');
    expect(source).toContain('MAX_SEATING_ASSIGNMENT_ROWS');
    expect(source).toContain('MAX_SEATING_VERSION_ROWS');
    expect(source).toContain(".order('start_time', { ascending: true })\n    .limit(MAX_SEATING_ITINERARY_EVENTS);");
    expect(source).toContain(".order('created_at', { ascending: false })\n    .limit(MAX_SEATING_LOOKUP_EVENT_ROWS)\n    .maybeSingle();");
    expect(source).toContain('].slice(0, MAX_SEATING_LOOKUP_TABLE_IDS);');
    expect(source).toContain('].slice(0, MAX_SEATING_LOOKUP_GUEST_IDS);');
    expect(source).toContain(".eq('wedding_site_id', weddingSiteId)\n    .limit(MAX_SEATING_ELIGIBLE_GUESTS);");
    expect(source).toContain(".eq('event_id', itineraryEventId)\n    .limit(MAX_SEATING_EVENT_INVITATIONS);");
    expect(source).toContain(".order('sort_order', { ascending: true })\n    .limit(MAX_SEATING_TABLE_ROWS);");
    expect(source).toContain(".eq('seating_event_id', seatingEventId)\n    .limit(MAX_SEATING_ASSIGNMENT_ROWS);");
    expect(source).toContain(".order('created_at', { ascending: false })\n    .limit(MAX_SEATING_VERSION_ROWS);");
  });
});
