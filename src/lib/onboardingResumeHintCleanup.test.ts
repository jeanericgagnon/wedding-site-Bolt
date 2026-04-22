import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearOnboardingResumeStorage,
  ONBOARDING_RESUME_HINT_STORAGE_KEY,
  ONBOARDING_RESUME_INDEX_STORAGE_KEY,
} from './onboardingResumeStorage';

describe('onboarding resume hint cleanup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('clears both resume hint keys after a first-incomplete resume handoff', () => {
    window.localStorage.setItem(ONBOARDING_RESUME_HINT_STORAGE_KEY, 'first-incomplete');
    window.localStorage.setItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY, '9');

    clearOnboardingResumeStorage();

    expect(window.localStorage.getItem(ONBOARDING_RESUME_HINT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY)).toBeNull();
  });

  it('skips redundant onboarding resume cleanup deletes when storage is already clear', () => {
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

    clearOnboardingResumeStorage();

    expect(removeItemSpy).not.toHaveBeenCalled();
    removeItemSpy.mockRestore();
  });

  it('keeps clearing other onboarding resume keys when one cleanup call fails', () => {
    window.localStorage.setItem(ONBOARDING_RESUME_HINT_STORAGE_KEY, 'first-incomplete');
    window.localStorage.setItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY, '9');

    const originalRemoveItem = Storage.prototype.removeItem;
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, key: string) {
      if (key === ONBOARDING_RESUME_HINT_STORAGE_KEY) {
        throw new Error('blocked');
      }
      return originalRemoveItem.call(this, key);
    });

    clearOnboardingResumeStorage();

    expect(window.localStorage.getItem(ONBOARDING_RESUME_HINT_STORAGE_KEY)).toBe('first-incomplete');
    expect(window.localStorage.getItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY)).toBeNull();
    removeItemSpy.mockRestore();
  });
});
