import { describe, expect, it } from 'vitest';
import { buildItineraryReadiness } from './itineraryReadiness';

describe('buildItineraryReadiness', () => {
  it('guides the first anchor pass when no events exist yet', () => {
    const model = buildItineraryReadiness([]);

    expect(model.title).toMatch(/first anchors/i);
    expect(model.sequence.map((step) => step.status)).toEqual(['current', 'next', 'then']);
    expect(model.sequence[0]?.title).toMatch(/anchor events/i);
  });

  it('prioritizes missing core details before guest-facing polish', () => {
    const model = buildItineraryReadiness([
      {
        id: '1',
        event_name: 'Welcome drinks',
        event_date: '2026-09-12',
        start_time: '',
        location_name: '',
        notes: null,
        is_visible: true,
      },
    ]);

    expect(model.badges[1]).toMatch(/incomplete/i);
    expect(model.sequence[0]?.detail).toMatch(/date, start time, and location/i);
  });

  it('pushes toward handoff once the public schedule is complete', () => {
    const model = buildItineraryReadiness([
      {
        id: '1',
        event_name: 'Ceremony',
        event_date: '2026-09-12',
        start_time: '16:00',
        location_name: 'Garden House',
        notes: 'Shuttle leaves the hotel at 3:15 PM.',
        is_visible: true,
      },
      {
        id: '2',
        event_name: 'Reception',
        event_date: '2026-09-12',
        start_time: '18:00',
        location_name: 'Garden House',
        notes: 'Dinner doors open immediately after cocktail hour.',
        is_visible: true,
      },
    ]);

    expect(model.title).toMatch(/ready to support the live weekend/i);
    expect(model.badges[1]).toMatch(/timeline ready/i);
    expect(model.sequence[2]?.detail).toMatch(/exceptions/i);
  });
});
