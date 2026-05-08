const SIGNUP_RETURN_PATH_KEY = 'dayoflove:signup-return-path';
const SIGNUP_RETURN_PATH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const isSafeReturnPath = (path: string) => path.startsWith('/') && !path.startsWith('//');

interface SignupReturnPathEnvelope {
  savedAtISO: string;
  path: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const buildSignupReturnPathEnvelope = (path: string): SignupReturnPathEnvelope => ({
  savedAtISO: new Date().toISOString(),
  path,
});

const isStaleSignupReturnPathEnvelope = (savedAtISO: unknown): boolean => {
  if (typeof savedAtISO !== 'string') return true;
  const savedAt = new Date(savedAtISO).getTime();
  return !Number.isFinite(savedAt) || Date.now() - savedAt > SIGNUP_RETURN_PATH_RETENTION_MS;
};

const readStoredSignupReturnPath = (raw: string): { path: string | null; shouldMigrate: boolean } => {
  const trimmed = raw.trim();
  if (isSafeReturnPath(trimmed)) return { path: trimmed, shouldMigrate: true };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || isStaleSignupReturnPathEnvelope(parsed.savedAtISO)) return { path: null, shouldMigrate: false };
    const path = typeof parsed.path === 'string' ? parsed.path.trim() : '';
    return isSafeReturnPath(path) ? { path, shouldMigrate: false } : { path: null, shouldMigrate: false };
  } catch {
    return { path: null, shouldMigrate: false };
  }
};

export const clearSignupReturnPath = () => {
  if (!canUseStorage()) return;
  try {
    if (window.localStorage.getItem(SIGNUP_RETURN_PATH_KEY) !== null) {
      window.localStorage.removeItem(SIGNUP_RETURN_PATH_KEY);
    }
  } catch {
    // ignore
  }
};

export const readSignupReturnPath = (): string | null => {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(SIGNUP_RETURN_PATH_KEY);
    if (!raw) return null;
    const stored = readStoredSignupReturnPath(raw);

    if (stored.path) {
      const nextValue = JSON.stringify(buildSignupReturnPathEnvelope(stored.path));
      if (stored.shouldMigrate || raw !== nextValue) {
        window.localStorage.setItem(SIGNUP_RETURN_PATH_KEY, nextValue);
      }
      return stored.path;
    }

    if (raw !== null) {
      clearSignupReturnPath();
    }
    return null;
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
      const existing = existingPath ? readStoredSignupReturnPath(existingPath).path : null;
      if (existing !== trimmedPath) {
        window.localStorage.setItem(SIGNUP_RETURN_PATH_KEY, JSON.stringify(buildSignupReturnPathEnvelope(trimmedPath)));
      }
      return;
    }

    if (existingPath !== null) {
      clearSignupReturnPath();
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
