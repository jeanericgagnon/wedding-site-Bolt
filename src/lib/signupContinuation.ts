const SIGNUP_RETURN_PATH_KEY = 'dayoflove:signup-return-path';

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const readSignupReturnPath = (): string | null => {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(SIGNUP_RETURN_PATH_KEY);
    return raw?.trim() ? raw : null;
  } catch {
    return null;
  }
};

export const writeSignupReturnPath = (path: string | null | undefined) => {
  if (!canUseStorage()) return;
  try {
    if (path && path.trim()) {
      window.localStorage.setItem(SIGNUP_RETURN_PATH_KEY, path.trim());
      return;
    }
    window.localStorage.removeItem(SIGNUP_RETURN_PATH_KEY);
  } catch {
    // ignore
  }
};

export const consumeSignupReturnPath = (): string | null => {
  const path = readSignupReturnPath();
  if (!canUseStorage()) return path;
  try {
    window.localStorage.removeItem(SIGNUP_RETURN_PATH_KEY);
  } catch {
    // ignore
  }
  return path;
};

export const resolvePostSignupPath = (fallbackPath: string) => readSignupReturnPath() || fallbackPath;
