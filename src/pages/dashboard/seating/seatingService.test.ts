import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assignGuestToTable,
  autoCreateTables,
  createSeatingVersion,
  createTable,
  markSeatingVersionRestored,
  deriveEventCountersFromGuests,
  deriveEligibleGuestDietaryFields,
  deriveEligibleGuestMealPreference,
  deriveGuestEventAttendance,
  exportPlaceCardsCSV,
  exportSeatingCSV,
  getEligibleGuests,
  getOrCreateSeatingEvent,
  invalidateDriftedAssignments,
  loadDemoSeatingLookupRows,
  mapSeatingLookupRows,
  MAX_SEATING_ELIGIBLE_GUESTS,
  MAX_SEATING_EVENT_INVITATIONS,
  MAX_SEATING_ITINERARY_EVENTS,
  MAX_SEATING_ASSIGNMENT_ROWS,
  MAX_SEATING_LOOKUP_GUEST_IDS,
  MAX_SEATING_LOOKUP_TABLE_IDS,
  MAX_SEATING_TABLE_ROWS,
  MAX_SEATING_VERSION_ROWS,
  refreshSeatingSession,
  resetSeating,
  setGuestCheckedIn,
  unassignGuest,
  updateSeatingEvent,
  updateTable,
  deleteTable,
  type EligibleGuest,
  type SeatingAssignment,
  type SeatingTable,
} from './seatingService';

const { fromMock, refreshSessionMock, rpcMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  refreshSessionMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      refreshSession: refreshSessionMock,
      getUser: vi.fn(),
    },
    from: fromMock,
    rpc: rpcMock,
  },
}));

beforeEach(() => {
  fromMock.mockReset();
  refreshSessionMock.mockReset();
  rpcMock.mockReset();
});

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

describe('deriveEligibleGuestDietaryFields', () => {
  it('extracts explicit dietary and allergy notes into dedicated seating fields', () => {
    expect(deriveEligibleGuestDietaryFields('Dietary: Gluten-free\nAllergy: Peanut')).toEqual({
      dietary_restrictions: 'Gluten-free',
      dietary_notes: null,
      allergies: 'Peanut',
    });
  });

  it('extracts broader explicit RSVP note labels into structured dietary fields', () => {
    expect(deriveEligibleGuestDietaryFields('Restrictions: Vegetarian\nFood allergy: Sesame\nCatering note: plated separately')).toEqual({
      dietary_restrictions: 'Vegetarian',
      dietary_notes: 'plated separately',
      allergies: 'Sesame',
    });

    expect(deriveEligibleGuestDietaryFields('Meal restriction: Vegan\nAllergens: Walnut\nFood note: no garnish')).toEqual({
      dietary_restrictions: 'Vegan',
      dietary_notes: 'no garnish',
      allergies: 'Walnut',
    });
  });

  it('extracts semicolon-separated meal and dietary labels from flattened RSVP notes', () => {
    expect(deriveEligibleGuestDietaryFields('Diet: Gluten-free; Allergy: Peanut; Service note: sauce on side')).toEqual({
      dietary_restrictions: 'Gluten-free',
      dietary_notes: 'sauce on side',
      allergies: 'Peanut',
    });

    expect(deriveEligibleGuestDietaryFields('Food restriction: Dairy-free; Allergens: Walnut; Chef note: no garnish')).toEqual({
      dietary_restrictions: 'Dairy-free',
      dietary_notes: 'no garnish',
      allergies: 'Walnut',
    });
  });

  it('extracts pipe-separated dietary labels from flattened RSVP notes', () => {
    expect(deriveEligibleGuestDietaryFields('Dietary: Gluten-free | Allergy: Peanut | Kitchen note: sauce on side')).toEqual({
      dietary_restrictions: 'Gluten-free',
      dietary_notes: 'sauce on side',
      allergies: 'Peanut',
    });
  });

  it('keeps extra dietary note detail while splitting explicit restriction labels', () => {
    expect(deriveEligibleGuestDietaryFields('Dietary restrictions - Gluten-free\nMeal note: kosher-style plating preferred\nAllergies: Peanut')).toEqual({
      dietary_restrictions: 'Gluten-free',
      dietary_notes: 'kosher-style plating preferred',
      allergies: 'Peanut',
    });
  });

  it('leaves generic guest notes alone when no explicit dietary labels exist', () => {
    expect(deriveEligibleGuestDietaryFields('Prefers aisle seat')).toEqual({
      dietary_restrictions: null,
      dietary_notes: null,
      allergies: null,
    });
  });
});

