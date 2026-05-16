const ACTIVE_SITE_STORAGE_KEY = 'dayof_active_site_id_v1';
export const ACTIVE_SITE_STORAGE_RETENTION_MS = 1000 * 60 * 60 * 24 * 30;
export const ACTIVE_SITE_STORAGE_CHANGED_EVENT = 'dayof:active-site-changed';
const MAX_ACTIVE_SITE_ID_LENGTH = 120;

type StoredActiveSiteEnvelope = {
  savedAtISO: string;
  siteId: string;
};

function normalizeSiteId(siteId: unknown): string | null {
  if (typeof siteId !== 'string') return null;
  const normalized = siteId.replace(/\s+/g, ' ').trim().slice(0, MAX_ACTIVE_SITE_ID_LENGTH);
  return normalized || null;
}

function isFresh(savedAtISO: unknown): boolean {
  if (typeof savedAtISO !== 'string') return false;
  const savedAt = Date.parse(savedAtISO);
  return Number.isFinite(savedAt) && Date.now() - savedAt <= ACTIVE_SITE_STORAGE_RETENTION_MS;
}

function buildEnvelope(siteId: string): StoredActiveSiteEnvelope {
  return {
    savedAtISO: new Date().toISOString(),
    siteId,
  };
}

function dispatchActiveSiteChanged(siteId: string | null): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ACTIVE_SITE_STORAGE_CHANGED_EVENT, {
    detail: { siteId },
  }));
}

export function getStoredActiveSiteId(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(ACTIVE_SITE_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredActiveSiteEnvelope | string;
    if (typeof parsed === 'string') {
      const normalized = normalizeSiteId(parsed);
      if (normalized) window.localStorage.setItem(ACTIVE_SITE_STORAGE_KEY, JSON.stringify(buildEnvelope(normalized)));
      else window.localStorage.removeItem(ACTIVE_SITE_STORAGE_KEY);
      return normalized;
    }

    if (!parsed || typeof parsed !== 'object' || !isFresh(parsed.savedAtISO)) {
      window.localStorage.removeItem(ACTIVE_SITE_STORAGE_KEY);
      return null;
    }

    const normalized = normalizeSiteId(parsed.siteId);
    if (!normalized) {
      window.localStorage.removeItem(ACTIVE_SITE_STORAGE_KEY);
      return null;
    }
    if (normalized !== parsed.siteId) {
      window.localStorage.setItem(ACTIVE_SITE_STORAGE_KEY, JSON.stringify(buildEnvelope(normalized)));
    }
    return normalized;
  } catch {
    const normalized = normalizeSiteId(raw);
    if (normalized) {
      window.localStorage.setItem(ACTIVE_SITE_STORAGE_KEY, JSON.stringify(buildEnvelope(normalized)));
      return normalized;
    }
    window.localStorage.removeItem(ACTIVE_SITE_STORAGE_KEY);
    return null;
  }
}

export function setStoredActiveSiteId(siteId: string): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeSiteId(siteId);
  if (!normalized) {
    window.localStorage.removeItem(ACTIVE_SITE_STORAGE_KEY);
    dispatchActiveSiteChanged(null);
    return;
  }
  window.localStorage.setItem(ACTIVE_SITE_STORAGE_KEY, JSON.stringify(buildEnvelope(normalized)));
  dispatchActiveSiteChanged(normalized);
}

export function clearStoredActiveSiteId(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACTIVE_SITE_STORAGE_KEY);
  dispatchActiveSiteChanged(null);
}
