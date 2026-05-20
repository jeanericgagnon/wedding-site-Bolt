import { beforeEach, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { writeSignupReturnPath, readSignupReturnPath } from './signupContinuation';
import { clearOnboardingEntryReturnPath } from './onboardingEntryCleanup';

describe('quickStart entry cleanup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('can clear stale signup return state once quick start has started', () => {
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1');
    clearOnboardingEntryReturnPath();
    expect(readSignupReturnPath()).toBeNull();
  });

  it('can clear stale scoped signup return state once quick start has started too', () => {
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1', 'alex@example.com');
    clearOnboardingEntryReturnPath('alex@example.com');
    expect(readSignupReturnPath('alex@example.com')).toBeNull();
  });

  it('keeps the scoped cleanup path visible in quick start source', async () => {
    const source = await readFile('/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/pages/onboarding/QuickStart.tsx', 'utf8');
    expect(source).toContain('clearOnboardingEntryReturnPath(quickStartStorageScope)');
    expect(source).toContain("writeSignupReturnPath(buildQuickStartEntryPath(), quickStartStorageScope)");
  });
});
