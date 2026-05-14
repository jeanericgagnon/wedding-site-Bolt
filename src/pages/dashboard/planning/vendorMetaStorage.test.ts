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
        reminderChannel: 'email',
        reminderLeadDays: 3,
        reminderLastQueuedAt: '2026-05-05T09:30:00.000Z',
        contractFiles: [
          { id: 'contract-1', kind: 'contract', label: 'Signed contract', url: 'https://docs.example.com/contract' },
          { id: 'empty', kind: 'invoice', label: '', url: '' },
        ],
        paymentMilestones: [
          { id: 'm1', label: 'Final balance', amount: 2400, dueDate: '2026-06-02T08:00:00.000Z', status: 'scheduled' },
        ],
      },
      empty: {},
      bad: { lastContacted: 'not-a-date', nextFollowUp: 'also-bad', reminderChannel: 'fax', reminderLeadDays: 99 } as unknown as {
        lastContacted: string;
        nextFollowUp: string;
        reminderChannel: 'none';
        reminderLeadDays: 1;
      },
    } as any);

    expect(normalized).toEqual({
      'vendor-1': {
        lastContacted: '2026-05-01T12:00:00.000Z',
        nextFollowUp: '2026-05-12',
        reminderChannel: 'email',
        reminderLeadDays: 3,
        reminderLastQueuedAt: '2026-05-05T09:30:00.000Z',
        contractFiles: [
          { id: 'contract-1', kind: 'contract', label: 'Signed contract', url: 'https://docs.example.com/contract' },
        ],
        paymentMilestones: [
          { id: 'm1', label: 'Final balance', amount: 2400, dueDate: '2026-06-02', status: 'scheduled' },
        ],
      },
    });
    expect(JSON.parse(window.localStorage.getItem(VENDOR_META_STORAGE_KEY) || '{}')).toMatchObject({
      savedAtISO: '2026-05-06T16:00:00.000Z',
      vendors: normalized,
    });
  });

  it('migrates legacy vendor metadata and clears stale or malformed payloads', () => {
    window.localStorage.setItem(VENDOR_META_STORAGE_KEY, JSON.stringify({
      'vendor-1': { lastContacted: '2026-05-01T12:00:00.000Z', reminderChannel: 'phone', reminderLeadDays: 7 },
      bad: { nextFollowUp: 'nope' },
    }));
    expect(readVendorMetaStorage()).toEqual({
      'vendor-1': { lastContacted: '2026-05-01T12:00:00.000Z', reminderChannel: 'phone', reminderLeadDays: 7 },
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
