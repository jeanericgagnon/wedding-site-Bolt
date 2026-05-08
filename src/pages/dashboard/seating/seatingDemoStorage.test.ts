import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEMO_ITINERARY_STORAGE_KEY,
  SEATING_DEMO_STORAGE_RETENTION_MS,
  loadDemoItineraryEventsFromStorage,
  readDemoSeatingState,
  readSeatingVersions,
  writeDemoSeatingState,
  writeSeatingVersions,
} from './seatingDemoStorage';
import type { SeatingAssignment, SeatingLayoutVersion, SeatingTable } from './seatingService';

describe('seating demo storage helpers', () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('falls back to bundled demo itinerary events when storage is empty or invalid', () => {
    expect(loadDemoItineraryEventsFromStorage()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          event_name: expect.any(String),
          event_date: expect.any(String),
        }),
      ]),
    );

    localStorage.setItem(DEMO_ITINERARY_STORAGE_KEY, '{broken');
    expect(loadDemoItineraryEventsFromStorage()).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: expect.any(String) })]),
    );
  });

  it('normalizes valid demo itinerary events and drops incomplete rows', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    localStorage.setItem(DEMO_ITINERARY_STORAGE_KEY, JSON.stringify([
      { id: ' event-1 ', event_name: ' Welcome Dinner ', event_date: '2026-06-05' },
      { id: 'missing-name', event_date: '2026-06-06' },
    ]));

    expect(loadDemoItineraryEventsFromStorage()).toEqual([
      {
        id: 'event-1',
        event_name: 'Welcome Dinner',
        event_date: '2026-06-05',
        start_time: '18:00',
        location_name: '',
      },
    ]);
    expect(JSON.parse(localStorage.getItem(DEMO_ITINERARY_STORAGE_KEY) ?? '{}')).toMatchObject({
      savedAtISO: '2026-05-06T12:00:00.000Z',
    });
  });

  it('reads and writes seating state by event id without crossing events', () => {
    const table: SeatingTable = {
      id: 'table-1',
      seating_event_id: 'seating-event-1',
      table_name: 'Head Table',
      capacity: 8,
      sort_order: 1,
      notes: '',
    };
    const assignment: SeatingAssignment = {
      id: 'assignment-1',
      seating_event_id: 'seating-event-1',
      table_id: 'table-1',
      guest_id: 'guest-1',
      seat_index: 0,
      is_valid: true,
    };

    writeDemoSeatingState('event-1', [table], [assignment]);

    expect(readDemoSeatingState('event-1')).toEqual({ tables: [table], assignments: [assignment] });
    expect(readDemoSeatingState('event-2')).toEqual({ tables: [], assignments: [] });
    expect(JSON.parse(localStorage.getItem('dayof.demo.seating.state') ?? '{}')).toHaveProperty('savedAtISO');
  });

  it('defensively handles invalid seating state and version storage', () => {
    localStorage.setItem('dayof.demo.seating.state', '{broken');
    localStorage.setItem('dayof.seating.versions', '{broken');

    expect(readDemoSeatingState('event-1')).toEqual({ tables: [], assignments: [] });
    expect(readSeatingVersions()).toEqual([]);
    expect(localStorage.getItem('dayof.demo.seating.state')).toBeNull();
    expect(localStorage.getItem('dayof.seating.versions')).toBeNull();
  });

  it('stores only the newest forty seating versions', () => {
    const versions: SeatingLayoutVersion[] = Array.from({ length: 45 }, (_, index) => ({
      id: `version-${index}`,
      wedding_site_id: 'site-1',
      seating_event_id: 'seating-event-1',
      itinerary_event_id: 'event-1',
      label: `Version ${index}`,
      tables: [],
      assignments: [],
      created_by: null,
      restored_at: null,
      created_at: `2026-05-${String(index + 1).padStart(2, '0')}`,
    }));

    writeSeatingVersions(versions);

    const storedVersions = readSeatingVersions();
    expect(storedVersions).toHaveLength(40);
    expect(storedVersions[0]?.id).toBe('version-0');
    expect(storedVersions.at(-1)?.id).toBe('version-39');
    expect(JSON.parse(localStorage.getItem('dayof.seating.versions') ?? '{}')).toHaveProperty('savedAtISO');
  });

  it('removes stale seating demo envelopes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    const staleSavedAtISO = new Date(Date.now() - SEATING_DEMO_STORAGE_RETENTION_MS - 1).toISOString();
    localStorage.setItem('dayof.demo.seating.state', JSON.stringify({
      savedAtISO: staleSavedAtISO,
      value: {
        'event-1': {
          tables: [{
            id: 'table-1',
            seating_event_id: 'seating-event-1',
            table_name: 'Head Table',
            capacity: 8,
            sort_order: 1,
            notes: '',
          }],
          assignments: [],
        },
      },
    }));
    localStorage.setItem('dayof.seating.versions', JSON.stringify({
      savedAtISO: staleSavedAtISO,
      value: [{
        id: 'version-1',
        wedding_site_id: 'site-1',
        seating_event_id: 'seating-event-1',
        itinerary_event_id: 'event-1',
        label: 'Old',
        tables: [],
        assignments: [],
        created_by: null,
        restored_at: null,
        created_at: '2026-05-01',
      }],
    }));

    expect(readDemoSeatingState('event-1')).toEqual({ tables: [], assignments: [] });
    expect(readSeatingVersions()).toEqual([]);
    expect(localStorage.getItem('dayof.demo.seating.state')).toBeNull();
    expect(localStorage.getItem('dayof.seating.versions')).toBeNull();
  });

  it('bounds seating state rows and text before storage', () => {
    const tables: SeatingTable[] = Array.from({ length: 90 }, (_, index) => ({
      id: `table-${index}`,
      seating_event_id: 'seating-event-1',
      table_name: 'x'.repeat(220),
      capacity: 8.9,
      sort_order: index,
      notes: 'n'.repeat(220),
    }));
    const assignments: SeatingAssignment[] = Array.from({ length: 420 }, (_, index) => ({
      id: `assignment-${index}`,
      seating_event_id: 'seating-event-1',
      table_id: 'table-1',
      guest_id: 'guest-1',
      seat_index: 1.9,
      is_valid: true,
    }));

    writeDemoSeatingState('event-1', tables, assignments);
    const stored = readDemoSeatingState('event-1');
    expect(stored.tables).toHaveLength(80);
    expect(stored.assignments).toHaveLength(400);
    expect(stored.tables[0]?.table_name).toHaveLength(160);
    expect(stored.tables[0]?.capacity).toBe(8);
    expect(stored.tables[0]?.notes).toHaveLength(160);
    expect(stored.assignments[0]?.seat_index).toBe(1);
  });
});
