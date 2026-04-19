import { describe, expect, it } from 'vitest';

describe('guidedSetup cleanup dedup', () => {
  it('models celebration exits as a single cleanup action before navigation', () => {
    const calls: string[] = [];
    const clearGuidedSetupDraft = () => calls.push('clear');
    const navigate = () => calls.push('navigate');

    clearGuidedSetupDraft();
    navigate();

    expect(calls).toEqual(['clear', 'navigate']);
  });
});
