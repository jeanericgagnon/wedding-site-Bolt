const BUILDER_COACHMARK_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
const BUILDER_COACHMARK_STORAGE_SCOPE_SEPARATOR = '::scope::';

interface BuilderCoachmarkEnvelope {
  savedAtISO: string;
  seen: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeBuilderCoachmarkStorageScope = (storageScope?: string | null): string | null => {
  if (typeof storageScope !== 'string') return null;
  const normalized = storageScope.trim();
  return normalized.length > 0 ? normalized : null;
};

export const buildBuilderCoachmarkStorageKey = (storageKey: string, storageScope?: string | null): string => {
  const normalizedScope = normalizeBuilderCoachmarkStorageScope(storageScope);
  return normalizedScope
    ? `${storageKey}${BUILDER_COACHMARK_STORAGE_SCOPE_SEPARATOR}${normalizedScope}`
    : storageKey;
};

const buildEnvelope = (seen: boolean): BuilderCoachmarkEnvelope => ({
  savedAtISO: new Date().toISOString(),
  seen,
});

const isStaleEnvelope = (savedAtISO: unknown): boolean => {
  if (typeof savedAtISO !== 'string') return true;
  const savedAt = new Date(savedAtISO).getTime();
  return !Number.isFinite(savedAt) || Date.now() - savedAt > BUILDER_COACHMARK_RETENTION_MS;
};

export const readBuilderCoachmarkSeen = (storageKey: string, storageScope?: string | null): boolean => {
  if (typeof window === 'undefined') return false;
  const scopedStorageKey = buildBuilderCoachmarkStorageKey(storageKey, storageScope);
  try {
    let raw = window.localStorage.getItem(scopedStorageKey);
    if (!raw && scopedStorageKey !== storageKey) {
      raw = window.localStorage.getItem(storageKey);
      if (raw) {
        window.localStorage.setItem(scopedStorageKey, raw);
        window.localStorage.removeItem(storageKey);
      }
    }
    if (!raw) return false;
    if (raw === '1' || raw === 'true') {
      window.localStorage.setItem(scopedStorageKey, JSON.stringify(buildEnvelope(true)));
      if (scopedStorageKey !== storageKey) window.localStorage.removeItem(storageKey);
      return true;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || isStaleEnvelope(parsed.savedAtISO)) {
      window.localStorage.removeItem(scopedStorageKey);
      if (scopedStorageKey !== storageKey) window.localStorage.removeItem(storageKey);
      return false;
    }
    if (parsed.seen !== true) {
      window.localStorage.removeItem(scopedStorageKey);
      if (scopedStorageKey !== storageKey) window.localStorage.removeItem(storageKey);
      return false;
    }
    window.localStorage.setItem(scopedStorageKey, JSON.stringify(buildEnvelope(true)));
    if (scopedStorageKey !== storageKey) window.localStorage.removeItem(storageKey);
    return true;
  } catch {
    window.localStorage.removeItem(scopedStorageKey);
    if (scopedStorageKey !== storageKey) window.localStorage.removeItem(storageKey);
    return false;
  }
};

export const writeBuilderCoachmarkSeen = (storageKey: string, seen = true, storageScope?: string | null): void => {
  if (typeof window === 'undefined') return;
  const scopedStorageKey = buildBuilderCoachmarkStorageKey(storageKey, storageScope);
  if (!seen) {
    window.localStorage.removeItem(scopedStorageKey);
    if (scopedStorageKey !== storageKey) window.localStorage.removeItem(storageKey);
    return;
  }
  window.localStorage.setItem(scopedStorageKey, JSON.stringify(buildEnvelope(true)));
  if (scopedStorageKey !== storageKey) window.localStorage.removeItem(storageKey);
};
