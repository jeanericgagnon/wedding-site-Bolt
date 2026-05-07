import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEMO_ITINERARY_STORAGE_KEY,
  ITINERARY_DEMO_STORAGE_RETENTION_MS,
  type EventWithInvites,
  normalizeDemoItineraryEvents,
  readDemoItineraryEvents,
  writeDemoItineraryEvents,
} from './itineraryDemoStorage';

const fallbackEvents: EventWithInvites[] = [{
  id: 'fallback-event',
  event_name: 'Fallback',
  description: '',
  event_date: '2026-06-01',
  start_time: '18:00',
  end_time: null,
  location_name: 'Venue',
  location_address: '',
  dress_code: null,
  notes: null,
  display_order: 0,
  is_visible: true,
  invitation_count: 10,
  rsvp_count: 8,
  attending_count: 7,
  declined_count: 1,
  pending_count: 2,
}];

describe('itinerary demo storage helpers', () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('normalizes demo itinerary events and derives missing pending counts', () => {
    expect(normalizeDemoItineraryEvents([{
      id: ' event-1 ',
      event_name: ' Welcome Dinner ',
      description: 'x'.repeat(2200),
      event_date: '2026-06-05',
      start_time: '18:00',
      end_time: '',
      location_name: ' Garden ',
      location_address: ' Address ',
      dress_code: '',
      notes: null,
      display_order: 1.9,
      is_visible: true,
      invitation_count: 20.9,
      rsvp_count: 18.2,
      attending_count: 16.7,
      declined_count: 2.1,
    }, { id: 'missing-name', event_date: '2026-06-06' }])).toEqual([expect.objectContaining({
      id: 'event-1',
      event_name: 'Welcome Dinner',
      description: 'x'.repeat(2000),
      end_time: null,
      location_name: 'Garden',
      location_address: 'Address',
      display_order: 1,
      invitation_count: 20,
      rsvp_count: 18,
      attending_count: 16,
      declined_count: 2,
      pending_count: 2,
    })]);
  });

  it('writes timestamped envelopes and reads them back', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));

    writeDemoItineraryEvents(fallbackEvents);

    expect(readDemoItineraryEvents([])).toEqual(fallbackEvents);
    expect(JSON.parse(localStorage.getItem(DEMO_ITINERARY_STORAGE_KEY) ?? '{}')).toMatchObject({
      savedAtISO: '2026-05-06T12:00:00.000Z',
      value: [{ id: 'fallback-event' }],
    });
  });

  it('migrates active legacy itinerary arrays on read', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    localStorage.setItem(DEMO_ITINERARY_STORAGE_KEY, JSON.stringify([{
      id: 'legacy-event',
      event_name: 'Legacy',
      event_date: '2026-06-06',
      invitation_count: 10,
      attending_count: 4,
      declined_count: 1,
    }]));

    expect(readDemoItineraryEvents([])[0]).toMatchObject({
      id: 'legacy-event',
      pending_count: 5,
    });
    expect(JSON.parse(localStorage.getItem(DEMO_ITINERARY_STORAGE_KEY) ?? '{}')).toMatchObject({
      savedAtISO: '2026-05-06T12:00:00.000Z',
    });
  });

  it('removes stale or malformed stored itinerary data and falls back', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    localStorage.setItem(DEMO_ITINERARY_STORAGE_KEY, JSON.stringify({
      savedAtISO: new Date(Date.now() - ITINERARY_DEMO_STORAGE_RETENTION_MS - 1).toISOString(),
      value: fallbackEvents,
    }));

    expect(readDemoItineraryEvents(fallbackEvents)).toEqual(fallbackEvents);
    expect(localStorage.getItem(DEMO_ITINERARY_STORAGE_KEY)).toBeNull();

    localStorage.setItem(DEMO_ITINERARY_STORAGE_KEY, '{broken');
    expect(readDemoItineraryEvents(fallbackEvents)).toEqual(fallbackEvents);
    expect(localStorage.getItem(DEMO_ITINERARY_STORAGE_KEY)).toBeNull();
  });
});
