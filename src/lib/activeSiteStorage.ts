const ACTIVE_SITE_STORAGE_KEY = 'dayof_active_site_id_v1';

export function getStoredActiveSiteId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACTIVE_SITE_STORAGE_KEY);
}

export function setStoredActiveSiteId(siteId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACTIVE_SITE_STORAGE_KEY, siteId);
}

export function clearStoredActiveSiteId(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACTIVE_SITE_STORAGE_KEY);
}
