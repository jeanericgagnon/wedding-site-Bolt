import { describe, expect, it } from 'vitest';
import { buildGuidedSetupHydrationErrorMessage, buildGuidedSetupSaveErrorMessage } from './guidedSetupErrorCopy';

describe('guidedSetupErrorCopy', () => {
  it('makes save-failure continuity explicit', () => {
    expect(buildGuidedSetupSaveErrorMessage('Network down')).toBe(
      'Network down Your progress is still saved on this device, so you can keep going or retry.',
    );
  });

  it('keeps hydration failure soft and recoverable', () => {
    expect(buildGuidedSetupHydrationErrorMessage('Lookup failed')).toBe(
      'Lookup failed You can keep going and save manually.',
    );
  });
});
