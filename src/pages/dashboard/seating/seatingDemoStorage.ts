import { demoEvents } from '../../../lib/demoData';
import type { ItineraryEvent, SeatingAssignment, SeatingLayoutVersion, SeatingTable } from './seatingService';

export const DEMO_ITINERARY_STORAGE_KEY = 'dayof.demo.itinerary.events';
const DEMO_SEATING_STORAGE_KEY = 'dayof.demo.seating.state';
const SEATING_VERSION_STORAGE_KEY = 'dayof.seating.versions';
const MAX_STORED_SEATING_VERSIONS = 40;
export const SEATING_DEMO_STORAGE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_DEMO_ITINERARY_EVENTS = 40;
const MAX_DEMO_SEATING_TABLES = 80;
const MAX_DEMO_SEATING_ASSIGNMENTS = 400;
const MAX_DEMO_SEATING_EVENTS = 20;
const MAX_SEATING_TEXT_LENGTH = 160;

type SeatingStorageEnvelope<T> = {
  savedAtISO: string;
  value: T;
};

function normalizeSeatingText(value: unknown, maxLength = MAX_SEATING_TEXT_LENGTH): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeSeatingNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

function normalizeNullableSeatingText(value: unknown, maxLength = MAX_SEATING_TEXT_LENGTH): string | null {
  const text = normalizeSeatingText(value, maxLength);
  return text || null;
}

function isSeatingStorageEnvelope<T = unknown>(value: unknown): value is SeatingStorageEnvelope<T> {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Partial<SeatingStorageEnvelope<T>>;
  return typeof envelope.savedAtISO === 'string' && 'value' in envelope;
}

function isFreshSeatingStorage(savedAtISO: string): boolean {
  const savedAt = Date.parse(savedAtISO);
  return Number.isFinite(savedAt) && Date.now() - savedAt <= SEATING_DEMO_STORAGE_RETENTION_MS;
}

function readSeatingStorageValue<T>(key: string, fallback: T): { value: T; shouldMigrate: boolean; hadStoredValue: boolean } {
  const raw = localStorage.getItem(key);
  if (!raw) return { value: fallback, shouldMigrate: false, hadStoredValue: false };

  const parsed = JSON.parse(raw) as unknown;
  if (isSeatingStorageEnvelope<T>(parsed)) {
    if (!isFreshSeatingStorage(parsed.savedAtISO)) {
      localStorage.removeItem(key);
      return { value: fallback, shouldMigrate: false, hadStoredValue: false };
    }
    return { value: parsed.value, shouldMigrate: false, hadStoredValue: true };
  }

  return { value: parsed as T, shouldMigrate: true, hadStoredValue: true };
}

function writeSeatingStorageValue<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify({
    savedAtISO: new Date().toISOString(),
    value,
  } satisfies SeatingStorageEnvelope<T>));
}

function normalizeItineraryEvent(event: unknown): ItineraryEvent | null {
  if (!event || typeof event !== 'object') return null;
  const row = event as Partial<ItineraryEvent>;
  const id = normalizeSeatingText(row.id);
  const eventName = normalizeSeatingText(row.event_name);
  const eventDate = normalizeSeatingText(row.event_date, 40);
  if (!id || !eventName || !eventDate) return null;

  return {
    id,
    event_name: eventName,
    event_date: eventDate,
    start_time: normalizeSeatingText(row.start_time, 20) || '18:00',
    location_name: normalizeSeatingText(row.location_name),
  };
}

function normalizeItineraryEvents(value: unknown): ItineraryEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeItineraryEvent)
    .filter((event): event is ItineraryEvent => event !== null)
    .slice(0, MAX_DEMO_ITINERARY_EVENTS);
}

