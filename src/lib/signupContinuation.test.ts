import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSignupReturnPath, consumeSignupReturnPath, readSignupReturnPath, resolvePostSignupPath, writeSignupReturnPath } from './signupContinuation';
import { buildQuickStartEntryPath } from './quickStartContinuation';

describe('signupContinuation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T16:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and resolves an explicit post-signup return path', () => {
    writeSignupReturnPath(buildQuickStartEntryPath());

    expect(readSignupReturnPath()).toBe(buildQuickStartEntryPath());
    expect(resolvePostSignupPath('/onboarding?signup=1')).toBe(buildQuickStartEntryPath());
  });

  it('consumes the saved return path exactly once', () => {
    writeSignupReturnPath(buildQuickStartEntryPath());

    expect(consumeSignupReturnPath()).toBe(buildQuickStartEntryPath());
    expect(readSignupReturnPath()).toBeNull();
    expect(resolvePostSignupPath('/onboarding?signup=1')).toBe('/onboarding?signup=1');
  });

  it('clears the marker when asked to write an empty value', () => {
    writeSignupReturnPath(buildQuickStartEntryPath());
    writeSignupReturnPath('');

    expect(readSignupReturnPath()).toBeNull();
  });


  it('skips redundant signup return path writes when the marker is already normalized', () => {
    writeSignupReturnPath(buildQuickStartEntryPath());
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    writeSignupReturnPath(buildQuickStartEntryPath());

    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it('skips redundant signup return path deletes when the marker is already clear', () => {
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

    writeSignupReturnPath('');
    consumeSignupReturnPath();

    expect(removeItemSpy).not.toHaveBeenCalled();
    removeItemSpy.mockRestore();
  });

  it('rejects unsafe fallback paths when resolving post-signup continuation', () => {
    expect(resolvePostSignupPath('https://evil.example/steal')).toBe('/');
  });


  it('clears unsafe stored signup return paths when reading continuation state', () => {
    window.localStorage.setItem('dayoflove:signup-return-path', 'https://evil.example/steal');

    expect(readSignupReturnPath()).toBeNull();
    expect(window.localStorage.getItem('dayoflove:signup-return-path')).toBeNull();
  });

  it('rewrites trimmed signup return paths back to storage on read', () => {
    window.localStorage.setItem('dayoflove:signup-return-path', '  /onboarding/quick-start  ');

    expect(readSignupReturnPath()).toBe('/onboarding/quick-start');
    expect(JSON.parse(window.localStorage.getItem('dayoflove:signup-return-path') || '{}')).toMatchObject({
      savedAtISO: '2026-05-06T16:00:00.000Z',
      path: '/onboarding/quick-start',
    });
  });

  it('expires stale signup return path envelopes', () => {
    window.localStorage.setItem('dayoflove:signup-return-path', JSON.stringify({
      savedAtISO: '2026-04-01T10:00:00.000Z',
      path: '/onboarding/quick-start',
    }));

    expect(readSignupReturnPath()).toBeNull();
    expect(window.localStorage.getItem('dayoflove:signup-return-path')).toBeNull();
  });

  it('skips redundant signup return path cleanup deletes when storage is already clear', () => {
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

    clearSignupReturnPath();

    expect(removeItemSpy).not.toHaveBeenCalled();
    removeItemSpy.mockRestore();
  });

  it('tolerates signup return path cleanup failures', () => {
    writeSignupReturnPath(buildQuickStartEntryPath());
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => clearSignupReturnPath()).not.toThrow();
    removeItemSpy.mockRestore();
  });

});
