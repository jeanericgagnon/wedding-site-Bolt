import { describe, expect, it } from 'vitest';
import {
  buildCateringKitchenSummaryCsv,
  buildCateringKitchenSummaryRows,
  buildSeatingCateringPacket,
  buildSeatingCateringHandoffReview,
  buildSeatingCateringReadiness,
  cateringRowsToCsv,
} from './seatingCateringExportReadiness';

const tables = [
  { id: 'table-1', table_name: 'Table 1', capacity: 8, sort_order: 1 },
  { id: 'table-2', table_name: 'Table 2', capacity: 8, sort_order: 2 },
];

describe('seating catering export readiness', () => {
  it('marks a complete venue packet ready when guests are seated and meals are recorded', () => {
    const packet = buildSeatingCateringPacket({
      tables,
      guests: [
        {
          id: 'guest-1',
          full_name: 'Maya Stone',
          email: 'maya@example.com',
          is_attending: true,
          meal_choice: 'Fish',
          dietary_restrictions: 'No shellfish',
        },
        {
          id: 'guest-2',
          full_name: 'Leo North',
          email: 'leo@example.com',
          is_attending: true,
          mealChoice: 'Vegetarian',
        },
      ],
      assignments: [
        { guest_id: 'guest-1', table_id: 'table-1', seat_index: 1, is_valid: true, checked_in_at: '2026-05-04T16:00:00Z' },
        { guest_id: 'guest-2', table_id: 'table-1', seat_index: 2, is_valid: true },
      ],
    });

    expect(packet.readiness.status).toBe('ready');
    expect(packet.readiness.assignedCount).toBe(2);
    expect(packet.readiness.mealChoiceCount).toBe(2);
    expect(packet.readiness.dietaryNoteCount).toBe(1);
    expect(packet.tableSummaries[0]).toMatchObject({
      tableName: 'Table 1',
      assigned: 2,
      arrived: 1,
      dietaryNotes: 1,
    });
    expect(packet.tableSummaries[0].mealCounts).toEqual([
      { meal: 'Fish', count: 1 },
      { meal: 'Vegetarian', count: 1 },
    ]);
  });

  it('flags unassigned guests, invalid assignments, and missing meal choices', () => {
    const readiness = buildSeatingCateringReadiness({
      attendingCount: 3,
      tableCount: 2,
      assignedCount: 1,
      unassignedCount: 1,
      invalidAssignmentCount: 1,
      mealChoiceCount: 1,
      dietaryNoteCount: 0,
      checkedInCount: 0,
    });

    expect(readiness.status).toBe('needs-review');
    expect(readiness.summary).toContain('4 items need review');
    expect(readiness.checklist.filter((item) => item.state === 'needs-action').map((item) => item.id)).toEqual([
      'table-assignments',
      'assignment-drift',
      'meal-counts',
      'check-in-sheet',
    ]);
    expect(readiness.checklist.find((item) => item.id === 'dietary-notes')?.state).toBe('planned');
  });

  it('keeps catering CSV explicit when meal data is missing', () => {
    const packet = buildSeatingCateringPacket({
      tables,
      guests: [
        { id: 'guest-1', full_name: 'Ari Lane', email: null, is_attending: true },
        { id: 'guest-2', full_name: 'Sam Reed', email: 'sam@example.com', is_attending: true, notes: 'Nut allergy' },
      ],
      assignments: [
        { guest_id: 'guest-2', table_id: 'missing-table', seat_index: 3, is_valid: true },
      ],
    });

    expect(packet.rows).toEqual([
      expect.objectContaining({
        guestName: 'Sam Reed',
        tableName: 'Unassigned',
        mealChoice: 'No meal recorded',
        dietaryRestrictions: '',
        allergies: '',
        dietaryNotes: 'Nut allergy',
        guestNotes: 'Nut allergy',
        assignmentStatus: 'invalid',
      }),
      expect.objectContaining({
        guestName: 'Ari Lane',
        tableName: 'Unassigned',
        mealChoice: 'No meal recorded',
        dietaryRestrictions: '',
        allergies: '',
        dietaryNotes: '',
        guestNotes: '',
        assignmentStatus: 'unassigned',
      }),
    ]);

    const csv = cateringRowsToCsv(packet.rows);
    expect(csv).toContain('"No meal recorded"');
    expect(csv).toContain('"invalid"');
    expect(csv).toContain('"unassigned"');
    expect(csv).toContain('"Household / Group"');
    expect(csv).toContain('"Dietary Restrictions"');
    expect(csv).toContain('"Allergies"');
  });

  it('builds a grouped kitchen summary with dietary and allergy highlights', () => {
    const packet = buildSeatingCateringPacket({
      tables,
      guests: [
        {
          id: 'guest-1',
          full_name: 'Maya Stone',
          email: 'maya@example.com',
          household_id: 'Stone household',
          is_attending: true,
          meal_choice: 'Fish',
          dietary_restrictions: 'No shellfish',
          allergies: 'Peanut',
        },
        {
          id: 'guest-2',
          full_name: 'Leo North',
          email: 'leo@example.com',
          group_name: 'College friends',
          is_attending: true,
          mealChoice: 'Fish',
          notes: 'Gluten sensitive',
        },
        {
          id: 'guest-3',
          full_name: 'Ari Lane',
          email: 'ari@example.com',
          is_attending: true,
          mealChoice: 'Vegetarian',
        },
      ],
      assignments: [
        { guest_id: 'guest-1', table_id: 'table-1', seat_index: 1, is_valid: true },
        { guest_id: 'guest-2', table_id: 'table-1', seat_index: 2, is_valid: true },
        { guest_id: 'guest-3', table_id: 'table-2', seat_index: 1, is_valid: true },
      ],
    });

    expect(buildCateringKitchenSummaryRows(packet, 'Reception')).toEqual([
      {
        eventName: 'Reception',
        mealChoice: 'Fish',
        guestCount: 2,
        dietaryGuestCount: 2,
        allergyGuestCount: 1,
        tables: 'Table 1',
        dietaryHighlights: 'No shellfish; Peanut; Gluten sensitive',
      },
      {
        eventName: 'Reception',
        mealChoice: 'Vegetarian',
        guestCount: 1,
        dietaryGuestCount: 0,
        allergyGuestCount: 0,
        tables: 'Table 2',
        dietaryHighlights: '',
      },
    ]);

    const csv = buildCateringKitchenSummaryCsv(packet, 'Reception');
    expect(csv).toContain('"Event","Meal Choice","Guest Count","Guests With Dietary Notes","Guests With Allergies","Tables","Dietary Highlights"');
    expect(csv).toContain('"Reception","Fish","2","2","1","Table 1","No shellfish; Peanut; Gluten sensitive"');
  });

  it('builds a venue handoff review from packet source counts and export files', () => {
    const packet = buildSeatingCateringPacket({
      tables,
      guests: [
        {
          id: 'guest-1',
          full_name: 'Maya Stone',
          email: 'maya@example.com',
          is_attending: true,
          meal_choice: 'Fish',
          dietary_restrictions: 'No shellfish',
        },
        {
          id: 'guest-2',
          full_name: 'Leo North',
          email: 'leo@example.com',
          is_attending: true,
          meal_choice: 'Vegetarian',
        },
      ],
      assignments: [
        { guest_id: 'guest-1', table_id: 'table-1', seat_index: 1, is_valid: true },
        { guest_id: 'guest-2', table_id: 'table-1', seat_index: 2, is_valid: true },
      ],
    });

    const review = buildSeatingCateringHandoffReview(packet);

    expect(review.status).toBe('ready');
    expect(review.sourceCounts).toMatchObject({
      attendingGuests: 2,
      tablesWithGuests: 1,
      mealRows: 2,
      dietaryRows: 1,
      invalidAssignments: 0,
      unassignedGuests: 0,
    });
    expect(review.files.map((file) => file.id)).toEqual([
      'catering-csv',
      'kitchen-summary',
      'table-summary',
      'seating-pdf',
      'floor-plan-image',
    ]);
    expect(review.files.every((file) => file.status === 'ready')).toBe(true);
    expect(review.warnings).toEqual([]);
  });

  it('keeps handoff review in review state when source data is incomplete', () => {
    const packet = buildSeatingCateringPacket({
      tables,
      guests: [
        { id: 'guest-1', full_name: 'Ari Lane', email: null, is_attending: true },
        { id: 'guest-2', full_name: 'Sam Reed', email: 'sam@example.com', is_attending: true, notes: 'Nut allergy' },
      ],
      assignments: [
        { guest_id: 'guest-2', table_id: 'missing-table', seat_index: 3, is_valid: true },
      ],
    });

    const review = buildSeatingCateringHandoffReview(packet);

    expect(review.status).toBe('review');
    expect(review.sourceCounts).toMatchObject({
      attendingGuests: 2,
      mealRows: 0,
      dietaryRows: 1,
      invalidAssignments: 1,
      unassignedGuests: 1,
    });
    expect(review.warnings).toEqual([
      '1 attending guest still needs seats before final handoff.',
      '1 assignment needs review after RSVP or table changes.',
      '2 attending guests still need meal choices.',
    ]);
    expect(review.files.find((file) => file.id === 'catering-csv')?.status).toBe('review');
  });
});
