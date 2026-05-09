import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readBuilderCoachmarkSeen, writeBuilderCoachmarkSeen } from './builderCoachmarkStorage';

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
    writeBuilderCoachmarkSeen(key);

    expect(JSON.parse(window.localStorage.getItem(key) || '{}')).toMatchObject({
      savedAtISO: '2026-05-06T12:00:00.000Z',
      seen: true,
    });
    expect(readBuilderCoachmarkSeen(key)).toBe(true);
  });

  it('migrates legacy flags and clears stale or malformed values', () => {
    const key = 'builder-coachmark-test';
    window.localStorage.setItem(key, '1');
    expect(readBuilderCoachmarkSeen(key)).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(key) || '{}')).toHaveProperty('savedAtISO');

    window.localStorage.setItem(key, JSON.stringify({
      savedAtISO: '2025-01-01T00:00:00.000Z',
      seen: true,
    }));
    expect(readBuilderCoachmarkSeen(key)).toBe(false);
    expect(window.localStorage.getItem(key)).toBeNull();

    window.localStorage.setItem(key, '{broken');
    expect(readBuilderCoachmarkSeen(key)).toBe(false);
    expect(window.localStorage.getItem(key)).toBeNull();
  });
});
