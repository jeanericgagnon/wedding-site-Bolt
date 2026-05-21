const ACTIVE_SITE_STORAGE_KEY = 'dayof_active_site_id_v1';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeStoredSiteId(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (UUID_PATTERN.test(trimmed)) return trimmed;

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { siteId?: unknown };
      const candidate = typeof parsed.siteId === 'string' ? parsed.siteId.trim() : '';
      if (UUID_PATTERN.test(candidate)) return candidate;
    } catch {
      // ignore invalid json
    }
  }

  return null;
}

export function getStoredActiveSiteId(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(ACTIVE_SITE_STORAGE_KEY);
  const normalized = normalizeStoredSiteId(raw);
  if (raw && !normalized) {
    window.localStorage.removeItem(ACTIVE_SITE_STORAGE_KEY);
  }
  return normalized;
}

export function setStoredActiveSiteId(siteId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACTIVE_SITE_STORAGE_KEY, siteId);
}

export function clearStoredActiveSiteId(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACTIVE_SITE_STORAGE_KEY);
}
