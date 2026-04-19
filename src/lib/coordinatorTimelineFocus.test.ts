import { describe, expect, it } from 'vitest';
import { getCoordinatorLiveEventId, getCoordinatorUpNextEventId } from './coordinatorTimelineFocus';

const events = [
  { id: 'ceremony', event_name: 'Ceremony', start_time: '2026-04-19T15:00:00' },
  { id: 'cocktails', event_name: 'Cocktails', start_time: '2026-04-19T16:00:00' },
  { id: 'dinner', event_name: 'Dinner', start_time: '2026-04-19T18:00:00' },
];

describe('coordinatorTimelineFocus', () => {
  it('finds the single live event', () => {
    expect(getCoordinatorLiveEventId(events, { ceremony: 'done', cocktails: 'live', dinner: 'up-next' })).toBe('cocktails');
  });

  it('finds the next non-done event after the live one', () => {
    expect(getCoordinatorUpNextEventId(events, { ceremony: 'done', cocktails: 'live', dinner: 'up-next' })).toBe('dinner');
  });

  it('falls back to the first unfinished event when nothing is live', () => {
    expect(getCoordinatorUpNextEventId(events, { ceremony: 'done', cocktails: 'up-next', dinner: 'up-next' })).toBe('cocktails');
  });
});
