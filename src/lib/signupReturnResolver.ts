import { readSignupReturnPath } from './signupContinuation';

const isSafeReturnPath = (value: string) => value.startsWith('/') && !value.startsWith('//');

export const resolveSignupReturnPath = (
  explicitReturnPath: string | null | undefined,
  fallbackPath: string,
  storageScope?: string | null,
) => {
  const explicit = explicitReturnPath?.trim();
  if (explicit && isSafeReturnPath(explicit)) return explicit;

  const stored = readSignupReturnPath(storageScope);
  if (stored && isSafeReturnPath(stored)) return stored;

  return fallbackPath;
};
