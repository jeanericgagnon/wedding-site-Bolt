import { describe, expect, it } from 'vitest';
import { resolveChronologicalOperationalEventId, resolveOperationalEventId } from './operationalEvent';

describe('resolveOperationalEventId', () => {
  const events = [
    { id: 'ceremony', event_date: '2026-05-13', start_time: '16:00:00', end_time: '17:00:00' },
    { id: 'cocktails', event_date: '2026-05-13', start_time: '17:15:00', end_time: '18:00:00' },
    { id: 'reception', event_date: '2026-05-13', start_time: '19:00:00', end_time: '23:00:00' },
  ];

  it('prefers live, then up-next, then selected, then first chronological', () => {
    expect(resolveOperationalEventId({ events, liveEventId: 'cocktails', upNextEventId: 'reception', selectedEventId: 'ceremony' })).toBe('cocktails');
    expect(resolveOperationalEventId({ events, liveEventId: null, upNextEventId: 'reception', selectedEventId: 'ceremony', now: new Date('2026-05-13T17:05:00') })).toBe('reception');
    expect(resolveOperationalEventId({ events, liveEventId: null, upNextEventId: null, selectedEventId: 'ceremony', now: new Date('2026-05-13T14:00:00') })).toBe('ceremony');
    expect(resolveOperationalEventId({ events, liveEventId: null, upNextEventId: null, selectedEventId: 'missing', now: new Date('2026-05-13T14:00:00') })).toBe('ceremony');
  });

  it('chooses a true live event window even when no live id is supplied', () => {
    expect(resolveOperationalEventId({
      events,
      upNextEventId: 'reception',
      selectedEventId: 'ceremony',
      now: new Date('2026-05-13T16:30:00'),
    })).toBe('ceremony');
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

  it('keeps a live event selected while its fallback window is still active', () => {
    expect(resolveChronologicalOperationalEventId(events, new Date('2026-05-13T18:00:00'))).toBe('ceremony');
  });

  it('handles full iso timestamps, bad dates, and missing times safely', () => {
    expect(resolveChronologicalOperationalEventId([
      { id: 'iso', start_time: '2026-05-13T18:30:00Z' },
      { id: 'bad', event_date: 'not-a-date', start_time: '18:00:00' },
      { id: 'date-only', event_date: '2026-05-14' },
    ], new Date('2026-05-13T17:00:00Z'))).toBe('iso');
  });

  it('returns the first event when no parseable chronology exists', () => {
    expect(resolveChronologicalOperationalEventId([
      { id: 'first', event_date: 'bad-date', start_time: 'bad-time' },
      { id: 'second', event_date: null, start_time: null },
    ], new Date('2026-05-13T17:00:00Z'))).toBe('first');
  });
});
