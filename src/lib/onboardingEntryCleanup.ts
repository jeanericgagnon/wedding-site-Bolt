import { writeSignupReturnPath } from './signupContinuation';

export const clearOnboardingEntryReturnPath = () => {
  writeSignupReturnPath(null);
};
