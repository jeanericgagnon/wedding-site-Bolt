import { describe, expect, it } from 'vitest';
import { buildItineraryTemplateInsertRows } from './itineraryService';

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
});
