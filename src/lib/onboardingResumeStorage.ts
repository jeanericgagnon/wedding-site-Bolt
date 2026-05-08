export const ONBOARDING_RESUME_HINT_STORAGE_KEY = 'dayoflove:onboarding-resume-hint';
export const ONBOARDING_RESUME_INDEX_STORAGE_KEY = 'dayoflove:onboarding-resume-index';

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

export const writeOnboardingResumeHint = (value: string | null | undefined) => {
  if (typeof window === 'undefined') return;

  try {
    const trimmed = normalizeResumeHint(value) ?? '';
    const existingValue = window.localStorage.getItem(ONBOARDING_RESUME_HINT_STORAGE_KEY);

    if (trimmed.length > 0) {
      const existingHint = existingValue ? readStoredHint(existingValue).hint : null;
      if (existingHint !== trimmed) {
        window.localStorage.setItem(ONBOARDING_RESUME_HINT_STORAGE_KEY, JSON.stringify(buildHintEnvelope(trimmed)));
      }
      return;
    }

    if (existingValue !== null) {
      window.localStorage.removeItem(ONBOARDING_RESUME_HINT_STORAGE_KEY);
    }
  } catch {
    // ignore write failures so onboarding navigation can continue
  }
};


export const readOnboardingResumeState = (): { hint: string | null; index: number | null } => {
  if (typeof window === 'undefined') {
    return { hint: null, index: null };
  }

  try {
    const rawHint = window.localStorage.getItem(ONBOARDING_RESUME_HINT_STORAGE_KEY);
    const rawIndex = window.localStorage.getItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY);
    const storedHint = rawHint ? readStoredHint(rawHint) : { hint: null, shouldMigrate: false };
    const storedIndex = rawIndex ? readStoredIndex(rawIndex) : { index: null, shouldMigrate: false };

    if (rawHint !== null) {
      if (storedHint.hint) {
        const nextHint = JSON.stringify(buildHintEnvelope(storedHint.hint));
        if (storedHint.shouldMigrate || rawHint !== nextHint) window.localStorage.setItem(ONBOARDING_RESUME_HINT_STORAGE_KEY, nextHint);
      } else {
        window.localStorage.removeItem(ONBOARDING_RESUME_HINT_STORAGE_KEY);
      }
    }

    if (rawIndex !== null) {
      if (storedIndex.index === null) {
        window.localStorage.removeItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY);
      } else {
        const nextIndex = JSON.stringify(buildIndexEnvelope(storedIndex.index));
        if (storedIndex.shouldMigrate || rawIndex !== nextIndex) window.localStorage.setItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY, nextIndex);
      }
    }

    return { hint: storedHint.hint, index: storedIndex.index };
  } catch {
    return { hint: null, index: null };
  }
};


export const writeOnboardingResumeTarget = (hint: string | null | undefined) => {
  writeOnboardingResumeHint(hint);
  clearResumeStorageKey(ONBOARDING_RESUME_INDEX_STORAGE_KEY);
};

const clearResumeStorageKey = (key: string) => {
  try {
    if (window.localStorage.getItem(key) !== null) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore cleanup failures so sibling resume keys can still clear
  }
};

export const clearOnboardingResumeStorage = () => {
  if (typeof window === 'undefined') return;
  clearResumeStorageKey(ONBOARDING_RESUME_HINT_STORAGE_KEY);
  clearResumeStorageKey(ONBOARDING_RESUME_INDEX_STORAGE_KEY);
};
