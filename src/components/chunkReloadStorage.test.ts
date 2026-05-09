import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHUNK_RELOAD_RETRY_RETENTION_MS,
  CHUNK_RELOAD_STORAGE_KEY,
  clearChunkReloadRetryFlag,
  hasFreshChunkReloadRetryFlag,
  writeChunkReloadRetryFlag,
} from './chunkReloadStorage';

describe('chunkReloadStorage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T16:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes and reads a timestamped chunk reload retry flag', () => {
    writeChunkReloadRetryFlag();

    expect(hasFreshChunkReloadRetryFlag()).toBe(true);
    expect(JSON.parse(window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY) ?? '{}')).toEqual({
      savedAtISO: '2026-05-06T16:00:00.000Z',
      retried: true,
    });
  });

  it('migrates the legacy raw chunk reload retry flag', () => {
    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, '1');

    expect(hasFreshChunkReloadRetryFlag()).toBe(true);
    expect(JSON.parse(window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY) ?? '{}')).toMatchObject({
      savedAtISO: '2026-05-06T16:00:00.000Z',
      retried: true,
    });
  });

  it('clears stale and malformed chunk reload retry flags', () => {
    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, JSON.stringify({
      savedAtISO: new Date(Date.now() - CHUNK_RELOAD_RETRY_RETENTION_MS - 1).toISOString(),
      retried: true,
    }));

    expect(hasFreshChunkReloadRetryFlag()).toBe(false);
    expect(window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)).toBeNull();

    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, '{broken');
    expect(hasFreshChunkReloadRetryFlag()).toBe(false);
    expect(window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)).toBeNull();
  });

  it('clears chunk reload retry flags', () => {
    writeChunkReloadRetryFlag();

    clearChunkReloadRetryFlag();

    expect(window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)).toBeNull();
  });
});
