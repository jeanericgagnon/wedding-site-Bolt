import { beforeEach, describe, expect, it } from 'vitest';
import { clearOnboardingResumeStorage, ONBOARDING_RESUME_HINT_STORAGE_KEY, ONBOARDING_RESUME_INDEX_STORAGE_KEY } from './onboardingResumeStorage';

describe('onboardingResumeStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('clears both onboarding resume storage keys together', () => {
    window.localStorage.setItem(ONBOARDING_RESUME_HINT_STORAGE_KEY, 'first-incomplete');
    window.localStorage.setItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY, '9');

    clearOnboardingResumeStorage();

    expect(window.localStorage.getItem(ONBOARDING_RESUME_HINT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY)).toBeNull();
  });
});
