import { GUIDED_SETUP_STORAGE_KEY } from './guidedSetupPersistence';
import { clearQuickStartDraftSnapshot } from './quickStartStateTransfer';

export const ONBOARDING_DRAFT_STORAGE_KEY = 'dayoflove:onboarding-draft';

export const clearAllOnboardingDraftStorage = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
  clearQuickStartDraftSnapshot();
  window.localStorage.removeItem(GUIDED_SETUP_STORAGE_KEY);
};
