export type EventWithInvites = {
  id: string;
  event_name: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string | null;
  location_name: string;
  location_address: string;
  dress_code: string | null;
  notes: string | null;
  display_order: number;
  is_visible: boolean;
  invitation_count: number;
  rsvp_count: number;
  attending_count: number;
  declined_count: number;
  pending_count: number;
};

export const DEMO_ITINERARY_STORAGE_KEY = 'dayof.demo.itinerary.events';
export const ITINERARY_DEMO_STORAGE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_DEMO_ITINERARY_EVENTS = 40;
const MAX_DEMO_ITINERARY_TEXT_LENGTH = 2000;
const MAX_DEMO_ITINERARY_SHORT_TEXT_LENGTH = 240;

type ItineraryDemoStorageEnvelope = {
  savedAtISO: string;
  value: EventWithInvites[];
};

function normalizeItineraryText(value: unknown, maxLength = MAX_DEMO_ITINERARY_TEXT_LENGTH): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeNullableItineraryText(value: unknown, maxLength = MAX_DEMO_ITINERARY_TEXT_LENGTH): string | null {
  const text = normalizeItineraryText(value, maxLength);
  return text || null;
}

function normalizeItineraryNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

function isItineraryDemoStorageEnvelope(value: unknown): value is ItineraryDemoStorageEnvelope {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Partial<ItineraryDemoStorageEnvelope>;
  return typeof envelope.savedAtISO === 'string' && 'value' in envelope;
}

function isFreshItineraryDemoStorage(savedAtISO: string): boolean {
  const savedAt = Date.parse(savedAtISO);
  return Number.isFinite(savedAt) && Date.now() - savedAt <= ITINERARY_DEMO_STORAGE_RETENTION_MS;
}

function readItineraryDemoStorageValue(): { value: unknown; shouldMigrate: boolean; hadStoredValue: boolean } {
  const raw = localStorage.getItem(DEMO_ITINERARY_STORAGE_KEY);
  if (!raw) return { value: [], shouldMigrate: false, hadStoredValue: false };

  const parsed = JSON.parse(raw) as unknown;
  if (isItineraryDemoStorageEnvelope(parsed)) {
    if (!isFreshItineraryDemoStorage(parsed.savedAtISO)) {
      localStorage.removeItem(DEMO_ITINERARY_STORAGE_KEY);
      return { value: [], shouldMigrate: false, hadStoredValue: false };
    }
    return { value: parsed.value, shouldMigrate: false, hadStoredValue: true };
  }

  return { value: parsed, shouldMigrate: true, hadStoredValue: true };
}

function writeItineraryDemoStorageEnvelope(events: EventWithInvites[]): void {
  localStorage.setItem(DEMO_ITINERARY_STORAGE_KEY, JSON.stringify({
    savedAtISO: new Date().toISOString(),
    value: events,
  } satisfies ItineraryDemoStorageEnvelope));
}

export function normalizeDemoItineraryEvents(value: unknown): EventWithInvites[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((event): EventWithInvites | null => {
      if (!event || typeof event !== 'object') return null;
      const row = event as Partial<EventWithInvites>;
      const id = normalizeItineraryText(row.id, MAX_DEMO_ITINERARY_SHORT_TEXT_LENGTH);
      const eventName = normalizeItineraryText(row.event_name, MAX_DEMO_ITINERARY_SHORT_TEXT_LENGTH);
      const eventDate = normalizeItineraryText(row.event_date, 40);
      if (!id || !eventName || !eventDate) return null;

      const invitationCount = normalizeItineraryNumber(row.invitation_count);
      const attendingCount = normalizeItineraryNumber(row.attending_count);
      const declinedCount = normalizeItineraryNumber(row.declined_count);

      return {
        id,
        event_name: eventName,
        description: normalizeItineraryText(row.description),
        event_date: eventDate,
        start_time: normalizeItineraryText(row.start_time, 20),
        end_time: normalizeNullableItineraryText(row.end_time, 20),
        location_name: normalizeItineraryText(row.location_name, MAX_DEMO_ITINERARY_SHORT_TEXT_LENGTH),
        location_address: normalizeItineraryText(row.location_address, MAX_DEMO_ITINERARY_SHORT_TEXT_LENGTH),
        dress_code: normalizeNullableItineraryText(row.dress_code, MAX_DEMO_ITINERARY_SHORT_TEXT_LENGTH),
        notes: normalizeNullableItineraryText(row.notes),
        display_order: normalizeItineraryNumber(row.display_order),
        is_visible: row.is_visible !== false,
        invitation_count: invitationCount,
        rsvp_count: normalizeItineraryNumber(row.rsvp_count),
        attending_count: attendingCount,
        declined_count: declinedCount,
        pending_count: typeof row.pending_count === 'number' && Number.isFinite(row.pending_count)
          ? Math.max(0, Math.floor(row.pending_count))
          : Math.max(0, invitationCount - attendingCount - declinedCount),
      };
    })
    .filter((event): event is EventWithInvites => event !== null)
    .slice(0, MAX_DEMO_ITINERARY_EVENTS);
}

export function readDemoItineraryEvents(fallbackEvents: EventWithInvites[]): EventWithInvites[] {
  try {
    const stored = readItineraryDemoStorageValue();
    const normalized = normalizeDemoItineraryEvents(stored.value);
    if (stored.shouldMigrate && normalized.length > 0) writeItineraryDemoStorageEnvelope(normalized);
    if (stored.hadStoredValue && normalized.length === 0) localStorage.removeItem(DEMO_ITINERARY_STORAGE_KEY);
    return normalized.length > 0 ? normalized : fallbackEvents;
  } catch {
    try {
      localStorage.removeItem(DEMO_ITINERARY_STORAGE_KEY);
    } catch {}
    return fallbackEvents;
  }
}

export function writeDemoItineraryEvents(events: EventWithInvites[]): void {
  try {
    writeItineraryDemoStorageEnvelope(normalizeDemoItineraryEvents(events));
  } catch {}
}
