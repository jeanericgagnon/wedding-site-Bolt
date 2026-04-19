import { readSignupReturnPath } from './signupContinuation';

export const resolveLoginReturnPath = (fallbackPath: string) => readSignupReturnPath() || fallbackPath;
