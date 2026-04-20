import { describe, expect, it } from 'vitest';
import { getCoordinatorAlertLaneLabel } from './coordinatorAlertLane';

describe('coordinatorAlertLane', () => {
  it('maps live event suggestions to a clear lane label', () => {
    expect(getCoordinatorAlertLaneLabel({
      key: 'live:ceremony',
      label: 'Update live event',
      subject: 'Ceremony is live',
      body: 'Please head over now.',
      audience: 'event:ceremony',
    })).toBe('Live event update');
  });

  it('maps up-next and check-in suggestions to clear lane labels', () => {
    expect(getCoordinatorAlertLaneLabel({
      key: 'up-next:cocktails',
      label: 'Cue next event',
      subject: 'Cocktails coming up',
      body: 'Be ready to head over soon.',
      audience: 'event:cocktails',
    })).toBe('Up-next cue');

    expect(getCoordinatorAlertLaneLabel({
      key: 'check-in',
      label: 'Prompt arrivals',
      subject: 'Check-in reminder',
      body: 'Please head to check-in.',
      audience: 'all',
    })).toBe('Check-in reminder');
  });

  it('falls back gracefully for custom or missing intent', () => {
    expect(getCoordinatorAlertLaneLabel(null)).toBe('Custom update');
  });
});
