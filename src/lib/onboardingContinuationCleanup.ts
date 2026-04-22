import { clearAllOnboardingDraftStorage } from './onboardingDraftCleanup';
import { clearOnboardingResumeStorage } from './onboardingResumeStorage';

export const clearAllOnboardingContinuationState = () => {
  clearAllOnboardingDraftStorage();
  clearOnboardingResumeStorage();
};
