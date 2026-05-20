import { clearSignupReturnPath } from './signupContinuation';

export const clearAuthEntryReturnPath = (storageScope?: string | null) => {
  clearSignupReturnPath(storageScope);
};
