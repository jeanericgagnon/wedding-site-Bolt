import { neutralizeSpreadsheetFormula, toSafeCsv } from '../../../lib/csvExport';
import type { SeatingCateringPacket } from '../../../lib/seatingCateringExportReadiness';
import type { EligibleGuest, EventCounters, SeatingAssignment, SeatingTable } from './seatingService';

export const UNASSIGNED_DROPPABLE = 'unassigned-pool';

export type TableShape = 'round' | 'rectangle' | 'bar' | 'dj_booth' | 'dance_floor';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeExportSlug(value: string): string {
  return (value || 'event').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'event';
}

export function getShapeLabel(shape: TableShape): string {
  switch (shape) {
    case 'round': return 'Round Table';
    case 'rectangle': return 'Rectangle Table';
    case 'bar': return 'Service Station';
    case 'dj_booth': return 'Booth';
    case 'dance_floor': return 'Open Zone';
    default: return 'Table';
  }
}

export function getShapePalette(shape: TableShape) {
  switch (shape) {
    case 'round':
      return { chip: 'bg-primary/10 border-primary/30 text-primary', fill: 'bg-primary/5 border-primary/20' };
    case 'rectangle':
      return { chip: 'bg-surface-subtle border-border-subtle text-text-secondary', fill: 'bg-surface-subtle/50 border-border-subtle' };
    case 'bar':
      return { chip: 'bg-surface-subtle border-border-subtle text-text-secondary', fill: 'bg-surface-subtle/50 border-border-subtle' };
    case 'dj_booth':
      return { chip: 'bg-surface-subtle border-border-subtle text-text-secondary', fill: 'bg-surface-subtle/50 border-border-subtle' };
    case 'dance_floor':
      return { chip: 'bg-primary/10 border-primary/25 text-primary', fill: 'bg-primary/5 border-primary/20' };
    default:
      return { chip: 'bg-surface-subtle border-border-subtle text-text-tertiary', fill: 'bg-surface-subtle border-border-subtle' };
  }
}

export function buildTableSummaryCsv(packet: Pick<SeatingCateringPacket, 'tableSummaries'>): string {
  return toSafeCsv([
    ['Table', 'Capacity', 'Assigned', 'Arrived', 'Dietary Notes', 'Meal Counts'],
    ...packet.tableSummaries.map((row) => [
      row.tableName,
      String(row.capacity),
      String(row.assigned),
      String(row.arrived),
      String(row.dietaryNotes),
      row.mealCounts.map((meal) => `${neutralizeSpreadsheetFormula(meal.meal)}: ${meal.count}`).join('; '),
    ]),
  ]);
}

export type SeatingCheckInFilter = 'all' | 'not_arrived' | 'arrived' | 'seated' | 'unseated';

export function buildAssignedGuestIdSet(assignments: Pick<SeatingAssignment, 'guest_id'>[]): Set<string> {
  return new Set(assignments.map((assignment) => assignment.guest_id));
}

export function buildArrivedGuestIdSet(assignments: Pick<SeatingAssignment, 'guest_id' | 'checked_in_at'>[]): Set<string> {
  return new Set(assignments.filter((assignment) => !!assignment.checked_in_at).map((assignment) => assignment.guest_id));
}

export function getUnassignedAttendingGuests(
  guests: EligibleGuest[],
  assignments: Pick<SeatingAssignment, 'guest_id'>[],
): EligibleGuest[] {
  const assignedGuestIds = buildAssignedGuestIdSet(assignments);
  return guests.filter((guest) => guest.is_attending && !assignedGuestIds.has(guest.id));
}

export function getGuestsAssignedToTable(
  guests: EligibleGuest[],
  assignments: Pick<SeatingAssignment, 'table_id' | 'guest_id'>[],
  tableId: string,
): EligibleGuest[] {
  const tableGuestIds = new Set(
    assignments
      .filter((assignment) => assignment.table_id === tableId)
      .map((assignment) => assignment.guest_id),
  );
  return guests.filter((guest) => tableGuestIds.has(guest.id));
}

export function getAssignmentsForTable<T extends Pick<SeatingAssignment, 'table_id'>>(
  assignments: T[],
  tableId: string,
): T[] {
  return assignments.filter((assignment) => assignment.table_id === tableId);
}

