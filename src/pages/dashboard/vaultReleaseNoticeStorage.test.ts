import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildVaultReleaseNoticeStorageKey, readVaultReleaseNoticeKeys, writeVaultReleaseNoticeKeys } from './vaultReleaseNoticeStorage';

describe('vaultReleaseNoticeStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores release notices as bounded timestamped envelopes', () => {
    const key = 'vault-release-notices-test';
    const notices = writeVaultReleaseNoticeKeys(key, [' vault-a:2026-02-23 ', 'vault-a:2026-02-23', 'x'.repeat(220)]);

    expect(notices).toEqual(['vault-a:2026-02-23', 'x'.repeat(160)]);
    expect(JSON.parse(window.localStorage.getItem(key) || '{}')).toMatchObject({
      savedAtISO: '2026-05-06T12:00:00.000Z',
      keys: notices,
    });
    expect(readVaultReleaseNoticeKeys(key)).toEqual(notices);
  });

  it('migrates legacy release notices and clears stale or malformed payloads', () => {
    const key = 'vault-release-notices-test';
    window.localStorage.setItem(key, JSON.stringify(['legacy-a', 'legacy-a', 'legacy-b']));
    expect(readVaultReleaseNoticeKeys(key)).toEqual(['legacy-a', 'legacy-b']);
    expect(JSON.parse(window.localStorage.getItem(key) || '{}')).toHaveProperty('savedAtISO');

    window.localStorage.setItem(key, JSON.stringify({
      savedAtISO: '2025-01-01T00:00:00.000Z',
      keys: ['old-a'],
    }));
    expect(readVaultReleaseNoticeKeys(key)).toEqual([]);
    expect(window.localStorage.getItem(key)).toBeNull();

    window.localStorage.setItem(key, '{broken');
    expect(readVaultReleaseNoticeKeys(key)).toEqual([]);
    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it('builds scoped storage keys for per-site vault release notices', () => {
    expect(buildVaultReleaseNoticeStorageKey('vault-release-notices-test')).toBe('vault-release-notices-test');
    expect(buildVaultReleaseNoticeStorageKey('vault-release-notices-test', 'site-a')).toBe('vault-release-notices-test::site-a');
  });

  it('migrates legacy release notices into the active wedding site scope', () => {
    const baseKey = 'vault-release-notices-test';
    const scopedKey = buildVaultReleaseNoticeStorageKey(baseKey, 'site-a');
    window.localStorage.setItem(baseKey, JSON.stringify({
      savedAtISO: '2026-05-06T12:00:00.000Z',
      keys: ['legacy-a'],
    }));

    expect(readVaultReleaseNoticeKeys(scopedKey)).toEqual(['legacy-a']);
    expect(window.localStorage.getItem(scopedKey)).toContain('legacy-a');
  });
});
