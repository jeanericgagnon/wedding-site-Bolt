import { describe, expect, it } from 'vitest';
import { buildGuidedSetupHydrationErrorMessage, buildGuidedSetupSaveErrorMessage } from './guidedSetupErrorCopy';

describe('guidedSetupErrorCopy', () => {
  it('makes save-failure continuity explicit', () => {
    expect(buildGuidedSetupSaveErrorMessage('Network down')).toBe(
      'Couldn’t save this step right now. Your progress is still saved on this device, so you can keep going or retry.',
    );
  });

  it('keeps hydration failure soft and recoverable', () => {
    expect(buildGuidedSetupHydrationErrorMessage('Lookup failed')).toBe(
      'Couldn’t preload your wedding details right now. You can keep going and save manually.',
    );
  });

  it('does not surface backend implementation details from guided setup failures', () => {
    expect(buildGuidedSetupSaveErrorMessage('new row violates row-level security policy for table wedding_sites')).toBe(
      'Couldn’t save this step right now. Your progress is still saved on this device, so you can keep going or retry.',
    );
    expect(buildGuidedSetupHydrationErrorMessage(new Error('PostgREST relation wedding_sites column user_id failed'))).toBe(
      'Couldn’t preload your wedding details right now. You can keep going and save manually.',
    );
  });
});
