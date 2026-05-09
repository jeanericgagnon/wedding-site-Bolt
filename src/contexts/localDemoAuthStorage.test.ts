import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LOCAL_DEMO_AUTH_KEY,
  LOCAL_DEMO_AUTH_RETENTION_MS,
  clearLocalDemoAuthFlag,
  readLocalDemoAuthFlag,
  writeLocalDemoAuthFlag,
} from './localDemoAuthStorage';

describe('localDemoAuthStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T16:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes and reads a timestamped local demo auth flag', () => {
    writeLocalDemoAuthFlag();

    expect(readLocalDemoAuthFlag()).toBe(true);
    expect(JSON.parse(localStorage.getItem(LOCAL_DEMO_AUTH_KEY) ?? '{}')).toEqual({
      savedAtISO: '2026-05-06T16:00:00.000Z',
      enabled: true,
    });
  });

  it('migrates the legacy local demo auth flag on read', () => {
    localStorage.setItem(LOCAL_DEMO_AUTH_KEY, '1');

    expect(readLocalDemoAuthFlag()).toBe(true);
    expect(JSON.parse(localStorage.getItem(LOCAL_DEMO_AUTH_KEY) ?? '{}')).toMatchObject({
      savedAtISO: '2026-05-06T16:00:00.000Z',
      enabled: true,
    });
  });

  it('expires stale and malformed local demo auth flags', () => {
    localStorage.setItem(LOCAL_DEMO_AUTH_KEY, JSON.stringify({
      savedAtISO: new Date(Date.now() - LOCAL_DEMO_AUTH_RETENTION_MS - 1).toISOString(),
      enabled: true,
    }));

    expect(readLocalDemoAuthFlag()).toBe(false);
    expect(localStorage.getItem(LOCAL_DEMO_AUTH_KEY)).toBeNull();

    localStorage.setItem(LOCAL_DEMO_AUTH_KEY, '{broken');
    expect(readLocalDemoAuthFlag()).toBe(false);
    expect(localStorage.getItem(LOCAL_DEMO_AUTH_KEY)).toBeNull();
  });

  it('clears local demo auth flags', () => {
    writeLocalDemoAuthFlag();

    clearLocalDemoAuthFlag();

    expect(localStorage.getItem(LOCAL_DEMO_AUTH_KEY)).toBeNull();
  });
});