export function getSeatPickerOptions({
  guests,
  assignments,
  tableId,
  seatIndex,
  query,
}: {
  guests: EligibleGuest[];
  assignments: Pick<SeatingAssignment, 'guest_id' | 'table_id' | 'seat_index'>[];
  tableId: string;
  seatIndex: number;
  query: string;
}): EligibleGuest[] {
  const normalizedQuery = query.toLowerCase().trim();
  return guests
    .filter((guest) => {
      const existing = assignments.find((assignment) => assignment.guest_id === guest.id);
      return !existing || (existing.table_id === tableId && existing.seat_index === seatIndex);
    })
    .filter((guest) => guest.full_name.toLowerCase().includes(normalizedQuery));
}

export function matchesSeatingCheckInFilter(
  guest: Pick<EligibleGuest, 'id'>,
  arrivedIds: Set<string>,
  assignedIds: Set<string>,
  filter: SeatingCheckInFilter,
): boolean {
  const hasArrived = arrivedIds.has(guest.id);
  const isAssigned = assignedIds.has(guest.id);
  switch (filter) {
    case 'arrived':
      return hasArrived;
    case 'not_arrived':
      return !hasArrived;
    case 'seated':
      return isAssigned;
    case 'unseated':
      return !isAssigned;
    default:
      return true;
  }
}

export function countArrivedAttendingGuests(
  guests: EligibleGuest[],
  arrivedIds: Set<string>,
): number {
  return guests.filter((guest) => guest.is_attending && arrivedIds.has(guest.id)).length;
}

export function getCheckInCandidates({
  guests,
  arrivedIds,
  assignedIds,
  filter,
  query,
  limit = 12,
}: {
  guests: EligibleGuest[];
  arrivedIds: Set<string>;
  assignedIds: Set<string>;
  filter: SeatingCheckInFilter;
  query: string;
  limit?: number;
}): EligibleGuest[] {
  const normalizedQuery = query.toLowerCase().trim();
  return guests
    .filter((guest) => guest.is_attending)
    .filter((guest) => matchesSeatingCheckInFilter(guest, arrivedIds, assignedIds, filter))
    .filter((guest) => guest.full_name.toLowerCase().includes(normalizedQuery))
    .slice(0, limit);
}

export function buildDemoAutoTables({
  seatingEventId,
  attendingCount,
  capacity,
  existingTableCount,
  now = Date.now(),
}: {
  seatingEventId: string;
  attendingCount: number;
  capacity: number;
  existingTableCount: number;
  now?: number;
}): SeatingTable[] {
  const safeCapacity = Math.max(1, Math.round(capacity));
  const tableCount = Math.ceil(attendingCount / safeCapacity);
  return Array.from({ length: tableCount }).map((_, idx) => {
    const index = existingTableCount + idx;
    return {
      id: `demo-auto-table-${now}-${idx}`,
      seating_event_id: seatingEventId,
      table_name: `Table ${index + 1}`,
      capacity: safeCapacity,
      sort_order: index,
      notes: '',
      table_shape: 'round',
      layout_width: 260,
      layout_height: 150,
      layout_x: 24 + (index % 3) * 360,
      layout_y: 24 + Math.floor(index / 3) * 330,
      rotation_deg: 0,
    };
  });
}

export function buildDemoAutoSeatAssignments({
  seatingEventId,
  guests,
  tables,
  existingAssignments,
}: {
  seatingEventId: string;
  guests: EligibleGuest[];
  tables: SeatingTable[];
  existingAssignments: SeatingAssignment[];
}): SeatingAssignment[] {
  const assignedGuestIds = buildAssignedGuestIdSet(existingAssignments);
  const attendees = guests.filter((guest) => guest.is_attending && !assignedGuestIds.has(guest.id));
  const occupancy = new Map(
    tables.map((table) => [table.id, existingAssignments.filter((assignment) => assignment.table_id === table.id).length]),
  );
  const seatUsage = new Map<string, Set<number>>(
    tables.map((table) => [
      table.id,
      new Set(
        existingAssignments
          .filter((assignment) => assignment.table_id === table.id)
          .map((assignment) => assignment.seat_index)
          .filter((seat): seat is number => typeof seat === 'number' && seat > 0),
      ),
    ]),
  );
  const nextSeat = (tableId: string, capacity: number) => {
    const usedSeats = seatUsage.get(tableId) ?? new Set<number>();
    for (let i = 1; i <= capacity; i++) {
      if (!usedSeats.has(i)) {
        usedSeats.add(i);
        seatUsage.set(tableId, usedSeats);
        return i;
      }
    }
    return null;
  };

  const generated: SeatingAssignment[] = [];
  for (const guest of attendees) {
    const table = tables.find((candidate) => (occupancy.get(candidate.id) ?? 0) < candidate.capacity);
    if (!table) break;
    occupancy.set(table.id, (occupancy.get(table.id) ?? 0) + 1);
    generated.push({
      id: `demo-auto-assign-${guest.id}`,
      seating_event_id: seatingEventId,
      table_id: table.id,
      guest_id: guest.id,
      seat_index: nextSeat(table.id, table.capacity),
      is_valid: true,
    });
  }
  return generated;
}

