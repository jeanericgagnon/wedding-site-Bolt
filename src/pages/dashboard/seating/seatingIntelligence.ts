import type { EventCounters, EligibleGuest, SeatingAssignment, SeatingTable } from './seatingService';

export interface SeatingInsightAction {
  label: string;
  mode: 'auto-seat' | 'auto-create' | 'check-drift' | 'check-in' | 'open-coordinator';
}

export interface SeatingInsightCardModel {
  eyebrow: string;
  title: string;
  detail: string;
  badges: string[];
  callouts: string[];
  primaryAction?: SeatingInsightAction;
  secondaryAction?: SeatingInsightAction;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildHouseholdStats(guests: EligibleGuest[], assignments: SeatingAssignment[]) {
  const assignedGuestIds = new Set(assignments.filter((assignment) => assignment.is_valid).map((assignment) => assignment.guest_id));
  const householdMap = new Map<string, { total: number; assigned: number }>();

  guests
    .filter((guest) => guest.is_attending)
    .forEach((guest) => {
      const key = guest.household_id || guest.group_name || guest.id;
      const current = householdMap.get(key) ?? { total: 0, assigned: 0 };
      current.total += 1;
      if (assignedGuestIds.has(guest.id)) current.assigned += 1;
      householdMap.set(key, current);
    });

  const splitHouseholds = Array.from(householdMap.values()).filter((value) => value.assigned > 0 && value.assigned < value.total);

  return {
    householdCount: householdMap.size,
    splitHouseholdCount: splitHouseholds.length,
    largestHouseholdSize: Math.max(0, ...Array.from(householdMap.values()).map((value) => value.total)),
  };
}

function buildTableStats(tables: SeatingTable[], assignments: SeatingAssignment[]) {
  const occupancy = tables.map((table) => ({
    name: table.table_name || 'Table',
    capacity: table.capacity,
    assigned: assignments.filter((assignment) => assignment.table_id === table.id && assignment.is_valid).length,
  }));

  const tightTables = occupancy.filter((row) => row.capacity > 0 && row.assigned >= row.capacity);
  const sparseTables = occupancy.filter((row) => row.capacity >= 6 && row.assigned > 0 && row.assigned <= Math.max(2, Math.floor(row.capacity / 3)));

  return {
    tightTableCount: tightTables.length,
    sparseTableCount: sparseTables.length,
  };
}

export function buildSeatingInsightCard(args: {
  counters: EventCounters | null;
  guests: EligibleGuest[];
  tables: SeatingTable[];
  assignments: SeatingAssignment[];
  invalidCount: number;
  arrivedCount: number;
  daysUntilWedding?: number | null;
  liveIssueCount?: number;
}): SeatingInsightCardModel {
  const { counters, guests, tables, assignments, invalidCount, arrivedCount, daysUntilWedding = null, liveIssueCount = 0 } = args;
  const safeCounters = counters ?? {
    invited: 0,
    attending: 0,
    declined: 0,
    pending: 0,
    seated: 0,
    unassigned: 0,
  };

  const householdStats = buildHouseholdStats(guests, assignments);
  const tableStats = buildTableStats(tables, assignments);

  if (invalidCount > 0) {
    return {
      eyebrow: 'Seating coach',
      title: 'RSVP drift changed the room',
      detail: `${pluralize(invalidCount, 'assignment')} no longer match current RSVP truth. Clear that drift first so you are not making layout decisions on stale attendance.`,
      badges: [
        `${pluralize(invalidCount, 'invalid seat')}`,
        `${pluralize(safeCounters.unassigned, 'guest')} unassigned`,
      ],
      callouts: [
        'Run the assignment check before moving more guests.',
        'Once the drift is clear, auto-seat can help with the remaining open guests.',
      ],
      primaryAction: { label: 'Check assignments', mode: 'check-drift' },
      secondaryAction: safeCounters.unassigned > 0 ? { label: 'Auto-seat guests', mode: 'auto-seat' } : undefined,
    };
  }

  if (tables.length === 0 && safeCounters.attending > 0) {
    return {
      eyebrow: 'Seating coach',
      title: 'Build the room before you place people',
      detail: `${pluralize(safeCounters.attending, 'attending guest')} are ready to seat, but there are no tables yet. Auto-create gives you a calmer first pass than building the room one object at a time.`,
      badges: [
        `${pluralize(safeCounters.attending, 'attending guest')}`,
        'No tables yet',
      ],
      callouts: [
        'Start with a sensible table count, then tighten special cases manually.',
      ],
      primaryAction: { label: 'Auto-create tables', mode: 'auto-create' },
    };
  }

  if (safeCounters.unassigned > 0) {
    return {
      eyebrow: 'Seating coach',
      title: 'Finish the open seats before polishing table details',
      detail: `${pluralize(safeCounters.unassigned, 'guest')} still need a seat. The quickest way to calm the board is getting everyone placed, then adjusting the room once the whole guest list is visible.`,
      badges: [
        `${pluralize(safeCounters.unassigned, 'open seat move')}`,
        `${pluralize(householdStats.splitHouseholdCount, 'split household')}`,
      ],
      callouts: [
        householdStats.splitHouseholdCount > 0
          ? `${pluralize(householdStats.splitHouseholdCount, 'household')} are split between seated and unseated guests.`
          : 'Most households can still be placed together cleanly.',
        tableStats.tightTableCount > 0
          ? `${pluralize(tableStats.tightTableCount, 'table')} are already full.`
          : 'You still have enough breathing room to auto-seat safely.',
      ],
      primaryAction: { label: 'Auto-seat guests', mode: 'auto-seat' },
      secondaryAction: householdStats.splitHouseholdCount > 0 ? { label: 'Check arrivals', mode: 'check-in' } : undefined,
    };
  }

  if (tableStats.sparseTableCount > 0 || householdStats.splitHouseholdCount > 0) {
    return {
      eyebrow: 'Seating coach',
      title: 'The room is seated, so now it is about balance',
      detail: tableStats.sparseTableCount > 0
        ? `${pluralize(tableStats.sparseTableCount, 'table')} still look sparse enough to tighten. This is a good moment to reduce awkward empty pockets and keep groups together.`
        : 'Everyone has a seat, but a few households are still split in ways that may feel clumsy on the day.',
      badges: [
        `${pluralize(tableStats.sparseTableCount, 'sparse table')}`,
        `${pluralize(householdStats.splitHouseholdCount, 'split household')}`,
      ],
      callouts: [
        householdStats.largestHouseholdSize > 3 ? `Largest attending household size: ${householdStats.largestHouseholdSize}.` : 'No very large households are complicating the room.',
        `${arrivedCount} guests already marked arrived in this event.`,
      ],
      primaryAction: { label: 'Open check-in mode', mode: 'check-in' },
      secondaryAction: { label: 'Check assignments', mode: 'check-drift' },
    };
  }

  if (daysUntilWedding !== null && daysUntilWedding <= 7) {
    return {
      eyebrow: 'Seating coach',
      title: 'The room is set, so live handoff matters more than more reshuffling',
      detail: daysUntilWedding === 0
        ? 'Guests already have seats, so the best move now is using the room to support check-in speed and live coordinator clarity instead of reopening settled tables.'
        : 'With the wedding this close, seat changes should stay intentional. Keep the room stable and use coordinator mode for the live day plan around it.',
      badges: [
        `${pluralize(safeCounters.seated, 'guest')} seated`,
        liveIssueCount > 0 ? `${pluralize(liveIssueCount, 'live issue')}` : `${arrivedCount} arrived`,
      ],
      callouts: [
        'Treat seating as support for the door, not a separate project now.',
        liveIssueCount > 0
          ? 'There is already live coordinator pressure building, so avoid extra room churn.'
          : 'If something changes, adjust only the tables that truly need it.',
      ],
      primaryAction: { label: 'Open check-in mode', mode: 'check-in' },
      secondaryAction: { label: 'Open coordinator mode', mode: 'open-coordinator' },
    };
  }

  return {
    eyebrow: 'Seating coach',
    title: 'The seating board is calm enough to run the day',
    detail: 'Everyone who is attending has a seat, the room is not obviously lopsided, and no RSVP drift is muddying the plan. This is the point where check-in speed matters more than layout surgery.',
    badges: [
      `${pluralize(safeCounters.seated, 'guest')} seated`,
      `${arrivedCount} arrived`,
    ],
    callouts: [
      'Use check-in mode as the live tool and avoid unnecessary table churn now.',
    ],
    primaryAction: { label: 'Open check-in mode', mode: 'check-in' },
  };
}