function normalizeSeatingTable(value: unknown): SeatingTable | null {
  if (!value || typeof value !== 'object') return null;
  const table = value as Partial<SeatingTable>;
  const id = normalizeSeatingText(table.id);
  const seatingEventId = normalizeSeatingText(table.seating_event_id);
  const tableName = normalizeSeatingText(table.table_name);
  if (!id || !seatingEventId || !tableName) return null;

  const tableShape = table.table_shape === 'round'
    || table.table_shape === 'rectangle'
    || table.table_shape === 'bar'
    || table.table_shape === 'dj_booth'
    || table.table_shape === 'dance_floor'
    ? table.table_shape
    : undefined;

  const normalized: SeatingTable = {
    id,
    seating_event_id: seatingEventId,
    table_name: tableName,
    capacity: normalizeSeatingNumber(table.capacity, 1),
    sort_order: normalizeSeatingNumber(table.sort_order),
    notes: normalizeSeatingText(table.notes),
  };
  if (tableShape) normalized.table_shape = tableShape;
  if (typeof table.layout_width === 'number' && Number.isFinite(table.layout_width)) normalized.layout_width = table.layout_width;
  if (typeof table.layout_height === 'number' && Number.isFinite(table.layout_height)) normalized.layout_height = table.layout_height;
  if (typeof table.layout_x === 'number' && Number.isFinite(table.layout_x)) normalized.layout_x = table.layout_x;
  if (typeof table.layout_y === 'number' && Number.isFinite(table.layout_y)) normalized.layout_y = table.layout_y;
  if (typeof table.rotation_deg === 'number' && Number.isFinite(table.rotation_deg)) normalized.rotation_deg = table.rotation_deg;
  return normalized;
}

function normalizeSeatingAssignment(value: unknown): SeatingAssignment | null {
  if (!value || typeof value !== 'object') return null;
  const assignment = value as Partial<SeatingAssignment>;
  const id = normalizeSeatingText(assignment.id);
  const seatingEventId = normalizeSeatingText(assignment.seating_event_id);
  const tableId = normalizeSeatingText(assignment.table_id);
  const guestId = normalizeSeatingText(assignment.guest_id);
  if (!id || !seatingEventId || !tableId || !guestId) return null;

  const normalized: SeatingAssignment = {
    id,
    seating_event_id: seatingEventId,
    table_id: tableId,
    guest_id: guestId,
    seat_index: typeof assignment.seat_index === 'number' && Number.isFinite(assignment.seat_index) ? Math.max(0, Math.floor(assignment.seat_index)) : null,
    is_valid: assignment.is_valid !== false,
  };
  const checkedInAt = normalizeNullableSeatingText(assignment.checked_in_at, 40);
  const checkedInBy = normalizeNullableSeatingText(assignment.checked_in_by);
  if (checkedInAt !== null) normalized.checked_in_at = checkedInAt;
  if (checkedInBy !== null) normalized.checked_in_by = checkedInBy;
  return normalized;
}

function normalizeSeatingState(value: unknown): { tables: SeatingTable[]; assignments: SeatingAssignment[] } {
  if (!value || typeof value !== 'object') return { tables: [], assignments: [] };
  const state = value as { tables?: unknown; assignments?: unknown };
  return {
    tables: Array.isArray(state.tables)
      ? state.tables.map(normalizeSeatingTable).filter((table): table is SeatingTable => table !== null).slice(0, MAX_DEMO_SEATING_TABLES)
      : [],
    assignments: Array.isArray(state.assignments)
      ? state.assignments.map(normalizeSeatingAssignment).filter((assignment): assignment is SeatingAssignment => assignment !== null).slice(0, MAX_DEMO_SEATING_ASSIGNMENTS)
      : [],
  };
}

function normalizeSeatingStateMap(value: unknown): Record<string, { tables: SeatingTable[]; assignments: SeatingAssignment[] }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, MAX_DEMO_SEATING_EVENTS)
      .map(([rawEventId, rawState]) => [normalizeSeatingText(rawEventId), normalizeSeatingState(rawState)] as const)
      .filter(([eventId, state]) => eventId && (state.tables.length > 0 || state.assignments.length > 0)),
  );
}

