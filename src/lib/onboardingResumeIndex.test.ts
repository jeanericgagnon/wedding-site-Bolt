import { describe, expect, it } from 'vitest';
import { resolveOnboardingResumeIndex } from './onboardingResumeIndex';

describe('onboardingResumeIndex', () => {
  it('prefers the first incomplete question when saved index drifted too far ahead', () => {
    expect(resolveOnboardingResumeIndex({ savedIndex: 8, firstIncompleteIndex: 3, questionCount: 13 })).toBe(3);
  });

  it('keeps a valid earlier saved index when it is still before the first incomplete spot', () => {
    expect(resolveOnboardingResumeIndex({ savedIndex: 2, firstIncompleteIndex: 5, questionCount: 13 })).toBe(2);
  });

  it('clamps invalid indexes safely', () => {
    expect(resolveOnboardingResumeIndex({ savedIndex: 99, firstIncompleteIndex: 99, questionCount: 13 })).toBe(12);
    expect(resolveOnboardingResumeIndex({ savedIndex: Number.NaN, firstIncompleteIndex: 4, questionCount: 13 })).toBe(0);
  });
});
