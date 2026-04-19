import { describe, expect, it } from 'vitest';
import { resolveOnboardingResumeIndex } from './onboardingResumeIndex';

describe('onboarding first-incomplete hint safety', () => {
  it('still clamps an out-of-range first incomplete index into valid bounds', () => {
    expect(resolveOnboardingResumeIndex({ savedIndex: 999, firstIncompleteIndex: 999, questionCount: 13 })).toBe(12);
  });

  it('keeps a valid first incomplete index unchanged', () => {
    expect(resolveOnboardingResumeIndex({ savedIndex: 5, firstIncompleteIndex: 5, questionCount: 13 })).toBe(5);
  });
});
