import { GUIDED_SETUP_STORAGE_KEY } from './guidedSetupPersistence';
import { clearQuickStartDraftSnapshot } from './quickStartStateTransfer';

export const ONBOARDING_DRAFT_STORAGE_KEY = 'dayoflove:onboarding-draft';

const clearStorageKeyIfPresent = (key: string) => {
  try {
    if (window.localStorage.getItem(key) !== null) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore cleanup failures so other onboarding draft keys can still clear
  }
};

export const clearAllOnboardingDraftStorage = () => {
  if (typeof window === 'undefined') return;
  clearStorageKeyIfPresent(ONBOARDING_DRAFT_STORAGE_KEY);
  clearQuickStartDraftSnapshot();
  clearStorageKeyIfPresent(GUIDED_SETUP_STORAGE_KEY);
};
