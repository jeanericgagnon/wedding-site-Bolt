import { readSignupReturnPath } from './signupContinuation';

const isSafeReturnPath = (value: string) => value.startsWith('/') && !value.startsWith('//');

export const resolveLoginReturnPath = (
  fallbackPath: string,
  explicitReturnPath?: string | null,
) => {
  const explicit = explicitReturnPath?.trim();
  if (explicit && isSafeReturnPath(explicit)) return explicit;
  return readSignupReturnPath() || fallbackPath;
};
