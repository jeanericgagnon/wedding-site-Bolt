import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllOnboardingDraftStorage, ONBOARDING_DRAFT_STORAGE_KEY } from './onboardingDraftCleanup';
import { GUIDED_SETUP_STORAGE_KEY } from './guidedSetupPersistence';
import { QUICK_START_STORAGE_KEY } from './quickStartStateTransfer';

describe('onboardingDraftCleanup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('clears generic onboarding, quick start, and guided setup draft storage together', () => {
    window.localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, '1');
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, '1');
    window.localStorage.setItem(GUIDED_SETUP_STORAGE_KEY, '1');

    clearAllOnboardingDraftStorage();

    expect(window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(GUIDED_SETUP_STORAGE_KEY)).toBeNull();
  });
});
