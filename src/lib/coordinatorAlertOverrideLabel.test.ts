import { describe, expect, it } from 'vitest';
import { getCoordinatorAlertOverrideLabel } from './coordinatorAlertOverrideLabel';

describe('coordinatorAlertOverrideLabel', () => {
  it('describes when the alert draft has diverged from the board lane', () => {
    expect(getCoordinatorAlertOverrideLabel({ aligned: false, laneLabel: 'Live event update' })).toBe(
      'Manual alert override: draft diverged from live event update',
    );
  });

  it('stays quiet when the draft is aligned', () => {
    expect(getCoordinatorAlertOverrideLabel({ aligned: true, laneLabel: 'Live event update' })).toBeNull();
  });
});
