export const ONBOARDING_RESUME_HINT_STORAGE_KEY = 'dayoflove:onboarding-resume-hint';
export const ONBOARDING_RESUME_INDEX_STORAGE_KEY = 'dayoflove:onboarding-resume-index';

export const clearOnboardingResumeStorage = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ONBOARDING_RESUME_HINT_STORAGE_KEY);
  window.localStorage.removeItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY);
};
