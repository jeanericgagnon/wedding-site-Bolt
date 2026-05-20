export const ONBOARDING_RESUME_HINT_STORAGE_KEY = 'dayoflove:onboarding-resume-hint';
export const ONBOARDING_RESUME_INDEX_STORAGE_KEY = 'dayoflove:onboarding-resume-index';
export const buildOnboardingResumeStorageKey = (key: string, storageScope?: string | null): string => {
  const scope = typeof storageScope === 'string' ? storageScope.trim() : '';
  return scope ? `${key}::${scope}` : key;
};

const ONBOARDING_RESUME_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ONBOARDING_RESUME_HINT_LENGTH = 80;

interface OnboardingResumeHintEnvelope {
  savedAtISO: string;
  hint: string;
}

interface OnboardingResumeIndexEnvelope {
  savedAtISO: string;
  index: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const buildHintEnvelope = (hint: string): OnboardingResumeHintEnvelope => ({
  savedAtISO: new Date().toISOString(),
  hint: normalizeResumeHint(hint) ?? '',
});

const buildIndexEnvelope = (index: number): OnboardingResumeIndexEnvelope => ({
  savedAtISO: new Date().toISOString(),
  index,
});

const isStaleResumeEnvelope = (savedAtISO: unknown): boolean => {
  if (typeof savedAtISO !== 'string') return true;
  const savedAt = new Date(savedAtISO).getTime();
  return !Number.isFinite(savedAt) || Date.now() - savedAt > ONBOARDING_RESUME_RETENTION_MS;
};

const normalizeResumeHint = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, MAX_ONBOARDING_RESUME_HINT_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeResumeIndex = (value: unknown): number | null => {
  const parsedIndex = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsedIndex)
    && Number.isInteger(parsedIndex)
    && Number.isSafeInteger(parsedIndex)
    && parsedIndex >= 0
      ? parsedIndex
      : null;
};

const readStoredHint = (raw: string): { hint: string | null; shouldMigrate: boolean } => {
  if (raw.trim().startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed) || isStaleResumeEnvelope(parsed.savedAtISO)) return { hint: null, shouldMigrate: false };
      return { hint: normalizeResumeHint(parsed.hint), shouldMigrate: false };
    } catch {
      return { hint: null, shouldMigrate: false };
    }
  }
  const legacy = normalizeResumeHint(raw);
  if (legacy) return { hint: legacy, shouldMigrate: true };
  return { hint: null, shouldMigrate: false };
};

const readStoredIndex = (raw: string): { index: number | null; shouldMigrate: boolean } => {
  const legacy = normalizeResumeIndex(raw);
  if (legacy !== null) return { index: legacy, shouldMigrate: true };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || isStaleResumeEnvelope(parsed.savedAtISO)) return { index: null, shouldMigrate: false };
    return { index: normalizeResumeIndex(parsed.index), shouldMigrate: false };
  } catch {
    return { index: null, shouldMigrate: false };
  }
};

const readScopedResumeRaw = (key: string, storageScope?: string | null): {
  storageKey: string;
  sourceKey: string;
  raw: string | null;
  shouldMigrate: boolean;
} => {
  const storageKey = buildOnboardingResumeStorageKey(key, storageScope);
  const hasScopedKey = window.localStorage.getItem(storageKey) !== null;
  const sourceKey = !hasScopedKey && storageKey !== key ? key : storageKey;
  return {
    storageKey,
    sourceKey,
    raw: window.localStorage.getItem(sourceKey),
    shouldMigrate: sourceKey !== storageKey,
  };
};

