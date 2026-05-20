const SIGNUP_RETURN_PATH_KEY = 'dayoflove:signup-return-path';
const SIGNUP_RETURN_PATH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const buildSignupReturnPathStorageKey = (storageScope?: string | null) => {
  const scope = typeof storageScope === 'string' ? storageScope.trim().toLowerCase() : '';
  return scope ? `${SIGNUP_RETURN_PATH_KEY}::${scope}` : SIGNUP_RETURN_PATH_KEY;
};

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

const readScopedSignupReturnPathRaw = (storageScope?: string | null) => {
  const storageKey = buildSignupReturnPathStorageKey(storageScope);
  const hasScopedKey = window.localStorage.getItem(storageKey) !== null;
  const sourceKey = !hasScopedKey && storageKey !== SIGNUP_RETURN_PATH_KEY ? SIGNUP_RETURN_PATH_KEY : storageKey;
  return {
    storageKey,
    sourceKey,
    raw: window.localStorage.getItem(sourceKey),
    shouldMigrate: sourceKey !== storageKey,
  };
};

export const clearSignupReturnPath = (storageScope?: string | null) => {
  if (!canUseStorage()) return;
  try {
    const storageKey = buildSignupReturnPathStorageKey(storageScope);
    if (window.localStorage.getItem(storageKey) !== null) {
      window.localStorage.removeItem(storageKey);
    }
    if (storageKey !== SIGNUP_RETURN_PATH_KEY && window.localStorage.getItem(SIGNUP_RETURN_PATH_KEY) !== null) {
      window.localStorage.removeItem(SIGNUP_RETURN_PATH_KEY);
    }
  } catch {
    // ignore
  }
};

export const readSignupReturnPath = (storageScope?: string | null): string | null => {
  if (!canUseStorage()) return null;
  try {
    const { raw, sourceKey, storageKey, shouldMigrate } = readScopedSignupReturnPathRaw(storageScope);
    if (!raw) return null;
    const stored = readStoredSignupReturnPath(raw);

    if (stored.path) {
      const nextValue = JSON.stringify(buildSignupReturnPathEnvelope(stored.path));
      if (stored.shouldMigrate || shouldMigrate || raw !== nextValue) {
        window.localStorage.setItem(storageKey, nextValue);
        if (shouldMigrate) window.localStorage.removeItem(sourceKey);
      }
      return stored.path;
    }

    if (raw !== null) {
      clearSignupReturnPath(storageScope);
    }
    return null;
  } catch {
    return null;
  }
};

export const writeSignupReturnPath = (path: string | null | undefined, storageScope?: string | null) => {
  if (!canUseStorage()) return;
  try {
    const trimmedPath = path?.trim();
    const { raw: existingPath, sourceKey, storageKey } = readScopedSignupReturnPathRaw(storageScope);

    if (trimmedPath && isSafeReturnPath(trimmedPath)) {
      const existing = existingPath ? readStoredSignupReturnPath(existingPath).path : null;
      if (existing !== trimmedPath || sourceKey !== storageKey) {
        window.localStorage.setItem(storageKey, JSON.stringify(buildSignupReturnPathEnvelope(trimmedPath)));
      }
      if (sourceKey !== storageKey) window.localStorage.removeItem(sourceKey);
      return;
    }

    if (existingPath !== null) {
      clearSignupReturnPath(storageScope);
    }
  } catch {
    // ignore
  }
};

export const consumeSignupReturnPath = (storageScope?: string | null): string | null => {
  const path = readSignupReturnPath(storageScope);
  if (!canUseStorage()) return path;
  try {
    const storageKey = buildSignupReturnPathStorageKey(storageScope);
    if (window.localStorage.getItem(storageKey) !== null) {
      window.localStorage.removeItem(storageKey);
    }
    if (storageKey !== SIGNUP_RETURN_PATH_KEY && window.localStorage.getItem(SIGNUP_RETURN_PATH_KEY) !== null) {
      window.localStorage.removeItem(SIGNUP_RETURN_PATH_KEY);
    }
  } catch {
    // ignore
  }
  return path;
};

export const resolvePostSignupPath = (fallbackPath: string, storageScope?: string | null) => {
  const safeFallbackPath = isSafeReturnPath(fallbackPath) ? fallbackPath : '/';
  return readSignupReturnPath(storageScope) || safeFallbackPath;
};
