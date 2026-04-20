import { describe, expect, it } from 'vitest';
import { getCoordinatorCorrectionEventId, getCoordinatorCorrectionGuestId } from './coordinatorCorrectionTarget';

describe('coordinatorCorrectionTarget', () => {
  it('finds the first checked-in guest for undo-check-in focus', () => {
    expect(getCoordinatorCorrectionGuestId([
      { id: '1', first_name: 'Alex', last_name: 'Rivera', name: 'Alex Rivera', rsvp_status: 'confirmed', checked_in_at: '2026-04-19T10:00:00.000Z' },
      { id: '2', first_name: 'Sam', last_name: 'Lee', name: 'Sam Lee', rsvp_status: 'confirmed', checked_in_at: null },
    ])).toBe('1');
  });

  it('finds the first completed event for reopen focus', () => {
    expect(getCoordinatorCorrectionEventId([
      { id: 'ceremony', event_name: 'Ceremony', start_time: '2026-04-19T15:00:00' },
      { id: 'cocktails', event_name: 'Cocktails', start_time: '2026-04-19T16:00:00' },
    ], { ceremony: 'done', cocktails: 'up-next' })).toBe('ceremony');
  });
});
