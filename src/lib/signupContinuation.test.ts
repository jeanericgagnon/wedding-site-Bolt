import { beforeEach, describe, expect, it, vi } from 'vitest';
import { consumeSignupReturnPath, readSignupReturnPath, resolvePostSignupPath, writeSignupReturnPath } from './signupContinuation';
import { buildQuickStartEntryPath } from './quickStartContinuation';

describe('signupContinuation', () => {
  beforeEach(() => {
    window.localStorage.clear();
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
});
