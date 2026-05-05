import { demoEvents } from '../../../lib/demoData';
import type { ItineraryEvent, SeatingAssignment, SeatingLayoutVersion, SeatingTable } from './seatingService';

export const DEMO_ITINERARY_STORAGE_KEY = 'dayof.demo.itinerary.events';
const DEMO_SEATING_STORAGE_KEY = 'dayof.demo.seating.state';
const SEATING_VERSION_STORAGE_KEY = 'dayof.seating.versions';
const MAX_STORED_SEATING_VERSIONS = 40;

function normalizeItineraryEvent(event: any): ItineraryEvent {
  return {
    id: event.id,
    event_name: event.event_name,
    event_date: event.event_date,
    start_time: event.start_time || '18:00',
    location_name: event.location_name || '',
  };
}

export function loadDemoItineraryEventsFromStorage(): ItineraryEvent[] {
  const fallbackEvents: ItineraryEvent[] = demoEvents.map(normalizeItineraryEvent);

  let parsedEvents: ItineraryEvent[] = [];
  try {
    const raw = localStorage.getItem(DEMO_ITINERARY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      parsedEvents = (Array.isArray(parsed) ? parsed : [])
        .map(normalizeItineraryEvent)
        .filter((event) => event.id && event.event_name && event.event_date);
    }
  } catch {}

  return parsedEvents.length > 0 ? parsedEvents : fallbackEvents;
}

export function readDemoSeatingState(eventId: string): { tables: SeatingTable[]; assignments: SeatingAssignment[] } {
  try {
    const raw = localStorage.getItem(DEMO_SEATING_STORAGE_KEY);
    if (!raw) return { tables: [], assignments: [] };
    const parsed = JSON.parse(raw) as Record<string, { tables?: SeatingTable[]; assignments?: SeatingAssignment[] }>;
    const item = parsed?.[eventId];
    return {
      tables: Array.isArray(item?.tables) ? item.tables : [],
      assignments: Array.isArray(item?.assignments) ? item.assignments : [],
    };
  } catch {
    return { tables: [], assignments: [] };
  }
}

export function writeDemoSeatingState(eventId: string, tablesData: SeatingTable[], assignmentsData: SeatingAssignment[]): void {
  try {
    const raw = localStorage.getItem(DEMO_SEATING_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    parsed[eventId] = { tables: tablesData, assignments: assignmentsData };
    localStorage.setItem(DEMO_SEATING_STORAGE_KEY, JSON.stringify(parsed));
  } catch {}
}

export function readSeatingVersions(): SeatingLayoutVersion[] {
  try {
    const raw = localStorage.getItem(SEATING_VERSION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as SeatingLayoutVersion[] : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeSeatingVersions(nextVersions: SeatingLayoutVersion[]): void {
  try {
    localStorage.setItem(SEATING_VERSION_STORAGE_KEY, JSON.stringify(nextVersions.slice(0, MAX_STORED_SEATING_VERSIONS)));
  } catch {}
}
