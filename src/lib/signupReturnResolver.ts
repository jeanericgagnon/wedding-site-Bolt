import { readSignupReturnPath } from './signupContinuation';

export const resolveSignupReturnPath = (
  explicitReturnPath: string | null | undefined,
  fallbackPath: string,
) => {
  const explicit = explicitReturnPath?.trim();
  if (explicit) return explicit;
  return readSignupReturnPath() || fallbackPath;
};
