import { describe, expect, it } from 'vitest';
import { getCoordinatorCheckInActionLabel, getCoordinatorTimelineCorrectionAction } from './coordinatorCorrectionActions';

describe('coordinatorCorrectionActions', () => {
  it('makes check-in reversal explicit', () => {
    expect(getCoordinatorCheckInActionLabel({ id: '1', first_name: 'Alex', last_name: 'Rivera', name: 'Alex Rivera', rsvp_status: 'confirmed', checked_in_at: '2026-04-19T10:00:00.000Z' })).toBe('Undo check-in');
    expect(getCoordinatorCheckInActionLabel({ id: '2', first_name: 'Sam', last_name: 'Lee', name: 'Sam Lee', rsvp_status: 'confirmed', checked_in_at: null })).toBe('Check in');
  });

  it('offers timeline correction actions for live and completed states', () => {
    expect(getCoordinatorTimelineCorrectionAction('live')).toEqual({ label: 'Move back to up next', nextState: 'up-next' });
    expect(getCoordinatorTimelineCorrectionAction('done')).toEqual({ label: 'Reopen event', nextState: 'up-next' });
    expect(getCoordinatorTimelineCorrectionAction('up-next')).toBeNull();
  });
});
