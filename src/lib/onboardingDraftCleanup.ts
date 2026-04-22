import { clearGuidedSetupDraftSnapshot } from './guidedSetupPersistence';
import { clearQuickStartDraftSnapshot } from './quickStartStateTransfer';

export const ONBOARDING_DRAFT_STORAGE_KEY = 'dayoflove:onboarding-draft';

export const clearOnboardingDraftSnapshot = () => {
  if (typeof window === 'undefined') return;

  try {
    if (window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY) !== null) {
      window.localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
    }
  } catch {
    // ignore cleanup failures so other onboarding draft keys can still clear
  }
};

export const clearAllOnboardingDraftStorage = () => {
  if (typeof window === 'undefined') return;
  clearOnboardingDraftSnapshot();
  clearQuickStartDraftSnapshot();
  clearGuidedSetupDraftSnapshot();
};
