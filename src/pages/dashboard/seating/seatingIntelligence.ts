import type { EventCounters, EligibleGuest, SeatingAssignment, SeatingTable } from './seatingService';

export interface SeatingInsightAction {
  label: string;
  mode: 'auto-seat' | 'auto-create' | 'check-drift' | 'check-in' | 'open-coordinator';
}

export interface SeatingInsightCardModel {
  eyebrow: string;
  readinessLabel: string;
  title: string;
  detail: string;
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  badges: string[];
  callouts: string[];
  sequence: Array<{
    id: 'stabilize' | 'shape' | 'handoff';
    status: 'current' | 'next' | 'then';
    title: string;
    detail: string;
  }>;
  primaryAction?: SeatingInsightAction;
  secondaryAction?: SeatingInsightAction;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildSeatingSequence(
  current: { title: string; detail: string },
  next: { title: string; detail: string },
  then: { title: string; detail: string },
) {
  return [
    {
      id: 'stabilize' as const,
      status: 'current' as const,
      title: current.title,
      detail: current.detail,
    },
    {
      id: 'shape' as const,
      status: 'next' as const,
      title: next.title,
      detail: next.detail,
    },
    {
      id: 'handoff' as const,
      status: 'then' as const,
      title: then.title,
      detail: then.detail,
    },
  ];
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
      readinessLabel: 'Needs drift cleanup',
      title: 'RSVP drift changed the room',
      detail: `${pluralize(invalidCount, 'assignment')} no longer match current RSVP truth. Clear that drift first so you are not making layout decisions on stale attendance.`,
      focusTitle: 'Clean the attendance truth before you rebalance',
      focusDetail: 'When RSVP drift is still muddying the room, every layout decision after that becomes suspect. Fix the truth first, then move seats.',
      bestNextMove: 'Run the assignment check first, clear the invalid seats, and only then come back for rebalancing or fresh placements.',
      decisionRule: 'Do not rebalance tables until the attendance truth is clean again.',
      badges: [
        `${pluralize(invalidCount, 'invalid seat')}`,
        `${pluralize(safeCounters.unassigned, 'guest')} unassigned`,
      ],
      callouts: [
        'Run the assignment check before moving more guests.',
        'Once the drift is clear, auto-seat can help with the remaining open guests.',
      ],
      sequence: buildSeatingSequence(
        {
          title: 'Clear the stale assignments first',
          detail: 'Fix the seats that no longer match RSVP truth before you trust any later room decision.',
        },
        {
          title: 'Place the remaining open guests next',
          detail: safeCounters.unassigned > 0
            ? 'Once the drift is gone, finish the open placements so the room becomes fully readable again.'
            : 'After the drift clears, confirm the room shape still holds without reopening every table.',
        },
        {
          title: 'Return to balance only after truth holds',
          detail: 'Let rebalancing or live support happen after the room is honest, not while it is still compensating for stale attendance.',
        },
      ),
      primaryAction: { label: 'Check assignments', mode: 'check-drift' },
      secondaryAction: safeCounters.unassigned > 0 ? { label: 'Auto-seat guests', mode: 'auto-seat' } : undefined,
    };
  }

  if (tables.length === 0 && safeCounters.attending > 0) {
    return {
      eyebrow: 'Seating coach',
      readinessLabel: 'Room still unbuilt',
      title: 'Build the room before you place people',
      detail: `${pluralize(safeCounters.attending, 'attending guest')} are ready to seat, but there are no tables yet. Auto-create gives you a calmer first pass than building the room one object at a time.`,
      focusTitle: 'Create the room shape before you optimize it',
      focusDetail: 'A usable room outline does more good right now than hand-crafting tables one by one without seeing the full guest shape.',
      bestNextMove: 'Auto-create the first room layout now, then use manual edits only after the full guest shape is finally visible.',
      decisionRule: 'Create the room shape first, then use manual edits only for special cases.',
      badges: [
        `${pluralize(safeCounters.attending, 'attending guest')}`,
        'No tables yet',
      ],
      callouts: [
        'Start with a sensible table count, then tighten special cases manually.',
      ],
      sequence: buildSeatingSequence(
        {
          title: 'Auto-create the first room shape',
          detail: 'Give the guest list a visible room outline before you spend time placing or polishing individual tables.',
        },
        {
          title: 'Check the full guest shape against that room',
          detail: 'Once the first layout exists, you can see whether the table count and capacities actually support the attendance truth.',
        },
        {
          title: 'Save manual edits for special cases later',
          detail: 'Only after the room exists should hand-crafted tweaks start solving real edge cases instead of guessing ahead of the shape.',
        },
      ),
      primaryAction: { label: 'Auto-create tables', mode: 'auto-create' },
    };
  }

  if (safeCounters.unassigned > 0) {
    return {
      eyebrow: 'Seating coach',
      readinessLabel: 'Placement first',
      title: 'Finish the open seats before polishing table details',
      detail: `${pluralize(safeCounters.unassigned, 'guest')} still need a seat. The quickest way to calm the board is getting everyone placed, then adjusting the room once the whole guest list is visible.`,
      focusTitle: 'Get everyone placed before you perfect the room',
      focusDetail: 'You can only judge balance honestly once the full guest list is seated, so placement beats polish at this stage.',
      bestNextMove: 'Auto-seat the remaining guests now, then return for comfort or balance passes only after every attending guest has a real seat.',
      decisionRule: 'Get everyone into a seat before you spend energy on micro-optimizing the room.',
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
      sequence: buildSeatingSequence(
        {
          title: 'Get every attending guest into a seat',
          detail: 'Use this pass to turn the full guest list into a complete room before you judge comfort or aesthetics.',
        },
        {
          title: 'Check the room for household and capacity friction',
          detail: 'Once everyone is placed, look at the few split or tight pockets that still deserve attention.',
        },
        {
          title: 'Return for comfort passes only after coverage exists',
          detail: 'Let balance work happen after the room is fully seated instead of while the basic shape is still incomplete.',
        },
      ),
      primaryAction: { label: 'Auto-seat guests', mode: 'auto-seat' },
      secondaryAction: householdStats.splitHouseholdCount > 0 ? { label: 'Check arrivals', mode: 'check-in' } : undefined,
    };
  }

  if (tableStats.sparseTableCount > 0 || householdStats.splitHouseholdCount > 0) {
    return {
      eyebrow: 'Seating coach',
      readinessLabel: 'Balance pass',
      title: 'The room is seated, so now it is about balance',
      detail: tableStats.sparseTableCount > 0
        ? `${pluralize(tableStats.sparseTableCount, 'table')} still look sparse enough to tighten. This is a good moment to reduce awkward empty pockets and keep groups together.`
        : 'Everyone has a seat, but a few households are still split in ways that may feel clumsy on the day.',
      focusTitle: 'Tighten comfort, not the whole plan',
      focusDetail: 'With everyone placed, the job now is small quality moves that improve comfort without reopening the entire room.',
      bestNextMove: 'Use check-in or the assignment review to tighten the sparse or split pockets, then leave the rest of the room alone.',
      decisionRule: 'Tighten only the pockets that improve comfort; avoid reopening the whole room.',
      badges: [
        `${pluralize(tableStats.sparseTableCount, 'sparse table')}`,
        `${pluralize(householdStats.splitHouseholdCount, 'split household')}`,
      ],
      callouts: [
        householdStats.largestHouseholdSize > 3 ? `Largest attending household size: ${householdStats.largestHouseholdSize}.` : 'No very large households are complicating the room.',
        `${arrivedCount} guests already marked arrived in this event.`,
      ],
      sequence: buildSeatingSequence(
        {
          title: 'Tighten the awkward pockets first',
          detail: 'Use sparse tables or split households as the only places that still deserve room attention.',
        },
        {
          title: 'Check the room against arrival flow',
          detail: 'Once the comfort pockets improve, verify that the room still supports easy check-in and live movement.',
        },
        {
          title: 'Leave the rest of the room alone',
          detail: 'After the comfort pass, preserve the stable parts of the layout instead of reopening the whole seating plan.',
        },
      ),
      primaryAction: { label: 'Open check-in mode', mode: 'check-in' },
      secondaryAction: { label: 'Check assignments', mode: 'check-drift' },
    };
  }

  if (daysUntilWedding !== null && daysUntilWedding <= 7) {
    return {
      eyebrow: 'Seating coach',
      readinessLabel: 'Live-day ready',
      title: 'The room is set, so live handoff matters more than more reshuffling',
      detail: daysUntilWedding === 0
        ? 'Guests already have seats, so the best move now is using the room to support check-in speed and live coordinator clarity instead of reopening settled tables.'
        : 'With the wedding this close, seat changes should stay intentional. Keep the room stable and use coordinator mode for the live day plan around it.',
      focusTitle: 'Use seating as live support now',
      focusDetail: 'At this point the room should help the door and the coordinator, not keep behaving like a design exercise.',
      bestNextMove: 'Open check-in first, then move into coordinator mode only for the live issues that actually need a room-aware decision.',
      decisionRule: 'Treat seating as live support now, not as a layout puzzle to keep solving.',
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
      sequence: buildSeatingSequence(
        {
          title: 'Use the room to support the door first',
          detail: 'Check-in and arrival clarity matter more now than one more round of table tinkering.',
        },
        {
          title: 'Check live issues for room-aware exceptions',
          detail: 'After the door is steady, use coordinator pressure to decide whether any table change actually matters.',
        },
        {
          title: 'Leave the settled tables settled',
          detail: 'Once live support is working, protect the room from unnecessary churn unless reality truly changes.',
        },
      ),
      primaryAction: { label: 'Open check-in mode', mode: 'check-in' },
      secondaryAction: { label: 'Open coordinator mode', mode: 'open-coordinator' },
    };
  }

  return {
    eyebrow: 'Seating coach',
    readinessLabel: 'Calm room',
    title: 'The seating board is calm enough to run the day',
    detail: 'Everyone who is attending has a seat, the room is not obviously lopsided, and no RSVP drift is muddying the plan. This is the point where check-in speed matters more than layout surgery.',
    focusTitle: 'Preserve the calm instead of inventing more work',
    focusDetail: 'A steady room is something to protect. The best move is keeping the live flow easy, not reopening tables that are already working.',
    bestNextMove: 'Leave the room stable, use check-in as the live tool, and only reopen tables when guest truth or live conditions genuinely change.',
    decisionRule: 'Use the room to support the door and the coordinator, not to invent more seating work.',
    badges: [
      `${pluralize(safeCounters.seated, 'guest')} seated`,
      `${arrivedCount} arrived`,
    ],
    callouts: [
      'Use check-in mode as the live tool and avoid unnecessary table churn now.',
    ],
    sequence: buildSeatingSequence(
      {
        title: 'Keep the room steady',
        detail: 'Treat the settled layout as a support asset, not as a design surface that needs more work.',
      },
      {
        title: 'Check live conditions before reopening anything',
        detail: 'Only guest-truth changes or real arrival friction should pull the room back into active editing.',
      },
      {
        title: 'Let check-in and coordination carry the rest',
        detail: 'When the room is calm, the live-day tools should handle the day without dragging seating back into churn.',
      },
    ),
    primaryAction: { label: 'Open check-in mode', mode: 'check-in' },
  };
}
