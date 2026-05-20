import { beforeEach, describe, expect, it } from 'vitest';
import { buildOnboardingDraftStorageKey, clearAllOnboardingDraftStorage, ONBOARDING_DRAFT_STORAGE_KEY } from './onboardingDraftCleanup';
import { buildOnboardingResumeStorageKey, clearOnboardingResumeStorage, ONBOARDING_RESUME_HINT_STORAGE_KEY, ONBOARDING_RESUME_INDEX_STORAGE_KEY } from './onboardingResumeStorage';
import { writeSignupReturnPath, readSignupReturnPath } from './signupContinuation';

describe('payment timeout full cleanup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('can clear drafts, resume keys, and signup return state before returning to payment', () => {
    window.localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, '1');
    window.localStorage.setItem(ONBOARDING_RESUME_HINT_STORAGE_KEY, 'first-incomplete');
    window.localStorage.setItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY, '9');
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1');

    clearAllOnboardingDraftStorage();
    clearOnboardingResumeStorage();

    expect(window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_RESUME_HINT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY)).toBeNull();
    expect(readSignupReturnPath()).toBeNull();
  });

  it('can clear scoped drafts and resume keys before returning to payment too', () => {
    window.localStorage.setItem(buildOnboardingDraftStorageKey('user-a'), '1');
    window.localStorage.setItem(buildOnboardingResumeStorageKey(ONBOARDING_RESUME_HINT_STORAGE_KEY, 'user-a'), 'first-incomplete');
    window.localStorage.setItem(buildOnboardingResumeStorageKey(ONBOARDING_RESUME_INDEX_STORAGE_KEY, 'user-a'), '9');

    clearAllOnboardingDraftStorage('user-a');
    clearOnboardingResumeStorage('user-a');

    expect(window.localStorage.getItem(buildOnboardingDraftStorageKey('user-a'))).toBeNull();
    expect(window.localStorage.getItem(buildOnboardingResumeStorageKey(ONBOARDING_RESUME_HINT_STORAGE_KEY, 'user-a'))).toBeNull();
    expect(window.localStorage.getItem(buildOnboardingResumeStorageKey(ONBOARDING_RESUME_INDEX_STORAGE_KEY, 'user-a'))).toBeNull();
  });
});
