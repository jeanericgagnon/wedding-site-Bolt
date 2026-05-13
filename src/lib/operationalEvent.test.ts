import { describe, expect, it } from 'vitest';
import { resolveChronologicalOperationalEventId, resolveOperationalEventId } from './operationalEvent';

describe('resolveOperationalEventId', () => {
  const events = [{ id: 'ceremony' }, { id: 'cocktails' }, { id: 'reception' }];

  it('prefers live, then up-next, then selected, then first chronological', () => {
    expect(resolveOperationalEventId({ events, liveEventId: 'cocktails', upNextEventId: 'reception', selectedEventId: 'ceremony' })).toBe('cocktails');
    expect(resolveOperationalEventId({ events, liveEventId: null, upNextEventId: 'reception', selectedEventId: 'ceremony' })).toBe('reception');
    expect(resolveOperationalEventId({ events, liveEventId: null, upNextEventId: null, selectedEventId: 'ceremony' })).toBe('ceremony');
    expect(resolveOperationalEventId({ events, liveEventId: null, upNextEventId: null, selectedEventId: 'missing' })).toBe('ceremony');
  });
});

describe('resolveChronologicalOperationalEventId', () => {
  const events = [
    { id: 'welcome', event_date: '2026-05-10', start_time: '18:00:00' },
    { id: 'ceremony', event_date: '2026-05-13', start_time: '16:00:00' },
    { id: 'reception', event_date: '2026-05-13', start_time: '19:00:00' },
  ];

  it('chooses the next chronological event before start time', () => {
    expect(resolveChronologicalOperationalEventId(events, new Date('2026-05-13T15:30:00'))).toBe('ceremony');
  });

  it('falls back to the last chronological event after the schedule has passed', () => {
    expect(resolveChronologicalOperationalEventId(events, new Date('2026-05-14T08:00:00'))).toBe('reception');
  });
});
