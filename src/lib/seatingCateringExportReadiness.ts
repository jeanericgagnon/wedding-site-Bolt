export type SeatingCateringReadinessStatus = 'ready' | 'needs-review' | 'empty';
export type SeatingCateringChecklistState = 'ready' | 'needs-action' | 'planned';
export type CateringAssignmentStatus = 'assigned' | 'unassigned' | 'invalid';

export interface SeatingCateringGuest {
  id: string;
  full_name: string;
  email?: string | null;
  household_id?: string | null;
  householdId?: string | null;
  group_name?: string | null;
  groupName?: string | null;
  is_attending: boolean;
  meal_choice?: string | null;
  mealChoice?: string | null;
  meal_preference?: string | null;
  mealPreference?: string | null;
  dietary_restrictions?: string | null;
  dietaryRestrictions?: string | null;
  dietary_notes?: string | null;
  dietaryNotes?: string | null;
  allergies?: string | null;
  notes?: string | null;
}

export interface SeatingCateringTable {
  id: string;
  table_name: string;
  capacity: number;
  sort_order?: number | null;
}

export interface SeatingCateringAssignment {
  guest_id: string;
  table_id: string;
  seat_index?: number | null;
  is_valid?: boolean | null;
  checked_in_at?: string | null;
}

export interface CateringPacketRow {
  guestId: string;
  guestName: string;
  email: string;
  householdGroup: string;
  tableName: string;
  seat: string;
  mealChoice: string;
  dietaryRestrictions: string;
  allergies: string;
  dietaryNotes: string;
  guestNotes: string;
  checkedIn: 'Yes' | 'No';
  assignmentStatus: CateringAssignmentStatus;
}

export interface CateringTableSummary {
  tableName: string;
  capacity: number;
  assigned: number;
  arrived: number;
  dietaryNotes: number;
  mealCounts: Array<{ meal: string; count: number }>;
}

export interface SeatingCateringChecklistItem {
  id: string;
  label: string;
  detail: string;
  state: SeatingCateringChecklistState;
}

export interface SeatingCateringReadiness {
  status: SeatingCateringReadinessStatus;
  summary: string;
  attendingCount: number;
  assignedCount: number;
  unassignedCount: number;
  invalidAssignmentCount: number;
  mealChoiceCount: number;
  dietaryNoteCount: number;
  checkedInCount: number;
  checklist: SeatingCateringChecklistItem[];
}

export interface SeatingCateringPacket {
  rows: CateringPacketRow[];
  tableSummaries: CateringTableSummary[];
  readiness: SeatingCateringReadiness;
}

export type SeatingCateringHandoffStatus = 'ready' | 'review';

export interface SeatingCateringHandoffFile {
  id: string;
  label: string;
  format: 'CSV' | 'PDF' | 'Image';
  detail: string;
  status: SeatingCateringHandoffStatus;
}

export interface SeatingCateringHandoffReview {
  status: SeatingCateringHandoffStatus;
  summary: string;
  sourceCounts: {
    attendingGuests: number;
    tablesWithGuests: number;
    mealRows: number;
    dietaryRows: number;
    invalidAssignments: number;
    unassignedGuests: number;
  };
  files: SeatingCateringHandoffFile[];
  warnings: string[];
}

