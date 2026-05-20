import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildOnboardingDraftStorageKey, clearAllOnboardingDraftStorage, clearOnboardingDraftSnapshot, ONBOARDING_DRAFT_STORAGE_KEY } from './onboardingDraftCleanup';
import { readSignupReturnPath, writeSignupReturnPath } from './signupContinuation';
import { buildGuidedSetupDraftStorageKey, GUIDED_SETUP_STORAGE_KEY } from './guidedSetupPersistence';
import { buildQuickStartDraftStorageKey, QUICK_START_STORAGE_KEY } from './quickStartStateTransfer';

describe('onboardingDraftCleanup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('clears generic onboarding, quick start, guided setup, and signup return storage together', () => {
    window.localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, '1');
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, '1');
    window.localStorage.setItem(GUIDED_SETUP_STORAGE_KEY, '1');
    writeSignupReturnPath('/onboarding/quick-start');

    clearAllOnboardingDraftStorage();

    expect(window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(GUIDED_SETUP_STORAGE_KEY)).toBeNull();
    expect(readSignupReturnPath()).toBeNull();
  });

  it('clears scoped onboarding draft keys without leaving legacy siblings behind', () => {
    window.localStorage.setItem(buildOnboardingDraftStorageKey('user-a'), '1');
    window.localStorage.setItem(buildQuickStartDraftStorageKey('user-a'), '1');
    window.localStorage.setItem(buildGuidedSetupDraftStorageKey('user-a'), '1');
    writeSignupReturnPath('/onboarding/quick-start', 'user-a');
    writeSignupReturnPath('/onboarding/quick-start');

    clearAllOnboardingDraftStorage('user-a');

    expect(window.localStorage.getItem(buildOnboardingDraftStorageKey('user-a'))).toBeNull();
    expect(window.localStorage.getItem(buildQuickStartDraftStorageKey('user-a'))).toBeNull();
    expect(window.localStorage.getItem(buildGuidedSetupDraftStorageKey('user-a'))).toBeNull();
    expect(readSignupReturnPath('user-a')).toBeNull();
    expect(readSignupReturnPath()).toBeNull();
  });

  it('skips onboarding draft cleanup deletes when storage is already clear', () => {
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

    clearAllOnboardingDraftStorage();

    expect(removeItemSpy).not.toHaveBeenCalledWith(ONBOARDING_DRAFT_STORAGE_KEY);
    expect(removeItemSpy).not.toHaveBeenCalledWith(QUICK_START_STORAGE_KEY);
    expect(removeItemSpy).not.toHaveBeenCalledWith(GUIDED_SETUP_STORAGE_KEY);
    removeItemSpy.mockRestore();
  });

  it('keeps clearing other onboarding draft keys when one cleanup call fails', () => {
    window.localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, '1');
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, '1');
    window.localStorage.setItem(GUIDED_SETUP_STORAGE_KEY, '1');
    writeSignupReturnPath('/onboarding/quick-start');

    const originalRemoveItem = Storage.prototype.removeItem;
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, key: string) {
      if (key === ONBOARDING_DRAFT_STORAGE_KEY) {
        throw new Error('blocked');
      }
      return originalRemoveItem.call(this, key);
    });

    clearAllOnboardingDraftStorage();

    expect(window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY)).toBe('1');
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(GUIDED_SETUP_STORAGE_KEY)).toBeNull();
    expect(readSignupReturnPath()).toBeNull();
    removeItemSpy.mockRestore();
  });


  it('skips generic onboarding draft cleanup deletes when storage is already clear', () => {
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

    clearOnboardingDraftSnapshot();

    expect(removeItemSpy).not.toHaveBeenCalled();
    removeItemSpy.mockRestore();
  });

  it('tolerates generic onboarding draft cleanup failures', () => {
    window.localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, 'stale');
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => clearOnboardingDraftSnapshot()).not.toThrow();
    removeItemSpy.mockRestore();
  });

  it('tolerates scoped onboarding draft cleanup failures', () => {
    window.localStorage.setItem(buildOnboardingDraftStorageKey('user-a'), 'stale');
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => clearOnboardingDraftSnapshot('user-a')).not.toThrow();
    removeItemSpy.mockRestore();
  });

});
