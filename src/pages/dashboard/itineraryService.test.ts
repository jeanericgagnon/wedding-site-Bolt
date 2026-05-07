import { describe, expect, it } from 'vitest';
import {
  buildItineraryTemplateInsertRows,
  buildScheduleSectionEvents,
  buildWeddingSchedule,
} from './itineraryService';
import { combineDateAndTimeISO } from './itineraryDateTime';

describe('buildItineraryTemplateInsertRows', () => {
  it('scopes template event inserts to one site and preserves public schedule fields', () => {
    expect(buildItineraryTemplateInsertRows('site-1', [
      {
        event_name: 'Ceremony',
        description: 'Guests gather for vows.',
        event_date: '2026-06-20',
        start_time: '16:00',
        end_time: '16:30',
        display_order: 2,
      },
    ])).toEqual([
      {
        wedding_site_id: 'site-1',
        event_name: 'Ceremony',
        title: 'Ceremony',
        description: 'Guests gather for vows.',
        event_date: '2026-06-20',
        start_time: '16:00',
        end_time: '16:30',
        display_order: 2,
        is_visible: true,
      },
    ]);
  });

  it('builds schedule-section mirror rows from visible itinerary events', () => {
    expect(buildScheduleSectionEvents([
      {
        id: 'evt-1',
        event_name: 'Reception',
        description: 'Dinner and dancing.',
        event_date: '2026-06-20',
        start_time: '18:00',
        end_time: '22:00',
        location_name: 'Grand Hall',
        location_address: '123 Celebration Ave',
        notes: 'Bring dancing shoes.',
        is_visible: true,
      },
      {
        id: 'evt-2',
        event_name: 'Private',
        description: '',
        event_date: '2026-06-20',
        start_time: '09:00',
        end_time: null,
        location_name: '',
        location_address: '',
        notes: null,
        is_visible: false,
      },
    ])).toEqual([
      {
        id: 'evt-1',
        title: 'Reception',
        time: '18:00 - 22:00',
        description: 'Dinner and dancing.',
        location: 'Grand Hall · 123 Celebration Ave',
      },
    ]);
  });

  it('builds wedding schedule mirror rows from visible itinerary events', () => {
    expect(buildWeddingSchedule([
      {
        id: 'evt-1',
        event_name: 'Ceremony',
        description: 'Guests gather for vows.',
        event_date: '2026-06-20',
        start_time: '16:00',
        end_time: '16:30',
        location_name: 'Rose Garden',
        location_address: '10 Sunset Way',
        notes: 'Arrive 15 minutes early.',
        is_visible: true,
      },
      {
        id: 'evt-2',
        event_name: 'Hidden',
        description: '',
        event_date: '2026-06-20',
        start_time: '09:00',
        end_time: null,
        location_name: '',
        location_address: '',
        notes: null,
        is_visible: false,
      },
    ])).toEqual([
      {
        id: 'evt-1',
        label: 'Ceremony',
        startTimeISO: combineDateAndTimeISO('2026-06-20', '16:00'),
        endTimeISO: combineDateAndTimeISO('2026-06-20', '16:30'),
        notes: 'Rose Garden · 10 Sunset Way — Guests gather for vows. · Arrive 15 minutes early.',
      },
    ]);
  });
});
