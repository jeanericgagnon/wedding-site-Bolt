export const ONBOARDING_RESUME_HINT_STORAGE_KEY = 'dayoflove:onboarding-resume-hint';
export const ONBOARDING_RESUME_INDEX_STORAGE_KEY = 'dayoflove:onboarding-resume-index';

const clearResumeStorageKey = (key: string) => {
  try {
    if (window.localStorage.getItem(key) !== null) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore cleanup failures so sibling resume keys can still clear
  }
};

export const clearOnboardingResumeStorage = () => {
  if (typeof window === 'undefined') return;
  clearResumeStorageKey(ONBOARDING_RESUME_HINT_STORAGE_KEY);
  clearResumeStorageKey(ONBOARDING_RESUME_INDEX_STORAGE_KEY);
};
