import { describe, expect, it } from 'vitest';
import { shouldExpireCoordinatorOverrideCue } from './coordinatorOverrideCueExpiry';

describe('coordinatorOverrideCueExpiry', () => {
  it('expires override cues when fresher summary feedback is present', () => {
    expect(shouldExpireCoordinatorOverrideCue({
      shownAt: 1_000,
      now: 1_100,
      maxAgeMs: 5_000,
      hasSummaryFeedback: true,
    })).toBe(true);
  });

  it('expires override cues after their allowed age', () => {
    expect(shouldExpireCoordinatorOverrideCue({
      shownAt: 1_000,
      now: 6_000,
      maxAgeMs: 5_000,
      hasSummaryFeedback: false,
    })).toBe(true);
  });

  it('keeps fresh override cues when nothing stronger has replaced them', () => {
    expect(shouldExpireCoordinatorOverrideCue({
      shownAt: 1_000,
      now: 4_000,
      maxAgeMs: 5_000,
      hasSummaryFeedback: false,
    })).toBe(false);
  });
});
