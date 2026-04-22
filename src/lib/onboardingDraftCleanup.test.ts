import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAllOnboardingDraftStorage, ONBOARDING_DRAFT_STORAGE_KEY } from './onboardingDraftCleanup';
import { GUIDED_SETUP_STORAGE_KEY } from './guidedSetupPersistence';
import { QUICK_START_STORAGE_KEY } from './quickStartStateTransfer';

describe('onboardingDraftCleanup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('clears generic onboarding, quick start, and guided setup draft storage together', () => {
    window.localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, '1');
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, '1');
    window.localStorage.setItem(GUIDED_SETUP_STORAGE_KEY, '1');

    clearAllOnboardingDraftStorage();

    expect(window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(GUIDED_SETUP_STORAGE_KEY)).toBeNull();
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
    removeItemSpy.mockRestore();
  });

});
