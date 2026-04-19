import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllOnboardingContinuationState } from './onboardingContinuationCleanup';
import { ONBOARDING_DRAFT_STORAGE_KEY } from './onboardingDraftCleanup';
import { ONBOARDING_RESUME_HINT_STORAGE_KEY, ONBOARDING_RESUME_INDEX_STORAGE_KEY } from './onboardingResumeStorage';
import { writeSignupReturnPath, readSignupReturnPath } from './signupContinuation';
import { GUIDED_SETUP_STORAGE_KEY } from './guidedSetupPersistence';

describe('guidedSetup success cleanup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('can clear full continuation state after guided setup succeeds', () => {
    window.localStorage.setItem(GUIDED_SETUP_STORAGE_KEY, '1');
    window.localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, '1');
    window.localStorage.setItem(ONBOARDING_RESUME_HINT_STORAGE_KEY, 'first-incomplete');
    window.localStorage.setItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY, '9');
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1');

    clearAllOnboardingContinuationState();

    expect(window.localStorage.getItem(GUIDED_SETUP_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_RESUME_HINT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY)).toBeNull();
    expect(readSignupReturnPath()).toBeNull();
  });
});
