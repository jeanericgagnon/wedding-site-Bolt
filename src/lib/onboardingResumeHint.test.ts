import { describe, expect, it } from 'vitest';
import { resolveOnboardingResumeIndex } from './onboardingResumeIndex';

describe('onboarding resume hint index safety', () => {
  it('clamps a raw hinted question index to the valid incomplete-safe range', () => {
    expect(resolveOnboardingResumeIndex({ savedIndex: 99, firstIncompleteIndex: 4, questionCount: 13 })).toBe(4);
  });

  it('preserves a valid hinted question index when it is already safe', () => {
    expect(resolveOnboardingResumeIndex({ savedIndex: 2, firstIncompleteIndex: 6, questionCount: 13 })).toBe(2);
  });
});
