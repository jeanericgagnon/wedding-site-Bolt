import { beforeEach, describe, expect, it } from 'vitest';
import { consumeSignupReturnPath, writeSignupReturnPath } from './signupContinuation';

describe('signupContinuation cleanup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('allows payment/auth transitions to clear a stale saved path before generic onboarding resumes', () => {
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1');
    expect(consumeSignupReturnPath()).toBe('/onboarding/quick-start?bypassPayment=1');
    expect(consumeSignupReturnPath()).toBeNull();
  });
});
