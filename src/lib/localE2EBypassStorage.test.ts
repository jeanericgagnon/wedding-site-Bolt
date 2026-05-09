import { beforeEach, describe, expect, it } from 'vitest';
import {
  LOCAL_E2E_AUTH_KEY,
  LOCAL_E2E_BYPASS_RETENTION_MS,
  readLocalE2EBypassFlag,
} from './localE2EBypassStorage';

describe('localE2EBypassStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('migrates active legacy localhost bypass flags into timestamped envelopes', () => {
    window.localStorage.setItem(LOCAL_E2E_AUTH_KEY, '1');

    expect(readLocalE2EBypassFlag(LOCAL_E2E_AUTH_KEY, 'localhost', Date.UTC(2026, 4, 7))).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(LOCAL_E2E_AUTH_KEY) ?? '{}')).toMatchObject({
      enabled: true,
      savedAtISO: '2026-05-07T00:00:00.000Z',
    });
  });

  it('rejects bypass flags away from localhost', () => {
    window.localStorage.setItem(LOCAL_E2E_AUTH_KEY, '1');

    expect(readLocalE2EBypassFlag(LOCAL_E2E_AUTH_KEY, 'dayof.love')).toBe(false);
  });

  it('removes stale or malformed envelopes', () => {
    const savedAt = Date.UTC(2026, 4, 7);
    window.localStorage.setItem(LOCAL_E2E_AUTH_KEY, JSON.stringify({
      enabled: true,
      savedAtISO: new Date(savedAt).toISOString(),
    }));

    expect(readLocalE2EBypassFlag(LOCAL_E2E_AUTH_KEY, '127.0.0.1', savedAt + LOCAL_E2E_BYPASS_RETENTION_MS + 1)).toBe(false);
    expect(window.localStorage.getItem(LOCAL_E2E_AUTH_KEY)).toBeNull();

    window.localStorage.setItem(LOCAL_E2E_AUTH_KEY, '{not-json');
    expect(readLocalE2EBypassFlag(LOCAL_E2E_AUTH_KEY, '127.0.0.1', savedAt)).toBe(false);
    expect(window.localStorage.getItem(LOCAL_E2E_AUTH_KEY)).toBeNull();
  });
});
