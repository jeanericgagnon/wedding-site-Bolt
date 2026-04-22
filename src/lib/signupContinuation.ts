const SIGNUP_RETURN_PATH_KEY = 'dayoflove:signup-return-path';

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const isSafeReturnPath = (path: string) => path.startsWith('/') && !path.startsWith('//');

export const readSignupReturnPath = (): string | null => {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(SIGNUP_RETURN_PATH_KEY)?.trim();
    return raw && isSafeReturnPath(raw) ? raw : null;
  } catch {
    return null;
  }
};

export const writeSignupReturnPath = (path: string | null | undefined) => {
  if (!canUseStorage()) return;
  try {
    const trimmedPath = path?.trim();
    const existingPath = window.localStorage.getItem(SIGNUP_RETURN_PATH_KEY);

    if (trimmedPath && isSafeReturnPath(trimmedPath)) {
      if (existingPath !== trimmedPath) {
        window.localStorage.setItem(SIGNUP_RETURN_PATH_KEY, trimmedPath);
      }
      return;
    }

    if (existingPath !== null) {
      window.localStorage.removeItem(SIGNUP_RETURN_PATH_KEY);
    }
  } catch {
    // ignore
  }
};

export const consumeSignupReturnPath = (): string | null => {
  const path = readSignupReturnPath();
  if (!canUseStorage()) return path;
  try {
    if (window.localStorage.getItem(SIGNUP_RETURN_PATH_KEY) !== null) {
      window.localStorage.removeItem(SIGNUP_RETURN_PATH_KEY);
    }
  } catch {
    // ignore
  }
  return path;
};

export const resolvePostSignupPath = (fallbackPath: string) => {
  const safeFallbackPath = isSafeReturnPath(fallbackPath) ? fallbackPath : '/';
  return readSignupReturnPath() || safeFallbackPath;
};
