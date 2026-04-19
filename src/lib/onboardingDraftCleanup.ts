import { GUIDED_SETUP_STORAGE_KEY } from './guidedSetupPersistence';
import { QUICK_START_STORAGE_KEY } from './quickStartStateTransfer';

export const ONBOARDING_DRAFT_STORAGE_KEY = 'dayoflove:onboarding-draft';

export const clearAllOnboardingDraftStorage = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
  window.localStorage.removeItem(QUICK_START_STORAGE_KEY);
  window.localStorage.removeItem(GUIDED_SETUP_STORAGE_KEY);
};
