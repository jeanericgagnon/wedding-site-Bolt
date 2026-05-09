import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  VENDOR_META_STORAGE_KEY,
  normalizeVendorMeta,
  readVendorMetaStorage,
  writeVendorMetaStorage,
} from './vendorMetaStorage';

describe('vendorMetaStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T16:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('normalizes vendor metadata rows before storage', () => {
    const normalized = writeVendorMetaStorage({
      ' vendor-1 ': {
        lastContacted: ' 2026-05-01T12:00:00.000Z ',
        nextFollowUp: '2026-05-12T08:00:00.000Z',
      },
      empty: {},
      bad: { lastContacted: 'not-a-date', nextFollowUp: 'also-bad' },
    });

    expect(normalized).toEqual({
      'vendor-1': {
        lastContacted: '2026-05-01T12:00:00.000Z',
        nextFollowUp: '2026-05-12',
      },
    });
    expect(JSON.parse(window.localStorage.getItem(VENDOR_META_STORAGE_KEY) || '{}')).toMatchObject({
      savedAtISO: '2026-05-06T16:00:00.000Z',
      vendors: normalized,
    });
  });

  it('migrates legacy vendor metadata and clears stale or malformed payloads', () => {
    window.localStorage.setItem(VENDOR_META_STORAGE_KEY, JSON.stringify({
      'vendor-1': { lastContacted: '2026-05-01T12:00:00.000Z' },
      bad: { nextFollowUp: 'nope' },
    }));
    expect(readVendorMetaStorage()).toEqual({
      'vendor-1': { lastContacted: '2026-05-01T12:00:00.000Z' },
    });
    expect(JSON.parse(window.localStorage.getItem(VENDOR_META_STORAGE_KEY) || '{}')).toHaveProperty('savedAtISO');

    window.localStorage.setItem(VENDOR_META_STORAGE_KEY, JSON.stringify({
      savedAtISO: '2025-01-01T00:00:00.000Z',
      vendors: { 'vendor-1': { nextFollowUp: '2026-05-12' } },
    }));
    expect(readVendorMetaStorage()).toEqual({});
    expect(window.localStorage.getItem(VENDOR_META_STORAGE_KEY)).toBeNull();

    window.localStorage.setItem(VENDOR_META_STORAGE_KEY, '{broken');
    expect(readVendorMetaStorage()).toEqual({});
    expect(window.localStorage.getItem(VENDOR_META_STORAGE_KEY)).toBeNull();
  });

  it('caps retained rows and vendor id length', () => {
    const rows = Object.fromEntries(Array.from({ length: 220 }, (_, index) => [
      `vendor-${index}-${'x'.repeat(140)}`,
      { nextFollowUp: '2026-05-12' },
    ]));

    const normalized = normalizeVendorMeta(rows);
    expect(Object.keys(normalized)).toHaveLength(200);
    expect(Object.keys(normalized)[0]).toHaveLength(120);
  });
});
