import { beforeEach, describe, expect, it } from 'vitest';

describe('onboarding resume hint cleanup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('clears both resume hint keys after a first-incomplete resume handoff', () => {
    window.localStorage.setItem('dayoflove:onboarding-resume-hint', 'first-incomplete');
    window.localStorage.setItem('dayoflove:onboarding-resume-index', '9');

    window.localStorage.removeItem('dayoflove:onboarding-resume-hint');
    window.localStorage.removeItem('dayoflove:onboarding-resume-index');

    expect(window.localStorage.getItem('dayoflove:onboarding-resume-hint')).toBeNull();
    expect(window.localStorage.getItem('dayoflove:onboarding-resume-index')).toBeNull();
  });
});
