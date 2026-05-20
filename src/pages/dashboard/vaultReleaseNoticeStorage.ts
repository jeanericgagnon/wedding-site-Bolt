const VAULT_RELEASE_NOTICE_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_NOTICE_KEYS = 80;
const MAX_NOTICE_KEY_LENGTH = 160;

interface VaultReleaseNoticeEnvelope {
  savedAtISO: string;
  keys: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeNoticeKeys = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  value.forEach((item) => {
    if (typeof item !== 'string') return;
    const key = item.trim().slice(0, MAX_NOTICE_KEY_LENGTH);
    if (!key || seen.has(key)) return;
    seen.add(key);
    normalized.push(key);
  });
  return normalized.slice(0, MAX_NOTICE_KEYS);
};

const buildEnvelope = (keys: string[]): VaultReleaseNoticeEnvelope => ({
  savedAtISO: new Date().toISOString(),
  keys: normalizeNoticeKeys(keys),
});

const isStaleEnvelope = (savedAtISO: unknown): boolean => {
  if (typeof savedAtISO !== 'string') return true;
  const savedAt = new Date(savedAtISO).getTime();
  return !Number.isFinite(savedAt) || Date.now() - savedAt > VAULT_RELEASE_NOTICE_RETENTION_MS;
};

export const buildVaultReleaseNoticeStorageKey = (storageKey: string, storageScope?: string | null): string => {
  const scope = typeof storageScope === 'string' ? storageScope.trim() : '';
  return scope ? `${storageKey}::${scope}` : storageKey;
};

export const readVaultReleaseNoticeKeys = (storageKey: string): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const legacyKey = storageKey.includes('::') ? storageKey.split('::')[0] ?? storageKey : storageKey;
    const raw = window.localStorage.getItem(storageKey) ?? (
      storageKey !== legacyKey ? window.localStorage.getItem(legacyKey) : null
    );
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const keys = normalizeNoticeKeys(parsed);
      if (keys.length > 0) window.localStorage.setItem(storageKey, JSON.stringify(buildEnvelope(keys)));
      else window.localStorage.removeItem(storageKey);
      return keys;
    }
    if (!isRecord(parsed) || isStaleEnvelope(parsed.savedAtISO)) {
      window.localStorage.removeItem(storageKey);
      return [];
    }
    const keys = normalizeNoticeKeys(parsed.keys);
    if (keys.length === 0) {
      window.localStorage.removeItem(storageKey);
      return [];
    }
    window.localStorage.setItem(storageKey, JSON.stringify(buildEnvelope(keys)));
    return keys;
  } catch {
    window.localStorage.removeItem(storageKey);
    return [];
  }
};

export const writeVaultReleaseNoticeKeys = (storageKey: string, keys: string[]): string[] => {
  const normalized = normalizeNoticeKeys(keys);
  if (typeof window === 'undefined') return normalized;
  if (normalized.length === 0) {
    window.localStorage.removeItem(storageKey);
    return normalized;
  }
  window.localStorage.setItem(storageKey, JSON.stringify(buildEnvelope(normalized)));
  return normalized;
};
