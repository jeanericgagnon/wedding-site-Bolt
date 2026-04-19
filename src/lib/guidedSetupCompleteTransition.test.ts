import { beforeEach, describe, expect, it } from 'vitest';
import { GUIDED_SETUP_STORAGE_KEY } from './guidedSetupPersistence';

describe('guidedSetup complete transition cleanup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('clears saved draft state when the flow advances into the complete step', () => {
    window.localStorage.setItem(GUIDED_SETUP_STORAGE_KEY, JSON.stringify({ currentStep: 'guests' }));
    window.localStorage.removeItem(GUIDED_SETUP_STORAGE_KEY);
    expect(window.localStorage.getItem(GUIDED_SETUP_STORAGE_KEY)).toBeNull();
  });
});
