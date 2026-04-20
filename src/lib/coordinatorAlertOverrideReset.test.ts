import { describe, expect, it } from 'vitest';
import { shouldResetCoordinatorAlertOverride } from './coordinatorAlertOverrideReset';

describe('coordinatorAlertOverrideReset', () => {
  it('clears alert override state once the draft is re-aligned', () => {
    expect(shouldResetCoordinatorAlertOverride({
      overrideLabel: 'Manual alert override: draft diverged from live event update',
      aligned: true,
    })).toBe(true);
  });

  it('keeps alert override state while the draft is still off-lane', () => {
    expect(shouldResetCoordinatorAlertOverride({
      overrideLabel: 'Manual alert override: draft diverged from live event update',
      aligned: false,
    })).toBe(false);
  });

  it('stays quiet when there is no active override state', () => {
    expect(shouldResetCoordinatorAlertOverride({
      overrideLabel: null,
      aligned: true,
    })).toBe(false);
  });
});
