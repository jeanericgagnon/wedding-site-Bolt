import { describe, expect, it } from 'vitest';
import { buildSeatingInsightCard } from './seatingIntelligence';
import type { EligibleGuest, SeatingAssignment, SeatingTable } from './seatingService';

function makeGuest(id: string, overrides: Partial<EligibleGuest> = {}): EligibleGuest {
  return {
    id,
    full_name: `Guest ${id}`,
    email: null,
    rsvp_status: 'attending',
    household_id: null,
    group_name: null,
    is_attending: true,
    is_invited_to_event: true,
    ...overrides,
  };
}

function makeAssignment(id: string, guestId: string, tableId: string): SeatingAssignment {
  return {
    id,
    seating_event_id: 'se1',
    table_id: tableId,
    guest_id: guestId,
    seat_index: 1,
    is_valid: true,
  };
}

const baseTables: SeatingTable[] = [
  { id: 't1', seating_event_id: 'se1', table_name: 'Table 1', capacity: 4, sort_order: 0, notes: '', table_shape: 'round', layout_width: 260, layout_height: 150, layout_x: 0, layout_y: 0, rotation_deg: 0 },
];

describe('buildSeatingInsightCard', () => {
  it('prioritizes invalid RSVP drift first', () => {
    const result = buildSeatingInsightCard({
      counters: { invited: 4, attending: 4, declined: 0, pending: 0, seated: 4, unassigned: 0 },
      guests: [makeGuest('1'), makeGuest('2')],
      tables: baseTables,
      assignments: [makeAssignment('a1', '1', 't1')],
      invalidCount: 2,
      arrivedCount: 0,
    });

    expect(result.title).toContain('RSVP drift');
    expect(result.readinessLabel).toBe('Needs drift cleanup');
    expect(result.focusTitle).toMatch(/attendance truth/i);
    expect(result.focusDetail).toMatch(/Fix the truth first/i);
    expect(result.bestNextMove).toMatch(/assignment check|invalid seats|rebalancing/i);
    expect(result.decisionRule).toMatch(/attendance truth/i);
    expect(result.sequence.map((step) => step.status)).toEqual(['current', 'next', 'then']);
    expect(result.sequence[0]?.title).toMatch(/stale assignments|Clear/i);
    expect(result.primaryAction).toMatchObject({ mode: 'check-drift' });
  });

  it('recommends auto-creating tables when guests exist but the room is empty', () => {
    const result = buildSeatingInsightCard({
      counters: { invited: 6, attending: 6, declined: 0, pending: 0, seated: 0, unassigned: 6 },
      guests: [makeGuest('1'), makeGuest('2')],
      tables: [],
      assignments: [],
      invalidCount: 0,
      arrivedCount: 0,
    });

    expect(result.primaryAction).toMatchObject({ mode: 'auto-create' });
    expect(result.readinessLabel).toBe('Room still unbuilt');
  });

  it('recommends auto-seating when guests are still unassigned', () => {
    const result = buildSeatingInsightCard({
      counters: { invited: 6, attending: 6, declined: 0, pending: 0, seated: 3, unassigned: 3 },
      guests: [
        makeGuest('1', { household_id: 'h1' }),
        makeGuest('2', { household_id: 'h1' }),
        makeGuest('3'),
      ],
      tables: baseTables,
      assignments: [makeAssignment('a1', '1', 't1')],
      invalidCount: 0,
      arrivedCount: 0,
    });

    expect(result.primaryAction).toMatchObject({ mode: 'auto-seat' });
    expect(result.focusTitle).toMatch(/everyone placed/i);
    expect(result.focusDetail).toMatch(/placement beats polish/i);
    expect(result.bestNextMove).toMatch(/Auto-seat the remaining guests|every attending guest/i);
    expect(result.decisionRule).toMatch(/Get everyone into a seat/i);
    expect(result.sequence[2]?.detail).toMatch(/comfort pass|fully seated|coverage/i);
    expect(result.badges[0]).toContain('open seat');
  });

  it('shifts from layout work to live coordination once the room is settled near the wedding', () => {
    const result = buildSeatingInsightCard({
      counters: { invited: 8, attending: 8, declined: 0, pending: 0, seated: 8, unassigned: 0 },
      guests: [makeGuest('1'), makeGuest('2')],
      tables: baseTables,
      assignments: [makeAssignment('a1', '1', 't1'), makeAssignment('a2', '2', 't1')],
      invalidCount: 0,
      arrivedCount: 3,
      daysUntilWedding: 2,
      liveIssueCount: 1,
    });

    expect(result.title).toContain('room is set');
    expect(result.readinessLabel).toBe('Live-day ready');
    expect(result.focusTitle).toMatch(/live support/i);
    expect(result.focusDetail).toMatch(/door and the coordinator/i);
    expect(result.bestNextMove).toMatch(/Open check-in first|coordinator mode/i);
    expect(result.sequence[1]?.title).toMatch(/room-aware exceptions|live issues/i);
    expect(result.primaryAction).toMatchObject({ mode: 'check-in' });
    expect(result.secondaryAction).toMatchObject({ mode: 'open-coordinator' });
  });
});