export const writeOnboardingResumeHint = (value: string | null | undefined, storageScope?: string | null) => {
  if (typeof window === 'undefined') return;

  try {
    const trimmed = normalizeResumeHint(value) ?? '';
    const { storageKey, sourceKey, raw: existingValue } = readScopedResumeRaw(ONBOARDING_RESUME_HINT_STORAGE_KEY, storageScope);

    if (trimmed.length > 0) {
      const existingHint = existingValue ? readStoredHint(existingValue).hint : null;
      if (existingHint !== trimmed || sourceKey !== storageKey) {
        window.localStorage.setItem(storageKey, JSON.stringify(buildHintEnvelope(trimmed)));
      }
      if (sourceKey !== storageKey) window.localStorage.removeItem(sourceKey);
      return;
    }

    if (existingValue !== null) {
      window.localStorage.removeItem(sourceKey);
      if (storageKey !== sourceKey) window.localStorage.removeItem(storageKey);
    }
  } catch {
    // ignore write failures so onboarding navigation can continue
  }
};


export const readOnboardingResumeState = (storageScope?: string | null): { hint: string | null; index: number | null } => {
  if (typeof window === 'undefined') {
    return { hint: null, index: null };
  }

  try {
    const scopedHint = readScopedResumeRaw(ONBOARDING_RESUME_HINT_STORAGE_KEY, storageScope);
    const scopedIndex = readScopedResumeRaw(ONBOARDING_RESUME_INDEX_STORAGE_KEY, storageScope);
    const storedHint = scopedHint.raw ? readStoredHint(scopedHint.raw) : { hint: null, shouldMigrate: false };
    const storedIndex = scopedIndex.raw ? readStoredIndex(scopedIndex.raw) : { index: null, shouldMigrate: false };

    if (scopedHint.raw !== null) {
      if (storedHint.hint) {
        const nextHint = JSON.stringify(buildHintEnvelope(storedHint.hint));
        if (storedHint.shouldMigrate || scopedHint.shouldMigrate || scopedHint.raw !== nextHint) {
          window.localStorage.setItem(scopedHint.storageKey, nextHint);
          if (scopedHint.shouldMigrate) window.localStorage.removeItem(scopedHint.sourceKey);
        }
      } else {
        window.localStorage.removeItem(scopedHint.sourceKey);
        if (scopedHint.storageKey !== scopedHint.sourceKey) window.localStorage.removeItem(scopedHint.storageKey);
      }
    }

    if (scopedIndex.raw !== null) {
      if (storedIndex.index === null) {
        window.localStorage.removeItem(scopedIndex.sourceKey);
        if (scopedIndex.storageKey !== scopedIndex.sourceKey) window.localStorage.removeItem(scopedIndex.storageKey);
      } else {
        const nextIndex = JSON.stringify(buildIndexEnvelope(storedIndex.index));
        if (storedIndex.shouldMigrate || scopedIndex.shouldMigrate || scopedIndex.raw !== nextIndex) {
          window.localStorage.setItem(scopedIndex.storageKey, nextIndex);
          if (scopedIndex.shouldMigrate) window.localStorage.removeItem(scopedIndex.sourceKey);
        }
      }
    }

    return { hint: storedHint.hint, index: storedIndex.index };
  } catch {
    return { hint: null, index: null };
  }
};


export const writeOnboardingResumeTarget = (hint: string | null | undefined, storageScope?: string | null) => {
  writeOnboardingResumeHint(hint, storageScope);
  clearResumeStorageKey(ONBOARDING_RESUME_INDEX_STORAGE_KEY, storageScope);
};

const clearResumeStorageKey = (key: string, storageScope?: string | null) => {
  try {
    const storageKey = buildOnboardingResumeStorageKey(key, storageScope);
    if (window.localStorage.getItem(storageKey) !== null) {
      window.localStorage.removeItem(storageKey);
    }
    if (storageKey !== key && window.localStorage.getItem(key) !== null) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore cleanup failures so sibling resume keys can still clear
  }
};

export const clearOnboardingResumeStorage = (storageScope?: string | null) => {
  if (typeof window === 'undefined') return;
  clearResumeStorageKey(ONBOARDING_RESUME_HINT_STORAGE_KEY, storageScope);
  clearResumeStorageKey(ONBOARDING_RESUME_INDEX_STORAGE_KEY, storageScope);
};
