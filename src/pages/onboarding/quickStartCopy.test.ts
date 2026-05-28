import { describe, expect, it } from 'vitest';

import {
  mapQuickStartAiError,
  mapQuickStartSaveError,
  QUICK_START_AI_RETRY_ERROR,
  QUICK_START_SAVE_RETRY_ERROR,
} from './quickStartCopy';

describe('quickStartCopy', () => {
  it('keeps save failures customer-safe instead of leaking internal detail', () => {
    expect(mapQuickStartSaveError(new Error('OpenAI provider timeout with invite_token=abc'))).toBe(
      QUICK_START_SAVE_RETRY_ERROR,
    );
  });

  it('keeps AI-step failures customer-safe instead of leaking provider or storage detail', () => {
    expect(mapQuickStartAiError(new Error('functions/v1/ai-onboarding failed to fetch bucket policy'))).toBe(
      QUICK_START_AI_RETRY_ERROR,
    );
  });
});
