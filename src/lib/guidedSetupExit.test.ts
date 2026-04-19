import { beforeEach, describe, expect, it } from 'vitest';
import { GUIDED_SETUP_STORAGE_KEY } from './guidedSetupPersistence';

describe('guidedSetup exit cleanup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('clears saved guided setup draft state before leaving the flow', () => {
    window.localStorage.setItem(GUIDED_SETUP_STORAGE_KEY, JSON.stringify({ currentStep: 'travel' }));
    window.localStorage.removeItem(GUIDED_SETUP_STORAGE_KEY);
    expect(window.localStorage.getItem(GUIDED_SETUP_STORAGE_KEY)).toBeNull();
  });
});
