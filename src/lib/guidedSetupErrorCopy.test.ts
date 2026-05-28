import { describe, expect, it } from 'vitest';
import {
  buildGuidedSetupHydrationErrorMessage,
  buildGuidedSetupSaveErrorMessage,
  GUIDED_SETUP_HYDRATION_RETRY_ERROR,
  GUIDED_SETUP_SAVE_RETRY_ERROR,
} from './guidedSetupErrorCopy';

describe('guidedSetupErrorCopy', () => {
  it('masks internal save errors behind starter-draft retry copy', () => {
    expect(
      buildGuidedSetupSaveErrorMessage(new Error('Supabase relation wedding_sites does not exist')),
    ).toBe(
      `${GUIDED_SETUP_SAVE_RETRY_ERROR} Your progress is still saved on this device, so you can keep going or retry.`,
    );
  });

  it('masks internal hydration errors behind preload retry copy', () => {
    expect(
      buildGuidedSetupHydrationErrorMessage(new Error('OAuth session token expired during fetch')),
    ).toBe(
      `${GUIDED_SETUP_HYDRATION_RETRY_ERROR} You can keep going and save manually.`,
    );
  });

  it('keeps calm fallback copy when the error is empty', () => {
    expect(buildGuidedSetupSaveErrorMessage('')).toBe(
      `${GUIDED_SETUP_SAVE_RETRY_ERROR} Your progress is still saved on this device, so you can keep going or retry.`,
    );
  });
});
