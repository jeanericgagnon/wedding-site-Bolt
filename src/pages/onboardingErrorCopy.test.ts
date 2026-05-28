import { describe, expect, it } from 'vitest';

import {
  mapOnboardingError,
  ONBOARDING_CREATE_SITE_RETRY_ERROR,
  ONBOARDING_UPDATE_RETRY_ERROR,
} from './onboardingErrorCopy';

describe('onboardingErrorCopy', () => {
  it('masks provider and backend failures behind calm starter-draft copy', () => {
    expect(mapOnboardingError(new Error('Supabase relation wedding_sites does not exist'), ONBOARDING_UPDATE_RETRY_ERROR))
      .toBe(ONBOARDING_UPDATE_RETRY_ERROR);
    expect(mapOnboardingError(new Error('functions/v1/create-site jwt expired'), ONBOARDING_CREATE_SITE_RETRY_ERROR))
      .toBe(ONBOARDING_CREATE_SITE_RETRY_ERROR);
  });

  it('falls back cleanly when the error is empty', () => {
    expect(mapOnboardingError(new Error('   '), ONBOARDING_UPDATE_RETRY_ERROR)).toBe(ONBOARDING_UPDATE_RETRY_ERROR);
    expect(mapOnboardingError(null, ONBOARDING_CREATE_SITE_RETRY_ERROR)).toBe(ONBOARDING_CREATE_SITE_RETRY_ERROR);
  });
});
