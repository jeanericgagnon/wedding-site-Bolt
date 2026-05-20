import { beforeEach, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { writeSignupReturnPath, readSignupReturnPath } from './signupContinuation';
import { clearOnboardingEntryReturnPath } from './onboardingEntryCleanup';

describe('guidedSetup entry cleanup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('can clear stale signup return state once guided setup has started', () => {
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1');
    clearOnboardingEntryReturnPath();
    expect(readSignupReturnPath()).toBeNull();
  });

  it('keeps the scoped cleanup path visible in guided setup source', async () => {
    const source = await readFile('/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/pages/onboarding/GuidedSetup.tsx', 'utf8');
    expect(source).toContain('clearOnboardingEntryReturnPath(guidedSetupStorageScope)');
  });
});
