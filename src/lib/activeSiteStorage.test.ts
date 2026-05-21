import { beforeEach, describe, expect, it } from 'vitest';
import { clearStoredActiveSiteId, getStoredActiveSiteId, setStoredActiveSiteId } from './activeSiteStorage';

const ACTIVE_SITE_STORAGE_KEY = 'dayof_active_site_id_v1';

describe('activeSiteStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns a valid uuid site id as-is', () => {
    const siteId = '11111111-1111-4111-8111-111111111111';
    setStoredActiveSiteId(siteId);
    expect(getStoredActiveSiteId()).toBe(siteId);
  });

  it('hydrates a legacy envelope shape and returns only the site id', () => {
    window.localStorage.setItem(
      ACTIVE_SITE_STORAGE_KEY,
      JSON.stringify({ savedAtISO: '2026-05-21T20:00:00.000Z', siteId: '22222222-2222-4222-8222-222222222222' }),
    );
    expect(getStoredActiveSiteId()).toBe('22222222-2222-4222-8222-222222222222');
  });

  it('drops invalid stored values so they cannot flow into uuid filters', () => {
    window.localStorage.setItem(
      ACTIVE_SITE_STORAGE_KEY,
      JSON.stringify({ savedAtISO: '2026-05-21T20:00:00.000Z', siteId: 'not-a-uuid' }),
    );
    expect(getStoredActiveSiteId()).toBeNull();
    expect(window.localStorage.getItem(ACTIVE_SITE_STORAGE_KEY)).toBeNull();
  });

  it('clear helper removes storage key', () => {
    setStoredActiveSiteId('33333333-3333-4333-8333-333333333333');
    clearStoredActiveSiteId();
    expect(getStoredActiveSiteId()).toBeNull();
  });
});
