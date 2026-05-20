import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RSVP_CONTINUITY_RETENTION_MS,
  buildRsvpContinuityEnvelope,
  isFreshRsvpContinuityStorageValue,
  readRsvpContinuityUpdatedAt,
  writeRsvpContinuityStoragePing,
} from './rsvpContinuityStorage';
import { RSVP_CONTINUITY_STORAGE_KEY, buildRsvpContinuityStorageKey } from './rsvpTypes';

describe('rsvpContinuityStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T16:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes timestamped RSVP continuity envelopes', () => {
    expect(writeRsvpContinuityStoragePing(RSVP_CONTINUITY_STORAGE_KEY)).toBe('2026-05-06T16:00:00.000Z');

    expect(JSON.parse(window.localStorage.getItem(RSVP_CONTINUITY_STORAGE_KEY) || '{}')).toEqual({
      savedAtISO: '2026-05-06T16:00:00.000Z',
      updatedAt: '2026-05-06T16:00:00.000Z',
    });
  });

  it('builds site-scoped RSVP continuity storage keys', () => {
    expect(buildRsvpContinuityStorageKey('alex-jordan')).toBe('dayof.rsvp.updatedAt:alex-jordan');
    expect(buildRsvpContinuityStorageKey('  MAYA-NOAH  ')).toBe('dayof.rsvp.updatedAt:maya-noah');
    expect(buildRsvpContinuityStorageKey('')).toBe(RSVP_CONTINUITY_STORAGE_KEY);
    expect(buildRsvpContinuityStorageKey(null)).toBe(RSVP_CONTINUITY_STORAGE_KEY);
  });

  it('accepts active legacy and envelope continuity values', () => {
    expect(readRsvpContinuityUpdatedAt('1778083200000')).toBe('2026-05-06T16:00:00.000Z');
    expect(readRsvpContinuityUpdatedAt('2026-05-06T15:59:00.000Z')).toBe('2026-05-06T15:59:00.000Z');
    expect(readRsvpContinuityUpdatedAt(JSON.stringify(buildRsvpContinuityEnvelope('2026-05-06T15:58:00.000Z')))).toBe('2026-05-06T15:58:00.000Z');
  });

  it('rejects malformed, stale, or future continuity values', () => {
    const stale = new Date(Date.now() - RSVP_CONTINUITY_RETENTION_MS - 1).toISOString();
    const future = new Date(Date.now() + 1000).toISOString();

    expect(isFreshRsvpContinuityStorageValue('{broken')).toBe(false);
    expect(isFreshRsvpContinuityStorageValue(JSON.stringify(buildRsvpContinuityEnvelope(stale)))).toBe(false);
    expect(isFreshRsvpContinuityStorageValue(JSON.stringify(buildRsvpContinuityEnvelope(future)))).toBe(false);
  });
});
