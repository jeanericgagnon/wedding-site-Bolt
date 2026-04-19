import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllOnboardingDraftStorage, ONBOARDING_DRAFT_STORAGE_KEY } from './onboardingDraftCleanup';
import { GUIDED_SETUP_STORAGE_KEY } from './guidedSetupPersistence';
import { QUICK_START_STORAGE_KEY } from './quickStartStateTransfer';
import { writeSignupReturnPath, readSignupReturnPath } from './signupContinuation';

describe('paymentRequired active cleanup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('can clear onboarding drafts and signup return state before active-payment redirect', () => {
    window.localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, '1');
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, '1');
    window.localStorage.setItem(GUIDED_SETUP_STORAGE_KEY, '1');
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1');

    clearAllOnboardingDraftStorage();
    writeSignupReturnPath(null);

    expect(window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(GUIDED_SETUP_STORAGE_KEY)).toBeNull();
    expect(readSignupReturnPath()).toBeNull();
  });
});
