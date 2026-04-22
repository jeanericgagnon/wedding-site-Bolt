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


export const readOnboardingResumeState = (): { hint: string | null; index: number | null } => {
  if (typeof window === 'undefined') {
    return { hint: null, index: null };
  }

  try {
    const rawHint = window.localStorage.getItem(ONBOARDING_RESUME_HINT_STORAGE_KEY);
    const rawIndex = window.localStorage.getItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY);
    const hint = rawHint?.trim() ?? '';
    const parsedIndex = rawIndex === null ? null : Number(rawIndex);
    const index = parsedIndex !== null
      && Number.isFinite(parsedIndex)
      && Number.isInteger(parsedIndex)
      && Number.isSafeInteger(parsedIndex)
      && parsedIndex >= 0
        ? parsedIndex
        : null;

    if (hint !== rawHint) {
      if (hint.length > 0) {
        window.localStorage.setItem(ONBOARDING_RESUME_HINT_STORAGE_KEY, hint);
      } else if (rawHint !== null) {
        window.localStorage.removeItem(ONBOARDING_RESUME_HINT_STORAGE_KEY);
      }
    }

    if (rawIndex !== null) {
      if (index === null) {
        window.localStorage.removeItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY);
      } else if (String(index) !== rawIndex) {
        window.localStorage.setItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY, String(index));
      }
    }

    return { hint: hint.length > 0 ? hint : null, index };
  } catch {
    return { hint: null, index: null };
  }
};


export const writeOnboardingResumeTarget = (hint: string | null | undefined) => {
  writeOnboardingResumeHint(hint);
  clearResumeStorageKey(ONBOARDING_RESUME_INDEX_STORAGE_KEY);
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
