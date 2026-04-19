import { clearAllOnboardingDraftStorage } from './onboardingDraftCleanup';
import { clearOnboardingResumeStorage } from './onboardingResumeStorage';
import { writeSignupReturnPath } from './signupContinuation';

export const clearAllOnboardingContinuationState = () => {
  clearAllOnboardingDraftStorage();
  clearOnboardingResumeStorage();
  writeSignupReturnPath(null);
};
