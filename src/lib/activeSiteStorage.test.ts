import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACTIVE_SITE_STORAGE_RETENTION_MS,
  clearStoredActiveSiteId,
  getStoredActiveSiteId,
  setStoredActiveSiteId,
} from './activeSiteStorage';

const ACTIVE_SITE_STORAGE_KEY = 'dayof_active_site_id_v1';

describe('activeSiteStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it('stores the active site id in a timestamped envelope', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T21:20:00.000Z'));

    setStoredActiveSiteId(' site-1 ');

    expect(getStoredActiveSiteId()).toBe('site-1');
    expect(JSON.parse(window.localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || '{}')).toEqual({
      savedAtISO: '2026-05-06T21:20:00.000Z',
      siteId: 'site-1',
    });
  });

  it('migrates active legacy active-site ids on read', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T21:21:00.000Z'));
    window.localStorage.setItem(ACTIVE_SITE_STORAGE_KEY, ' legacy-site ');

    expect(getStoredActiveSiteId()).toBe('legacy-site');
    expect(JSON.parse(window.localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || '{}')).toEqual({
      savedAtISO: '2026-05-06T21:21:00.000Z',
      siteId: 'legacy-site',
    });
  });

  it('clears stale, malformed, or blank active-site storage', () => {
    const staleDate = new Date(Date.now() - ACTIVE_SITE_STORAGE_RETENTION_MS - 1000).toISOString();
    window.localStorage.setItem(ACTIVE_SITE_STORAGE_KEY, JSON.stringify({
      savedAtISO: staleDate,
      siteId: 'site-1',
    }));

    expect(getStoredActiveSiteId()).toBeNull();
    expect(window.localStorage.getItem(ACTIVE_SITE_STORAGE_KEY)).toBeNull();

    window.localStorage.setItem(ACTIVE_SITE_STORAGE_KEY, JSON.stringify({
      savedAtISO: new Date().toISOString(),
      siteId: '   ',
    }));
    expect(getStoredActiveSiteId()).toBeNull();
    expect(window.localStorage.getItem(ACTIVE_SITE_STORAGE_KEY)).toBeNull();

    setStoredActiveSiteId('site-2');
    clearStoredActiveSiteId();
    expect(getStoredActiveSiteId()).toBeNull();
  });
});
