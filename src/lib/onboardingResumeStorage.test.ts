import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearOnboardingResumeStorage, ONBOARDING_RESUME_HINT_STORAGE_KEY, ONBOARDING_RESUME_INDEX_STORAGE_KEY, readOnboardingResumeState, writeOnboardingResumeHint, writeOnboardingResumeTarget } from './onboardingResumeStorage';

describe('onboardingResumeStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('clears both onboarding resume storage keys together', () => {
    window.localStorage.setItem(ONBOARDING_RESUME_HINT_STORAGE_KEY, 'first-incomplete');
    window.localStorage.setItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY, '9');

    clearOnboardingResumeStorage();

    expect(window.localStorage.getItem(ONBOARDING_RESUME_HINT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY)).toBeNull();
  });

  it('trims onboarding resume hints before writing them', () => {
    writeOnboardingResumeHint('  first-incomplete  ');

    expect(window.localStorage.getItem(ONBOARDING_RESUME_HINT_STORAGE_KEY)).toBe('first-incomplete');
  });

  it('skips redundant onboarding resume hint writes when the value is unchanged', () => {
    window.localStorage.setItem(ONBOARDING_RESUME_HINT_STORAGE_KEY, 'first-incomplete');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    writeOnboardingResumeHint('first-incomplete');

    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it('clears onboarding resume hints when blank values are written', () => {
    window.localStorage.setItem(ONBOARDING_RESUME_HINT_STORAGE_KEY, 'first-incomplete');

    writeOnboardingResumeHint('   ');

    expect(window.localStorage.getItem(ONBOARDING_RESUME_HINT_STORAGE_KEY)).toBeNull();
  });


  it('trims and sanitizes onboarding resume state on read', () => {
    window.localStorage.setItem(ONBOARDING_RESUME_HINT_STORAGE_KEY, '  question  ');
    window.localStorage.setItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY, ' 9 ');

    expect(readOnboardingResumeState()).toEqual({ hint: 'question', index: 9 });
    expect(window.localStorage.getItem(ONBOARDING_RESUME_HINT_STORAGE_KEY)).toBe('question');
    expect(window.localStorage.getItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY)).toBe('9');
  });

  it('drops invalid onboarding resume indexes on read', () => {
    window.localStorage.setItem(ONBOARDING_RESUME_HINT_STORAGE_KEY, 'question');
    window.localStorage.setItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY, '9.5');

    expect(readOnboardingResumeState()).toEqual({ hint: 'question', index: null });
    expect(window.localStorage.getItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY)).toBeNull();
  });


  it('clears stale onboarding resume indexes when writing a resume target hint', () => {
    window.localStorage.setItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY, '9');

    writeOnboardingResumeTarget('first-incomplete');

    expect(window.localStorage.getItem(ONBOARDING_RESUME_HINT_STORAGE_KEY)).toBe('first-incomplete');
    expect(window.localStorage.getItem(ONBOARDING_RESUME_INDEX_STORAGE_KEY)).toBeNull();
  });

});