function normalizeSeatingLayoutVersion(value: unknown): SeatingLayoutVersion | null {
  if (!value || typeof value !== 'object') return null;
  const version = value as Partial<SeatingLayoutVersion>;
  const id = normalizeSeatingText(version.id);
  const weddingSiteId = normalizeSeatingText(version.wedding_site_id);
  const seatingEventId = normalizeSeatingText(version.seating_event_id);
  const label = normalizeSeatingText(version.label);
  const createdAt = normalizeSeatingText(version.created_at, 40);
  if (!id || !weddingSiteId || !seatingEventId || !label || !createdAt) return null;

  return {
    id,
    wedding_site_id: weddingSiteId,
    seating_event_id: seatingEventId,
    itinerary_event_id: normalizeNullableSeatingText(version.itinerary_event_id),
    label,
    tables: normalizeSeatingState({ tables: version.tables, assignments: [] }).tables,
    assignments: normalizeSeatingState({ tables: [], assignments: version.assignments }).assignments,
    created_by: normalizeNullableSeatingText(version.created_by),
    restored_at: normalizeNullableSeatingText(version.restored_at, 40),
    created_at: createdAt,
  };
}

function normalizeSeatingLayoutVersions(value: unknown): SeatingLayoutVersion[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeSeatingLayoutVersion)
    .filter((version): version is SeatingLayoutVersion => version !== null)
    .slice(0, MAX_STORED_SEATING_VERSIONS);
}

export function loadDemoItineraryEventsFromStorage(): ItineraryEvent[] {
  const fallbackEvents: ItineraryEvent[] = normalizeItineraryEvents(demoEvents);

  try {
    const stored = readSeatingStorageValue<unknown>(DEMO_ITINERARY_STORAGE_KEY, []);
    const parsedEvents = normalizeItineraryEvents(stored.value);
    if (stored.shouldMigrate && parsedEvents.length > 0) writeSeatingStorageValue(DEMO_ITINERARY_STORAGE_KEY, parsedEvents);
    if (stored.hadStoredValue && parsedEvents.length === 0) localStorage.removeItem(DEMO_ITINERARY_STORAGE_KEY);
    return parsedEvents.length > 0 ? parsedEvents : fallbackEvents;
  } catch {
    try {
      localStorage.removeItem(DEMO_ITINERARY_STORAGE_KEY);
    } catch {}
  }

  return fallbackEvents;
}

export function readDemoSeatingState(eventId: string): { tables: SeatingTable[]; assignments: SeatingAssignment[] } {
  try {
    const stored = readSeatingStorageValue<unknown>(DEMO_SEATING_STORAGE_KEY, {});
    const parsed = normalizeSeatingStateMap(stored.value);
    if (stored.shouldMigrate && Object.keys(parsed).length > 0) writeSeatingStorageValue(DEMO_SEATING_STORAGE_KEY, parsed);
    if (stored.hadStoredValue && Object.keys(parsed).length === 0) localStorage.removeItem(DEMO_SEATING_STORAGE_KEY);
    return parsed[eventId] ?? { tables: [], assignments: [] };
  } catch {
    try {
      localStorage.removeItem(DEMO_SEATING_STORAGE_KEY);
    } catch {}
    return { tables: [], assignments: [] };
  }
}

export function writeDemoSeatingState(eventId: string, tablesData: SeatingTable[], assignmentsData: SeatingAssignment[]): void {
  try {
    const stored = readSeatingStorageValue<unknown>(DEMO_SEATING_STORAGE_KEY, {});
    const parsed = normalizeSeatingStateMap(stored.value);
    parsed[eventId] = normalizeSeatingState({ tables: tablesData, assignments: assignmentsData });
    writeSeatingStorageValue(DEMO_SEATING_STORAGE_KEY, parsed);
  } catch {}
}

export function readSeatingVersions(): SeatingLayoutVersion[] {
  try {
    const stored = readSeatingStorageValue<unknown>(SEATING_VERSION_STORAGE_KEY, []);
    const versions = normalizeSeatingLayoutVersions(stored.value);
    if (stored.shouldMigrate && versions.length > 0) writeSeatingStorageValue(SEATING_VERSION_STORAGE_KEY, versions);
    if (stored.hadStoredValue && versions.length === 0) localStorage.removeItem(SEATING_VERSION_STORAGE_KEY);
    return versions;
  } catch {
    try {
      localStorage.removeItem(SEATING_VERSION_STORAGE_KEY);
    } catch {}
    return [];
  }
}

export function writeSeatingVersions(nextVersions: SeatingLayoutVersion[]): void {
  try {
    writeSeatingStorageValue(SEATING_VERSION_STORAGE_KEY, normalizeSeatingLayoutVersions(nextVersions));
  } catch {}
}
