import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildBuilderCoachmarkStorageKey, readBuilderCoachmarkSeen, writeBuilderCoachmarkSeen } from './builderCoachmarkStorage';

describe('builderCoachmarkStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores coachmark state as a timestamped envelope', () => {
    const key = 'builder-coachmark-test';
    writeBuilderCoachmarkSeen(key, true, 'user-a');

    expect(JSON.parse(window.localStorage.getItem(buildBuilderCoachmarkStorageKey(key, 'user-a')) || '{}')).toMatchObject({
      savedAtISO: '2026-05-06T12:00:00.000Z',
      seen: true,
    });
    expect(window.localStorage.getItem(key)).toBeNull();
    expect(readBuilderCoachmarkSeen(key, 'user-a')).toBe(true);
  });

  it('migrates legacy flags and clears stale or malformed values', () => {
    const key = 'builder-coachmark-test';
    window.localStorage.setItem(key, '1');
    expect(readBuilderCoachmarkSeen(key, 'user-a')).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(buildBuilderCoachmarkStorageKey(key, 'user-a')) || '{}')).toHaveProperty('savedAtISO');
    expect(window.localStorage.getItem(key)).toBeNull();

    window.localStorage.setItem(buildBuilderCoachmarkStorageKey(key, 'user-a'), JSON.stringify({
      savedAtISO: '2025-01-01T00:00:00.000Z',
      seen: true,
    }));
    expect(readBuilderCoachmarkSeen(key, 'user-a')).toBe(false);
    expect(window.localStorage.getItem(buildBuilderCoachmarkStorageKey(key, 'user-a'))).toBeNull();

    window.localStorage.setItem(buildBuilderCoachmarkStorageKey(key, 'user-a'), '{broken');
    expect(readBuilderCoachmarkSeen(key, 'user-a')).toBe(false);
    expect(window.localStorage.getItem(buildBuilderCoachmarkStorageKey(key, 'user-a'))).toBeNull();
  });
});