describe('deriveEligibleGuestMealPreference', () => {
  it('extracts explicit meal notes into a dedicated seating meal field', () => {
    expect(deriveEligibleGuestMealPreference('Meal: Vegetarian\nDietary: Gluten-free')).toBe('Vegetarian');
    expect(deriveEligibleGuestMealPreference('Entree: Fish')).toBe('Fish');
    expect(deriveEligibleGuestMealPreference('Entrée: Chicken')).toBe('Chicken');
  });

  it('extracts broader explicit meal label variants into the seating meal field', () => {
    expect(deriveEligibleGuestMealPreference('Meal selection: Pasta')).toBe('Pasta');
    expect(deriveEligibleGuestMealPreference('Entrée choice: Short rib')).toBe('Short rib');
    expect(deriveEligibleGuestMealPreference('Protein: Salmon')).toBe('Salmon');
  });

  it('extracts semicolon-separated and broader meal labels into the seating meal field', () => {
    expect(deriveEligibleGuestMealPreference('Menu: Pasta; Allergy: Peanut')).toBe('Pasta');
    expect(deriveEligibleGuestMealPreference('Main: Short rib; Service note: split plate')).toBe('Short rib');
    expect(deriveEligibleGuestMealPreference('Dish: Salmon')).toBe('Salmon');
  });

  it('extracts pipe-separated meal labels into the seating meal field', () => {
    expect(deriveEligibleGuestMealPreference('Meal choice: Fish | Allergy: Peanut | Service note: split plate')).toBe('Fish');
  });

  it('leaves generic guest notes alone when no explicit meal label exists', () => {
    expect(deriveEligibleGuestMealPreference('Prefers aisle seat')).toBeNull();
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

describe('getEligibleGuests', () => {
  it('promotes explicit meal notes into seating meal preference when the guest meal field is blank', async () => {
    const selectMock = vi.fn();
    const eqGuestsMock = vi.fn();
    const limitGuestsMock = vi.fn();
    const eqInvitesMock = vi.fn();
    const limitInvitesMock = vi.fn();

    fromMock
      .mockReturnValueOnce({ select: selectMock })
      .mockReturnValueOnce({ select: selectMock });

    selectMock
      .mockReturnValueOnce({ eq: eqGuestsMock })
      .mockReturnValueOnce({ eq: eqInvitesMock });

    eqGuestsMock.mockReturnValueOnce({ limit: limitGuestsMock });
    limitGuestsMock.mockResolvedValueOnce({
      data: [
        {
          id: 'guest-1',
          name: 'Avery Guest',
          first_name: null,
          last_name: null,
          email: null,
          rsvp_status: 'attending',
          household_id: null,
          group_name: null,
          meal_preference: null,
          notes: 'Meal: Vegetarian\nDietary: Gluten-free',
        },
      ],
      error: null,
    });

    eqInvitesMock.mockReturnValueOnce({ limit: limitInvitesMock });
    limitInvitesMock.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    await expect(getEligibleGuests('site-1', 'event-1')).resolves.toEqual([
      expect.objectContaining({
        id: 'guest-1',
        meal_preference: 'Vegetarian',
        dietary_restrictions: 'Gluten-free',
        dietary_notes: null,
      }),
    ]);
  });

  it('promotes flattened semicolon-separated meal and dietary labels when guest fields are blank', async () => {
    const selectMock = vi.fn();
    const eqGuestsMock = vi.fn();
    const limitGuestsMock = vi.fn();
    const eqInvitesMock = vi.fn();
    const limitInvitesMock = vi.fn();

    fromMock
      .mockReturnValueOnce({ select: selectMock })
      .mockReturnValueOnce({ select: selectMock });

    selectMock
      .mockReturnValueOnce({ eq: eqGuestsMock })
      .mockReturnValueOnce({ eq: eqInvitesMock });

    eqGuestsMock.mockReturnValueOnce({ limit: limitGuestsMock });
    limitGuestsMock.mockResolvedValueOnce({
      data: [
        {
          id: 'guest-1',
          name: 'Jordan Guest',
          first_name: null,
          last_name: null,
          email: null,
          rsvp_status: 'attending',
          household_id: null,
          group_name: null,
          meal_preference: null,
          notes: 'Menu: Pasta; Diet: Gluten-free; Allergy: Peanut; Service note: sauce on side',
        },
      ],
      error: null,
    });

    eqInvitesMock.mockReturnValueOnce({ limit: limitInvitesMock });
    limitInvitesMock.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    await expect(getEligibleGuests('site-1', 'event-1')).resolves.toEqual([
      expect.objectContaining({
        id: 'guest-1',
        meal_preference: 'Pasta',
        dietary_restrictions: 'Gluten-free',
        dietary_notes: 'sauce on side',
        allergies: 'Peanut',
      }),
    ]);
  });

  it('promotes flattened pipe-separated meal and dietary labels when guest fields are blank', async () => {
    const selectMock = vi.fn();
    const eqGuestsMock = vi.fn();
    const limitGuestsMock = vi.fn();
    const eqInvitesMock = vi.fn();
    const limitInvitesMock = vi.fn();

    fromMock
      .mockReturnValueOnce({ select: selectMock })
      .mockReturnValueOnce({ select: selectMock });

    selectMock
      .mockReturnValueOnce({ eq: eqGuestsMock })
      .mockReturnValueOnce({ eq: eqInvitesMock });

    eqGuestsMock.mockReturnValueOnce({ limit: limitGuestsMock });
    limitGuestsMock.mockResolvedValueOnce({
      data: [
        {
          id: 'guest-1',
          name: 'Avery Guest',
          first_name: null,
          last_name: null,
          email: null,
          rsvp_status: 'attending',
          household_id: null,
          group_name: null,
          meal_preference: null,
          notes: 'Meal choice: Fish | Dietary: Gluten-free | Allergy: Peanut | Kitchen note: sauce on side',
        },
      ],
      error: null,
    });

    eqInvitesMock.mockReturnValueOnce({ limit: limitInvitesMock });
    limitInvitesMock.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    await expect(getEligibleGuests('site-1', 'event-1')).resolves.toEqual([
      expect.objectContaining({
        id: 'guest-1',
        meal_preference: 'Fish',
        dietary_restrictions: 'Gluten-free',
        dietary_notes: 'sauce on side',
        allergies: 'Peanut',
      }),
    ]);
  });
});

describe('seating CSV exports', () => {
  it('includes structured meal and dietary fields in the seating csv export', () => {
    const guests: EligibleGuest[] = [
      {
        id: 'g1',
        full_name: 'Avery Guest',
        email: 'avery@example.com',
        rsvp_status: 'attending',
        household_id: 'Avery household',
        group_name: null,
        is_attending: true,
        is_invited_to_event: true,
        meal_preference: 'Pasta',
        dietary_restrictions: 'Gluten-free',
        allergies: 'Peanut',
        dietary_notes: 'Sauce on side',
      },
    ];
    const tables: SeatingTable[] = [
      {
        id: 't1',
        seating_event_id: 'se1',
        table_name: 'Head Table',
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

    const csv = exportSeatingCSV(guests, tables, assignments, 'Reception');

    expect(csv).toContain('"Meal Choice"');
    expect(csv).toContain('"Dietary Restrictions"');
    expect(csv).toContain('"Allergies"');
    expect(csv).toContain('"Dietary Notes"');
    expect(csv).toContain('"Reception","Avery Guest","avery@example.com","Avery household","attending","Pasta","Gluten-free","Peanut","Sauce on side","Head Table","1","No","",""');
  });

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
    expect(exportSeatingCSV(guests, tables, assignments, '-Ceremony')).toContain('"No meal recorded"');
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
      { itinerary_event_id: 'event-1', event_name: 'Reception' },
    )).toEqual([
      {
        itinerary_event_id: 'event-1',
        event_name: 'Reception',
        guest_id: 'guest-1',
        full_name: 'Alex Rivera',
        email: 'alex@example.com',
        invite_token: null,
        preferred_language: null,
        table_name: 'Sweetheart Table',
        seat_index: 2,
        checked_in_at: null,
        rsvp_status: 'attending',
      },
      {
        itinerary_event_id: 'event-1',
        event_name: 'Reception',
        guest_id: 'guest-2',
        full_name: 'Sam Lee',
        email: null,
        invite_token: null,
        preferred_language: null,
        table_name: 'Unassigned',
        seat_index: null,
        checked_in_at: '2026-01-01T00:00:00Z',
        rsvp_status: 'confirmed',
      },
      {
        itinerary_event_id: 'event-1',
        event_name: 'Reception',
        guest_id: 'guest-3',
        full_name: 'Guest',
        email: null,
        invite_token: null,
        preferred_language: null,
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
    expect(MAX_SEATING_ELIGIBLE_GUESTS).toBe(5000);
    expect(MAX_SEATING_EVENT_INVITATIONS).toBe(10000);
    expect(MAX_SEATING_TABLE_ROWS).toBe(500);
    expect(MAX_SEATING_ASSIGNMENT_ROWS).toBe(10000);
    expect(MAX_SEATING_VERSION_ROWS).toBe(12);
  });

  it('builds demo lookup rows from the persisted demo seating state', () => {
    localStorage.setItem('dayof.demo.itinerary.events', JSON.stringify({
      savedAtISO: new Date().toISOString(),
      value: [
        {
          id: 'welcome-dinner-id',
          event_name: 'Welcome Dinner',
          event_date: '2026-06-14',
          start_time: '18:00:00',
          location_name: 'The Vineyard Restaurant',
        },
      ],
    }));
    localStorage.setItem('dayof.demo.seating.state', JSON.stringify({
      savedAtISO: new Date().toISOString(),
      value: {
        'welcome-dinner-id': {
          tables: [
            {
              id: 'table-1',
              seating_event_id: 'demo-seating-event',
              table_name: 'Head Table',
              capacity: 8,
              sort_order: 0,
              notes: '',
            },
          ],
          assignments: [
            {
              id: 'assign-1',
              seating_event_id: 'demo-seating-event',
              table_id: 'table-1',
              guest_id: 'confirmed-guest-3',
              seat_index: 3,
              is_valid: true,
              checked_in_at: null,
            },
          ],
        },
      },
    }));

    expect(loadDemoSeatingLookupRows('welcome-dinner-id')).toEqual([
      expect.objectContaining({
        itinerary_event_id: 'welcome-dinner-id',
        event_name: 'Welcome Dinner',
        guest_id: 'confirmed-guest-3',
        full_name: 'Liam Nguyen',
        table_name: 'Head Table',
        seat_index: 3,
      }),
    ]);
  });

  it('keeps seating itinerary, lookup, and eligible-guest fan-out bounded', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/seating/seatingService.ts'), 'utf8');

    expect(source).toContain('MAX_SEATING_ITINERARY_EVENTS');
    expect(source).toContain('MAX_SEATING_LOOKUP_TABLE_IDS');
    expect(source).toContain('MAX_SEATING_LOOKUP_GUEST_IDS');
    expect(source).toContain('MAX_SEATING_ELIGIBLE_GUESTS');
    expect(source).toContain('MAX_SEATING_EVENT_INVITATIONS');
    expect(source).toContain('MAX_SEATING_TABLE_ROWS');
    expect(source).toContain('MAX_SEATING_ASSIGNMENT_ROWS');
    expect(source).toContain('MAX_SEATING_VERSION_ROWS');
    expect(source).toContain(".order('start_time', { ascending: true })\n    .limit(MAX_SEATING_ITINERARY_EVENTS);");
    expect(source).toContain("resolveOperationalEventId({ events: itineraryEvents })");
    expect(source).toContain(".select('id, event_name, event_date, start_time')");
    expect(source).toContain('].slice(0, MAX_SEATING_LOOKUP_TABLE_IDS);');
    expect(source).toContain('].slice(0, MAX_SEATING_LOOKUP_GUEST_IDS);');
    expect(source).toContain(".eq('wedding_site_id', weddingSiteId)\n    .limit(MAX_SEATING_ELIGIBLE_GUESTS);");
    expect(source).toContain(".eq('event_id', itineraryEventId)\n    .limit(MAX_SEATING_EVENT_INVITATIONS);");
    expect(source).toContain(".order('sort_order', { ascending: true })\n    .limit(MAX_SEATING_TABLE_ROWS);");
    expect(source).toContain(".eq('seating_event_id', seatingEventId)\n    .limit(MAX_SEATING_ASSIGNMENT_ROWS);");
    expect(source).toContain(".order('created_at', { ascending: false })\n    .limit(MAX_SEATING_VERSION_ROWS);");
    expect(source).toContain("supabase.rpc('seating_event_get_or_create'");
    expect(source).toContain("supabase.rpc('seating_event_update'");
    expect(source).toContain("supabase.rpc('seating_table_write'");
    expect(source).toContain("supabase.rpc('seating_table_delete'");
    expect(source).toContain("supabase.rpc('seating_table_bulk_create'");
    expect(source).not.toContain(".from('seating_events')\n    .insert(");
    expect(source).not.toContain(".from('seating_events')\n    .update(");
    expect(source).not.toContain(".from('seating_tables')\n    .insert(");
    expect(source).not.toContain(".from('seating_tables')\n    .update(");
    expect(source).not.toContain(".from('seating_tables').delete()");
  });

  it('refreshes the seating session through the service helper', async () => {
    refreshSessionMock.mockResolvedValue({ data: { session: null } });

    await expect(refreshSeatingSession()).resolves.toBeUndefined();
    expect(refreshSessionMock).toHaveBeenCalled();
  });

  it('persists seating event and table writes through RPCs', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: { id: 'se-1' }, error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ data: { id: 'table-1' }, error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ data: [{ id: 'table-1' }], error: null });

    await expect(getOrCreateSeatingEvent('site-1', 'event-1')).resolves.toEqual(expect.objectContaining({ id: 'se-1' }));
    expect(rpcMock).toHaveBeenNthCalledWith(1, 'seating_event_get_or_create', {
      p_wedding_site_id: 'site-1',
      p_itinerary_event_id: 'event-1',
    });

    await expect(updateSeatingEvent('se-1', { default_table_capacity: 10, notes: 'Updated' })).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenNthCalledWith(2, 'seating_event_update', {
      p_seating_event_id: 'se-1',
      p_default_table_capacity: 10,
      p_notes: 'Updated',
    });

    await expect(createTable({ seating_event_id: 'se-1', table_name: 'Head table' })).resolves.toEqual(expect.objectContaining({ id: 'table-1' }));
    expect(rpcMock).toHaveBeenNthCalledWith(3, 'seating_table_write', {
      p_seating_event_id: 'se-1',
      p_table_id: null,
      p_payload: { seating_event_id: 'se-1', table_name: 'Head table' },
    });

    await expect(updateTable('table-1', { capacity: 12 })).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenNthCalledWith(4, 'seating_table_write', {
      p_seating_event_id: null,
      p_table_id: 'table-1',
      p_payload: { capacity: 12 },
    });

    await expect(deleteTable('table-1')).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenNthCalledWith(5, 'seating_table_delete', {
      p_table_id: 'table-1',
    });

    await expect(autoCreateTables('se-1', 10, 5)).resolves.toEqual([{ id: 'table-1' }]);
    expect(rpcMock).toHaveBeenNthCalledWith(6, 'seating_table_bulk_create', {
      p_seating_event_id: 'se-1',
      p_tables: [
        { seating_event_id: 'se-1', table_name: 'Table 1', capacity: 5, sort_order: 0 },
        { seating_event_id: 'se-1', table_name: 'Table 2', capacity: 5, sort_order: 1 },
      ],
    });
  });

  it('routes seating assignment and layout-version writes through RPCs', async () => {
    rpcMock
      .mockResolvedValueOnce({
        data: {
          id: 'assign-1',
          seating_event_id: 'se-1',
          table_id: 'table-1',
          guest_id: 'guest-1',
          seat_index: 2,
          is_valid: true,
        },
        error: null,
      })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({
        data: {
          id: 'version-1',
          wedding_site_id: 'site-1',
          seating_event_id: 'se-1',
          itinerary_event_id: 'event-1',
          label: 'v1',
          tables: [],
          assignments: [],
          created_by: 'user-1',
          restored_at: null,
          created_at: 'now',
        },
        error: null,
      })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null });

    await expect(assignGuestToTable('se-1', 'table-1', 'guest-1', 2)).resolves.toMatchObject({ id: 'assign-1' });
    await expect(unassignGuest('se-1', 'guest-1')).resolves.toBeUndefined();
    await expect(setGuestCheckedIn('se-1', 'guest-1', true)).resolves.toBeUndefined();
    await expect(resetSeating('se-1')).resolves.toBeUndefined();
    await expect(createSeatingVersion({
      weddingSiteId: 'site-1',
      seatingEventId: 'se-1',
      itineraryEventId: 'event-1',
      label: 'v1',
      tables: [],
      assignments: [],
    })).resolves.toMatchObject({ id: 'version-1' });
    await expect(markSeatingVersionRestored('version-1')).resolves.toBeUndefined();

    expect(rpcMock).toHaveBeenNthCalledWith(1, 'seating_assignment_write', {
      p_seating_event_id: 'se-1',
      p_guest_id: 'guest-1',
      p_payload: { table_id: 'table-1', seat_index: 2, is_valid: true },
    });
    expect(rpcMock).toHaveBeenNthCalledWith(2, 'seating_assignment_delete', {
      p_seating_event_id: 'se-1',
      p_guest_id: 'guest-1',
    });
    expect(rpcMock).toHaveBeenNthCalledWith(3, 'seating_assignment_write', {
      p_seating_event_id: 'se-1',
      p_guest_id: 'guest-1',
      p_payload: { checked_in_at: expect.any(String) },
    });
    expect(rpcMock).toHaveBeenNthCalledWith(4, 'seating_assignment_delete', {
      p_seating_event_id: 'se-1',
      p_guest_id: null,
    });
    expect(rpcMock).toHaveBeenNthCalledWith(5, 'seating_layout_version_create', {
      p_wedding_site_id: 'site-1',
      p_seating_event_id: 'se-1',
      p_itinerary_event_id: 'event-1',
      p_label: 'v1',
      p_tables: [],
      p_assignments: [],
    });
    expect(rpcMock).toHaveBeenNthCalledWith(6, 'seating_layout_version_restore', {
      p_version_id: 'version-1',
      p_restored_at: expect.any(String),
    });
  });

  it('invalidates drifted assignments after RSVP-backed attendance changes', async () => {
    const selectMock = vi.fn();
    const eqGuestsMock = vi.fn();
    const limitGuestsMock = vi.fn();
    const eqInvitesMock = vi.fn();
    const limitInvitesMock = vi.fn();
    const inEventRsvpsMock = vi.fn();
    const eqAssignmentsMock = vi.fn();
    const limitAssignmentsMock = vi.fn();

    fromMock
      .mockReturnValueOnce({ select: selectMock })
      .mockReturnValueOnce({ select: selectMock })
      .mockReturnValueOnce({ select: selectMock })
      .mockReturnValueOnce({ select: selectMock });

    selectMock
      .mockReturnValueOnce({ eq: eqGuestsMock })
      .mockReturnValueOnce({ eq: eqInvitesMock })
      .mockReturnValueOnce({ in: inEventRsvpsMock })
      .mockReturnValueOnce({ eq: eqAssignmentsMock });

    eqGuestsMock.mockReturnValueOnce({ limit: limitGuestsMock });
    limitGuestsMock.mockResolvedValueOnce({
      data: [
        { id: 'guest-1', name: 'Avery Guest', first_name: null, last_name: null, email: null, rsvp_status: 'attending', household_id: null, group_name: null, meal_preference: null, notes: null },
        { id: 'guest-2', name: 'Bailey Guest', first_name: null, last_name: null, email: null, rsvp_status: 'attending', household_id: null, group_name: null, meal_preference: null, notes: null },
      ],
      error: null,
    });

    eqInvitesMock.mockReturnValueOnce({ limit: limitInvitesMock });
    limitInvitesMock.mockResolvedValueOnce({
      data: [
        { id: 'invite-1', guest_id: 'guest-1' },
        { id: 'invite-2', guest_id: 'guest-2' },
      ],
      error: null,
    });

    inEventRsvpsMock.mockResolvedValueOnce({
      data: [
        { event_invitation_id: 'invite-1', attending: true },
        { event_invitation_id: 'invite-2', attending: false },
      ],
      error: null,
    });

    eqAssignmentsMock.mockReturnValueOnce({ limit: limitAssignmentsMock });
    limitAssignmentsMock.mockResolvedValueOnce({
      data: [
        { id: 'assign-1', seating_event_id: 'se-1', table_id: 'table-1', guest_id: 'guest-1', seat_index: 1, is_valid: true },
        { id: 'assign-2', seating_event_id: 'se-1', table_id: 'table-1', guest_id: 'guest-2', seat_index: 2, is_valid: true },
      ],
      error: null,
    });

    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(invalidateDriftedAssignments('se-1', 'event-1', 'site-1')).resolves.toBe(1);

    expect(rpcMock).toHaveBeenCalledWith('seating_assignment_invalidate_many', {
      p_assignment_ids: ['assign-2'],
    });
  });
});
