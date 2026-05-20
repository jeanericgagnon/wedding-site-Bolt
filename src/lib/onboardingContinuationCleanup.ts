import { clearAllOnboardingDraftStorage } from './onboardingDraftCleanup';
import { clearOnboardingResumeStorage } from './onboardingResumeStorage';

export const clearAllOnboardingContinuationState = (storageScope?: string | null) => {
  clearAllOnboardingDraftStorage(storageScope);
  clearOnboardingResumeStorage(storageScope);
};
