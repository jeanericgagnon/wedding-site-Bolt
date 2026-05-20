import { clearGuidedSetupDraftSnapshot } from './guidedSetupPersistence';
import { clearQuickStartDraftSnapshot } from './quickStartStateTransfer';
import { clearSignupReturnPath } from './signupContinuation';

export const ONBOARDING_DRAFT_STORAGE_KEY = 'dayoflove:onboarding-draft';
export const buildOnboardingDraftStorageKey = (storageScope?: string | null): string => {
  const scope = typeof storageScope === 'string' ? storageScope.trim() : '';
  return scope ? `${ONBOARDING_DRAFT_STORAGE_KEY}::${scope}` : ONBOARDING_DRAFT_STORAGE_KEY;
};

export const clearOnboardingDraftSnapshot = (storageScope?: string | null) => {
  if (typeof window === 'undefined') return;

  try {
    const scopedKey = buildOnboardingDraftStorageKey(storageScope);
    if (window.localStorage.getItem(scopedKey) !== null) {
      window.localStorage.removeItem(scopedKey);
    }
    if (scopedKey !== ONBOARDING_DRAFT_STORAGE_KEY && window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY) !== null) {
      window.localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
    }
  } catch {
    // ignore cleanup failures so other onboarding draft keys can still clear
  }
};

export const clearAllOnboardingDraftStorage = (storageScope?: string | null) => {
  if (typeof window === 'undefined') return;
  clearOnboardingDraftSnapshot(storageScope);
  clearQuickStartDraftSnapshot(storageScope);
  clearGuidedSetupDraftSnapshot(storageScope);
  clearSignupReturnPath(storageScope);
};
