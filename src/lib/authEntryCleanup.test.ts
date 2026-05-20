import { beforeEach, describe, expect, it } from 'vitest';
import { writeSignupReturnPath, readSignupReturnPath } from './signupContinuation';
import { clearAuthEntryReturnPath } from './authEntryCleanup';

describe('auth entry cleanup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('can clear stale signup return state when auth is opened without an onboarding handoff', () => {
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1');
    clearAuthEntryReturnPath();
    expect(readSignupReturnPath()).toBeNull();
  });

  it('can clear stale scoped signup return state too', () => {
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1', 'alex@example.com');
    clearAuthEntryReturnPath('alex@example.com');
    expect(readSignupReturnPath('alex@example.com')).toBeNull();
  });
});
