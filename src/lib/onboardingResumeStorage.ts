export const ONBOARDING_RESUME_HINT_STORAGE_KEY = 'dayoflove:onboarding-resume-hint';
export const ONBOARDING_RESUME_INDEX_STORAGE_KEY = 'dayoflove:onboarding-resume-index';

export const writeOnboardingResumeHint = (value: string | null | undefined) => {
  if (typeof window === 'undefined') return;

  try {
    const trimmed = value?.trim() ?? '';
    const existingValue = window.localStorage.getItem(ONBOARDING_RESUME_HINT_STORAGE_KEY);

    if (trimmed.length > 0) {
      if (existingValue !== trimmed) {
        window.localStorage.setItem(ONBOARDING_RESUME_HINT_STORAGE_KEY, trimmed);
      }
      return;
    }

    if (existingValue !== null) {
      window.localStorage.removeItem(ONBOARDING_RESUME_HINT_STORAGE_KEY);
    }
  } catch {
    // ignore write failures so onboarding navigation can continue
  }
};

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