export function buildSeatingReportHtml({
  eventName,
  createdLabel,
  guests,
  tables,
  assignments,
  counters,
  arrivedCount,
}: {
  eventName: string;
  createdLabel: string;
  guests: EligibleGuest[];
  tables: SeatingTable[];
  assignments: SeatingAssignment[];
  counters: EventCounters | null;
  arrivedCount: number;
}): string {
  const tableBlocks = tables.map((table) => {
    const tableGuests = getGuestsAssignedToTable(guests, assignments, table.id);
    const rows = tableGuests.map((guest) => {
      const assignment = assignments.find((item) => item.table_id === table.id && item.guest_id === guest.id);
      return `<tr><td>${escapeHtml(guest.full_name)}</td><td>${escapeHtml(guest.email ?? '')}</td><td>${assignment?.checked_in_at ? 'Yes' : 'No'}</td></tr>`;
    }).join('');

    return `
        <section style="margin-bottom:18px; page-break-inside:avoid;">
          <h3 style="margin:0 0 8px 0;">${escapeHtml(table.table_name)} (${tableGuests.length}/${table.capacity})</h3>
          <table style="width:100%; border-collapse:collapse; font-size:12px;">
            <thead>
              <tr>
                <th style="text-align:left; border-bottom:1px solid #ddd; padding:6px;">Guest</th>
                <th style="text-align:left; border-bottom:1px solid #ddd; padding:6px;">Email</th>
                <th style="text-align:left; border-bottom:1px solid #ddd; padding:6px;">Arrived</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="3" style="padding:8px; color:#666;">No guests assigned</td></tr>'}</tbody>
          </table>
        </section>
      `;
  }).join('');

  return `
      <html>
        <head><title>Seating Export - ${escapeHtml(eventName)}</title></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; padding:24px; color:#111;">
          <h1 style="margin:0 0 6px 0;">Seating Report - ${escapeHtml(eventName)}</h1>
          <p style="margin:0 0 14px 0; color:#555;">Created ${escapeHtml(createdLabel)}</p>
          <p style="margin:0 0 20px 0; color:#333;">Attending: ${counters?.attending ?? 0} · Seated: ${counters?.seated ?? 0} · Arrived: ${arrivedCount}</p>
          ${tableBlocks || '<p>No tables yet.</p>'}
        </body>
      </html>
    `;
}

export function buildSeatingLayoutSvg({
  eventName,
  tables,
  assignments,
}: {
  eventName: string;
  tables: SeatingTable[];
  assignments: Pick<SeatingAssignment, 'table_id'>[];
}): string {
  const escapeText = (value: string) => value.replace(/[<>&]/g, '');
  const tableBlocks = tables.map((table) => {
    const x = Number(table.layout_x ?? 24);
    const y = Number(table.layout_y ?? 82);
    const width = Number(table.layout_width ?? 220);
    const height = Number(table.layout_height ?? 120);
    const assigned = assignments.filter((assignment) => assignment.table_id === table.id).length;
    const name = escapeText(`${table.table_name} (${assigned}/${table.capacity})`);
    return `<g><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="16" fill="#fff7ed" stroke="#d6d3d1" stroke-width="2"/><text x="${x + 16}" y="${y + 32}" font-size="16" font-family="Arial" font-weight="700" fill="#1c1917">${name}</text></g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000" viewBox="0 0 1400 1000"><rect width="1400" height="1000" fill="#fafaf9"/><text x="28" y="42" font-size="24" font-family="Arial" font-weight="700">${escapeText(eventName)} seating layout</text>${tableBlocks.join('')}</svg>`;
}
