import { describe, expect, it } from 'vitest';
import { shouldExpireCoordinatorCue } from './coordinatorCueExpiry';

describe('coordinatorCueExpiry', () => {
  it('expires cues once they pass the allowed age', () => {
    expect(shouldExpireCoordinatorCue({ shownAt: 1_000, now: 6_500, maxAgeMs: 5_000 })).toBe(true);
    expect(shouldExpireCoordinatorCue({ shownAt: 1_000, now: 6_000, maxAgeMs: 5_000 })).toBe(true);
  });

  it('keeps cues that are still fresh or unset', () => {
    expect(shouldExpireCoordinatorCue({ shownAt: 1_000, now: 4_000, maxAgeMs: 5_000 })).toBe(false);
    expect(shouldExpireCoordinatorCue({ shownAt: null, now: 4_000, maxAgeMs: 5_000 })).toBe(false);
  });
});
