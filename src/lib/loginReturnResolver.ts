import { readSignupReturnPath } from './signupContinuation';

export const resolveLoginReturnPath = (fallbackPath: string, storageScope?: string | null) => readSignupReturnPath(storageScope) || fallbackPath;
