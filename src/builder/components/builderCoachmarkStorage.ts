const BUILDER_COACHMARK_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;

interface BuilderCoachmarkEnvelope {
  savedAtISO: string;
  seen: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const buildEnvelope = (seen: boolean): BuilderCoachmarkEnvelope => ({
  savedAtISO: new Date().toISOString(),
  seen,
});

const isStaleEnvelope = (savedAtISO: unknown): boolean => {
  if (typeof savedAtISO !== 'string') return true;
  const savedAt = new Date(savedAtISO).getTime();
  return !Number.isFinite(savedAt) || Date.now() - savedAt > BUILDER_COACHMARK_RETENTION_MS;
};

export const readBuilderCoachmarkSeen = (storageKey: string): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return false;
    if (raw === '1' || raw === 'true') {
      window.localStorage.setItem(storageKey, JSON.stringify(buildEnvelope(true)));
      return true;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || isStaleEnvelope(parsed.savedAtISO)) {
      window.localStorage.removeItem(storageKey);
      return false;
    }
    if (parsed.seen !== true) {
      window.localStorage.removeItem(storageKey);
      return false;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(buildEnvelope(true)));
    return true;
  } catch {
    window.localStorage.removeItem(storageKey);
    return false;
  }
};

export const writeBuilderCoachmarkSeen = (storageKey: string, seen = true): void => {
  if (typeof window === 'undefined') return;
  if (!seen) {
    window.localStorage.removeItem(storageKey);
    return;
  }
  window.localStorage.setItem(storageKey, JSON.stringify(buildEnvelope(true)));
};