export interface CateringKitchenSummaryRow {
  eventName: string;
  mealChoice: string;
  guestCount: number;
  dietaryGuestCount: number;
  allergyGuestCount: number;
  tables: string;
  dietaryHighlights: string;
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function getGuestMealChoice(guest: SeatingCateringGuest): string {
  return normalizeText(guest.meal_choice)
    || normalizeText(guest.mealChoice)
    || normalizeText(guest.meal_preference)
    || normalizeText(guest.mealPreference)
    || 'No meal recorded';
}

export function getGuestDietaryNotes(guest: SeatingCateringGuest): string {
  return normalizeText(guest.dietary_restrictions)
    || normalizeText(guest.dietaryRestrictions)
    || normalizeText(guest.dietary_notes)
    || normalizeText(guest.dietaryNotes)
    || normalizeText(guest.allergies)
    || normalizeText(guest.notes);
}

export function getGuestDietaryRestrictions(guest: SeatingCateringGuest): string {
  return normalizeText(guest.dietary_restrictions)
    || normalizeText(guest.dietaryRestrictions);
}

export function getGuestAllergies(guest: SeatingCateringGuest): string {
  return normalizeText(guest.allergies);
}

export function getGuestNotes(guest: SeatingCateringGuest): string {
  return normalizeText(guest.notes);
}

export function getGuestHouseholdGroup(guest: SeatingCateringGuest): string {
  return normalizeText(guest.household_id)
    || normalizeText(guest.householdId)
    || normalizeText(guest.group_name)
    || normalizeText(guest.groupName);
}

export function buildSeatingCateringPacket(input: {
  guests: SeatingCateringGuest[];
  tables: SeatingCateringTable[];
  assignments: SeatingCateringAssignment[];
}): SeatingCateringPacket {
  const tableMap = new Map(input.tables.map((table) => [table.id, table]));
  const tableOrder = new Map(input.tables.map((table, index) => [table.id, table.sort_order ?? index]));
  const assignmentMap = new Map(input.assignments.map((assignment) => [assignment.guest_id, assignment]));
  const attendingGuests = input.guests.filter((guest) => guest.is_attending);

  const rows = attendingGuests.map((guest): CateringPacketRow => {
    const assignment = assignmentMap.get(guest.id);
    const table = assignment ? tableMap.get(assignment.table_id) : undefined;
    const assignmentStatus: CateringAssignmentStatus = !assignment
      ? 'unassigned'
      : assignment.is_valid === false || !table
        ? 'invalid'
        : 'assigned';

    return {
      guestId: guest.id,
      guestName: guest.full_name || 'Guest',
      email: guest.email ?? '',
      householdGroup: getGuestHouseholdGroup(guest),
      tableName: table?.table_name ?? 'Unassigned',
      seat: assignment?.seat_index != null ? String(assignment.seat_index) : '',
      mealChoice: getGuestMealChoice(guest),
      dietaryRestrictions: getGuestDietaryRestrictions(guest),
      allergies: getGuestAllergies(guest),
      dietaryNotes: getGuestDietaryNotes(guest),
      guestNotes: getGuestNotes(guest),
      checkedIn: assignment?.checked_in_at ? 'Yes' : 'No',
      assignmentStatus,
    };
  }).sort((a, b) => {
    const aAssignment = assignmentMap.get(a.guestId);
    const bAssignment = assignmentMap.get(b.guestId);
    const aOrder = aAssignment ? tableOrder.get(aAssignment.table_id) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
    const bOrder = bAssignment ? tableOrder.get(bAssignment.table_id) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const seatA = Number(a.seat || Number.MAX_SAFE_INTEGER);
    const seatB = Number(b.seat || Number.MAX_SAFE_INTEGER);
    if (seatA !== seatB) return seatA - seatB;
    return a.guestName.localeCompare(b.guestName);
  });

  const rowsByTable = new Map<string, CateringPacketRow[]>();
  rows.forEach((row) => {
    if (row.assignmentStatus !== 'assigned') return;
    if (!rowsByTable.has(row.tableName)) rowsByTable.set(row.tableName, []);
    rowsByTable.get(row.tableName)!.push(row);
  });

  const tableSummaries = input.tables
    .map((table) => {
      const tableRows = rowsByTable.get(table.table_name) ?? [];
      const mealCounts = new Map<string, number>();
      tableRows.forEach((row) => {
        mealCounts.set(row.mealChoice, (mealCounts.get(row.mealChoice) ?? 0) + 1);
      });

      return {
        tableName: table.table_name,
        capacity: table.capacity,
        assigned: tableRows.length,
        arrived: tableRows.filter((row) => row.checkedIn === 'Yes').length,
        dietaryNotes: tableRows.filter((row) => row.dietaryNotes.length > 0).length,
        mealCounts: Array.from(mealCounts.entries())
          .map(([meal, count]) => ({ meal, count }))
          .sort((a, b) => b.count - a.count || a.meal.localeCompare(b.meal)),
      };
    })
    .filter((summary) => summary.assigned > 0)
    .sort((a, b) => b.assigned - a.assigned || a.tableName.localeCompare(b.tableName));

  const assignedCount = rows.filter((row) => row.assignmentStatus === 'assigned').length;
  const invalidAssignmentCount = rows.filter((row) => row.assignmentStatus === 'invalid').length;
  const unassignedCount = rows.filter((row) => row.assignmentStatus === 'unassigned').length;
  const mealChoiceCount = rows.filter((row) => row.mealChoice !== 'No meal recorded').length;
  const dietaryNoteCount = rows.filter((row) => row.dietaryNotes.length > 0).length;
  const checkedInCount = rows.filter((row) => row.checkedIn === 'Yes').length;

  const readiness = buildSeatingCateringReadiness({
    attendingCount: attendingGuests.length,
    tableCount: input.tables.length,
    assignedCount,
    unassignedCount,
    invalidAssignmentCount,
    mealChoiceCount,
    dietaryNoteCount,
    checkedInCount,
  });

  return { rows, tableSummaries, readiness };
}

export function buildSeatingCateringReadiness(input: {
  attendingCount: number;
  tableCount: number;
  assignedCount: number;
  unassignedCount: number;
  invalidAssignmentCount: number;
  mealChoiceCount: number;
  dietaryNoteCount: number;
  checkedInCount: number;
}): SeatingCateringReadiness {
  const hasAttendingGuests = input.attendingCount > 0;
  const hasTables = input.tableCount > 0;
  const allAssigned = hasAttendingGuests && input.assignedCount === input.attendingCount && input.invalidAssignmentCount === 0;
  const hasMealCoverage = hasAttendingGuests && input.mealChoiceCount === input.attendingCount;
  const hasCheckInSheet = allAssigned;

  const checklist: SeatingCateringChecklistItem[] = [
    {
      id: 'table-assignments',
      label: 'Table assignments',
      detail: allAssigned
        ? `${input.assignedCount} attending guests are seated.`
        : `${input.unassignedCount} attending guests still need seats.`,
      state: allAssigned ? 'ready' : 'needs-action',
    },
    {
      id: 'assignment-drift',
      label: 'RSVP drift check',
      detail: input.invalidAssignmentCount === 0
        ? 'No invalid assignments are known.'
        : `${input.invalidAssignmentCount} assignment${input.invalidAssignmentCount === 1 ? '' : 's'} need review after RSVP changes.`,
      state: input.invalidAssignmentCount === 0 ? 'ready' : 'needs-action',
    },
    {
      id: 'meal-counts',
      label: 'Meal counts',
      detail: hasMealCoverage
        ? 'Every attending guest has a meal recorded.'
        : `${Math.max(0, input.attendingCount - input.mealChoiceCount)} attending guest${input.attendingCount - input.mealChoiceCount === 1 ? '' : 's'} still need meal choices.`,
      state: hasMealCoverage ? 'ready' : 'needs-action',
    },
    {
      id: 'dietary-notes',
      label: 'Dietary notes',
      detail: input.dietaryNoteCount > 0
        ? `${input.dietaryNoteCount} guest${input.dietaryNoteCount === 1 ? '' : 's'} have notes for catering.`
        : 'No dietary notes are recorded yet.',
      state: input.dietaryNoteCount > 0 ? 'ready' : 'planned',
    },
    {
      id: 'check-in-sheet',
      label: 'Check-in sheet',
      detail: hasCheckInSheet
        ? `${input.checkedInCount} guests are already marked arrived.`
        : 'Seat attending guests before relying on the check-in sheet.',
      state: hasCheckInSheet ? 'ready' : 'needs-action',
    },
    {
      id: 'packet-exports',
      label: 'Packet exports',
      detail: hasTables && hasAttendingGuests
        ? 'CSV, table summary, PDF, and catering CSV can be exported from this page.'
        : 'Create tables and add attending guests before exporting venue packets.',
      state: hasTables && hasAttendingGuests ? 'ready' : 'needs-action',
    },
  ];

  const blockingItems = checklist.filter((item) => item.state === 'needs-action').length;
  const status: SeatingCateringReadinessStatus = !hasAttendingGuests || !hasTables
    ? 'empty'
    : blockingItems > 0
      ? 'needs-review'
      : 'ready';

  const summary = status === 'ready'
    ? 'Ready to hand to the venue and caterer.'
    : status === 'empty'
      ? 'Add attending guests and tables before building a venue packet.'
      : `${blockingItems} item${blockingItems === 1 ? '' : 's'} need review before this packet is venue-ready.`;

  return {
    status,
    summary,
    attendingCount: input.attendingCount,
    assignedCount: input.assignedCount,
    unassignedCount: input.unassignedCount,
    invalidAssignmentCount: input.invalidAssignmentCount,
    mealChoiceCount: input.mealChoiceCount,
    dietaryNoteCount: input.dietaryNoteCount,
    checkedInCount: input.checkedInCount,
    checklist,
  };
}

export function cateringRowsToCsv(rows: CateringPacketRow[]): string {
  const csvRows = [
    ['Guest Name', 'Email', 'Household / Group', 'Table', 'Seat', 'Meal Choice', 'Dietary Restrictions', 'Allergies', 'Dietary Notes', 'Guest Notes', 'Checked In', 'Assignment Status'],
    ...rows.map((row) => [
      row.guestName,
      row.email,
      row.householdGroup,
      row.tableName,
      row.seat,
      row.mealChoice,
      row.dietaryRestrictions,
      row.allergies,
      row.dietaryNotes,
      row.guestNotes,
      row.checkedIn,
      row.assignmentStatus,
    ]),
  ];

  return csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function buildCateringKitchenSummaryRows(packet: SeatingCateringPacket, eventName: string): CateringKitchenSummaryRow[] {
  const safeEventName = normalizeText(eventName) || 'Event';
  const mealMap = new Map<string, {
    guestCount: number;
    dietaryGuestCount: number;
    allergyGuestCount: number;
    tables: Set<string>;
    dietaryHighlights: Set<string>;
  }>();

  packet.rows.forEach((row) => {
    const key = row.mealChoice || 'No meal recorded';
    const entry = mealMap.get(key) ?? {
      guestCount: 0,
      dietaryGuestCount: 0,
      allergyGuestCount: 0,
      tables: new Set<string>(),
      dietaryHighlights: new Set<string>(),
    };
    entry.guestCount += 1;
    if (row.dietaryRestrictions || row.dietaryNotes) entry.dietaryGuestCount += 1;
    if (row.allergies) entry.allergyGuestCount += 1;
    if (row.tableName && row.tableName !== 'Unassigned') entry.tables.add(row.tableName);
    [row.dietaryRestrictions, row.allergies, row.dietaryNotes]
      .map((value) => normalizeText(value))
      .filter(Boolean)
      .forEach((value) => entry.dietaryHighlights.add(value));
    mealMap.set(key, entry);
  });

  return Array.from(mealMap.entries())
    .map(([mealChoice, entry]) => ({
      eventName: safeEventName,
      mealChoice,
      guestCount: entry.guestCount,
      dietaryGuestCount: entry.dietaryGuestCount,
      allergyGuestCount: entry.allergyGuestCount,
      tables: Array.from(entry.tables).sort((a, b) => a.localeCompare(b)).join('; '),
      dietaryHighlights: Array.from(entry.dietaryHighlights).slice(0, 6).join('; '),
    }))
    .sort((a, b) => b.guestCount - a.guestCount || a.mealChoice.localeCompare(b.mealChoice));
}

export function buildCateringKitchenSummaryCsv(packet: SeatingCateringPacket, eventName: string): string {
  const rows = buildCateringKitchenSummaryRows(packet, eventName);
  const csvRows = [
    ['Event', 'Meal Choice', 'Guest Count', 'Guests With Dietary Notes', 'Guests With Allergies', 'Tables', 'Dietary Highlights'],
    ...rows.map((row) => [
      row.eventName,
      row.mealChoice,
      String(row.guestCount),
      String(row.dietaryGuestCount),
      String(row.allergyGuestCount),
      row.tables,
      row.dietaryHighlights,
    ]),
  ];

  return csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function buildSeatingCateringHandoffReview(packet: SeatingCateringPacket): SeatingCateringHandoffReview {
  const hasRows = packet.rows.length > 0;
  const hasTables = packet.tableSummaries.length > 0;
  const mealRows = packet.rows.filter((row) => row.mealChoice !== 'No meal recorded').length;
  const dietaryRows = packet.rows.filter((row) => row.dietaryNotes.length > 0).length;
  const invalidAssignments = packet.rows.filter((row) => row.assignmentStatus === 'invalid').length;
  const unassignedGuests = packet.rows.filter((row) => row.assignmentStatus === 'unassigned').length;
  const needsAssignmentReview = invalidAssignments > 0 || unassignedGuests > 0;

  const files: SeatingCateringHandoffFile[] = [
    {
      id: 'catering-csv',
      label: 'Catering CSV',
      format: 'CSV',
      detail: hasRows
        ? `${packet.rows.length} attending guest row${packet.rows.length === 1 ? '' : 's'} with household, meal, dietary, allergy, table, seat, and check-in columns.`
        : 'Add attending guests before exporting a catering row file.',
      status: hasRows && !needsAssignmentReview ? 'ready' : 'review',
    },
    {
      id: 'kitchen-summary',
      label: 'Kitchen summary',
      format: 'CSV',
      detail: hasRows
        ? 'Grouped meal counts plus dietary and allergy highlights for kitchen prep.'
        : 'Add attending guests before exporting a kitchen summary.',
      status: hasRows ? 'ready' : 'review',
    },
    {
      id: 'table-summary',
      label: 'Table summary',
      format: 'CSV',
      detail: hasTables
        ? `${packet.tableSummaries.length} table${packet.tableSummaries.length === 1 ? '' : 's'} with assigned guests, arrivals, dietary counts, and meal totals.`
        : 'Seat guests at tables before the table summary is useful.',
      status: hasTables ? 'ready' : 'review',
    },
    {
      id: 'seating-pdf',
      label: 'Printable seating packet',
      format: 'PDF',
      detail: packet.readiness.assignedCount > 0
        ? 'Printable table list is available for venue handoff review.'
        : 'Seat at least one guest before using the printable packet.',
      status: packet.readiness.assignedCount > 0 ? 'ready' : 'review',
    },
    {
      id: 'floor-plan-image',
      label: 'Floor plan image',
      format: 'Image',
      detail: 'Image export captures the current visual layout for a coordinator reference.',
      status: hasTables ? 'ready' : 'review',
    },
  ];

  const warnings = [
    unassignedGuests > 0
      ? `${unassignedGuests} attending guest${unassignedGuests === 1 ? '' : 's'} still ${unassignedGuests === 1 ? 'needs' : 'need'} seats before final handoff.`
      : '',
    invalidAssignments > 0
      ? `${invalidAssignments} assignment${invalidAssignments === 1 ? '' : 's'} ${invalidAssignments === 1 ? 'needs' : 'need'} review after RSVP or table changes.`
      : '',
    mealRows < packet.rows.length && hasRows
      ? `${packet.rows.length - mealRows} attending guest${packet.rows.length - mealRows === 1 ? '' : 's'} still ${packet.rows.length - mealRows === 1 ? 'needs' : 'need'} meal choices.`
      : '',
  ].filter(Boolean);

  const status: SeatingCateringHandoffStatus = warnings.length === 0 && hasRows && hasTables ? 'ready' : 'review';

  return {
    status,
    summary: status === 'ready'
      ? 'Packet files are ready for a venue or catering review.'
      : 'Review the source counts before handing this packet to the venue.',
    sourceCounts: {
      attendingGuests: packet.rows.length,
      tablesWithGuests: packet.tableSummaries.length,
      mealRows,
      dietaryRows,
      invalidAssignments,
      unassignedGuests,
    },
    files,
    warnings,
  };
}
