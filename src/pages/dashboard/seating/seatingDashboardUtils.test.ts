import { describe, expect, it } from 'vitest';
import {
  buildArrivedGuestIdSet,
  buildAssignedGuestIdSet,
  buildDemoAutoSeatAssignments,
  buildDemoAutoTables,
  buildSeatingLayoutSvg,
  buildSeatingReportHtml,
  buildTableSummaryCsv,
  countArrivedAttendingGuests,
  escapeHtml,
  getAssignmentsForTable,
  getCheckInCandidates,
  getGuestsAssignedToTable,
  getSeatPickerOptions,
  getShapeLabel,
  getShapePalette,
  getUnassignedAttendingGuests,
  safeExportSlug,
} from './seatingDashboardUtils';
import type { EligibleGuest, SeatingAssignment, SeatingTable } from './seatingService';

describe('seating dashboard utilities', () => {
  const guests: EligibleGuest[] = [
    { id: 'g1', full_name: 'Avery Guest', email: 'avery@example.com', rsvp_status: 'attending', household_id: null, group_name: null, is_attending: true, is_invited_to_event: true },
    { id: 'g2', full_name: 'Bailey Guest', email: null, rsvp_status: 'attending', household_id: null, group_name: null, is_attending: true, is_invited_to_event: true },
    { id: 'g3', full_name: 'Casey Declined', email: null, rsvp_status: 'declined', household_id: null, group_name: null, is_attending: false, is_invited_to_event: true },
  ];

  const assignments: SeatingAssignment[] = [
    { id: 'a1', seating_event_id: 'seating-1', table_id: 't1', guest_id: 'g1', seat_index: 1, is_valid: true, checked_in_at: '2026-05-05T18:00:00.000Z' },
    { id: 'a2', seating_event_id: 'seating-1', table_id: 't2', guest_id: 'g2', seat_index: 2, is_valid: true, checked_in_at: null },
  ];

  const tables: SeatingTable[] = [
    { id: 't1', seating_event_id: 'seating-1', table_name: 'Head <Table>', capacity: 8, sort_order: 0, table_shape: 'round', notes: '', layout_x: 10, layout_y: 20, layout_width: 200, layout_height: 100, rotation_deg: 0 },
    { id: 't2', seating_event_id: 'seating-1', table_name: 'Friends', capacity: 10, sort_order: 1, table_shape: 'rectangle', notes: '', rotation_deg: 0 },
  ];

  it('escapes handoff export HTML values', () => {
    expect(escapeHtml(`Maya & <Leo> "party" 'table'`)).toBe('Maya &amp; &lt;Leo&gt; &quot;party&quot; &#39;table&#39;');
  });

  it('normalizes event names into safe export slugs', () => {
    expect(safeExportSlug('Ceremony / Cocktails!')).toBe('ceremony-cocktails');
    expect(safeExportSlug('   ')).toBe('event');
  });

  it('labels and styles known table shapes', () => {
    expect(getShapeLabel('round')).toBe('Round Table');
    expect(getShapeLabel('bar')).toBe('Service Station');
    expect(getShapePalette('dance_floor').chip).toContain('bg-primary/10');
    expect(getShapePalette('rectangle').fill).toContain('bg-surface-subtle');
  });

  it('builds table summary CSV with spreadsheet-safe escaping', () => {
    const csv = buildTableSummaryCsv({
      tableSummaries: [{
        tableName: 'Family "A"',
        capacity: 10,
        assigned: 8,
        arrived: 3,
        dietaryNotes: 2,
        mealCounts: [
          { meal: 'Chicken', count: 5 },
          { meal: '=cmd', count: 1 },
        ],
      }],
    });

    expect(csv).toContain('"Table","Capacity","Assigned","Arrived","Dietary Notes","Meal Counts"');
    expect(csv).toContain('"Family ""A"""');
    expect(csv).toContain("Chicken: 5; '=cmd: 1");
  });

  it('derives assigned, arrived, unassigned, and table guest sets', () => {
    expect([...buildAssignedGuestIdSet(assignments)]).toEqual(['g1', 'g2']);
    expect([...buildArrivedGuestIdSet(assignments)]).toEqual(['g1']);
    expect(getUnassignedAttendingGuests(guests, assignments)).toEqual([]);
    expect(getGuestsAssignedToTable(guests, assignments, 't1').map((guest) => guest.id)).toEqual(['g1']);
    expect(getAssignmentsForTable(assignments, 't2').map((assignment) => assignment.id)).toEqual(['a2']);
  });

  it('keeps seat picker scoped to unassigned guests or the active seat', () => {
    expect(getSeatPickerOptions({ guests, assignments, tableId: 't1', seatIndex: 1, query: 'avery' }).map((guest) => guest.id)).toEqual(['g1']);
    expect(getSeatPickerOptions({ guests, assignments, tableId: 't1', seatIndex: 1, query: 'bailey' })).toEqual([]);
  });

  it('filters check-in candidates by arrival and seating state', () => {
    const arrivedIds = buildArrivedGuestIdSet(assignments);
    const assignedIds = buildAssignedGuestIdSet(assignments);

    expect(countArrivedAttendingGuests(guests, arrivedIds)).toBe(1);
    expect(getCheckInCandidates({ guests, arrivedIds, assignedIds, filter: 'arrived', query: '' }).map((guest) => guest.id)).toEqual(['g1']);
    expect(getCheckInCandidates({ guests, arrivedIds, assignedIds, filter: 'not_arrived', query: 'bailey' }).map((guest) => guest.id)).toEqual(['g2']);
    expect(getCheckInCandidates({ guests, arrivedIds, assignedIds, filter: 'unseated', query: '' })).toEqual([]);
  });

  it('builds demo auto tables with stable positions and safe capacity', () => {
    const generated = buildDemoAutoTables({
      seatingEventId: 'seating-1',
      attendingCount: 17,
      capacity: 8,
      existingTableCount: 2,
      now: 123,
    });

    expect(generated).toHaveLength(3);
    expect(generated[0]).toMatchObject({
      id: 'demo-auto-table-123-0',
      table_name: 'Table 3',
      capacity: 8,
      sort_order: 2,
      layout_x: 744,
      layout_y: 24,
    });
    expect(buildDemoAutoTables({ seatingEventId: 'seating-1', attendingCount: 2, capacity: 0, existingTableCount: 0, now: 123 })[0].capacity).toBe(1);
  });

  it('builds demo auto-seat assignments without reseating existing guests', () => {
    const generated = buildDemoAutoSeatAssignments({
      seatingEventId: 'seating-1',
      guests: [
        ...guests,
        { id: 'g4', full_name: 'Drew Unassigned', email: null, rsvp_status: 'attending', household_id: null, group_name: null, is_attending: true, is_invited_to_event: true },
      ],
      tables,
      existingAssignments: assignments,
    });

    expect(generated).toEqual([{
      id: 'demo-auto-assign-g4',
      seating_event_id: 'seating-1',
      table_id: 't1',
      guest_id: 'g4',
      seat_index: 2,
      is_valid: true,
    }]);
  });

  it('builds escaped print and SVG exports from seating data', () => {
    const html = buildSeatingReportHtml({
      eventName: 'Dinner <Final>',
      createdLabel: 'May 5 <Now>',
      guests,
      tables,
      assignments,
      counters: { invited: 3, attending: 2, declined: 1, pending: 0, seated: 2, unassigned: 0 },
      arrivedCount: 1,
    });
    const svg = buildSeatingLayoutSvg({ eventName: 'Dinner <Final>', tables, assignments });

    expect(html).toContain('Dinner &lt;Final&gt;');
    expect(html).toContain('Head &lt;Table&gt;');
    expect(html).toContain('Avery Guest');
    expect(svg).toContain('Dinner Final seating layout');
    expect(svg).toContain('Head Table (1/8)');
  });
});
