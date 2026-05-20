import { writeSignupReturnPath } from './signupContinuation';

export const clearOnboardingEntryReturnPath = (storageScope?: string | null) => {
  writeSignupReturnPath(null, storageScope);
};
