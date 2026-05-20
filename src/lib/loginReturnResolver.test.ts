import { beforeEach, describe, expect, it } from 'vitest';
import { writeSignupReturnPath } from './signupContinuation';
import { resolveLoginReturnPath } from './loginReturnResolver';

describe('loginReturnResolver', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('prefers saved onboarding continuation over the generic login fallback', () => {
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1');
    expect(resolveLoginReturnPath('/dashboard/overview')).toBe('/onboarding/quick-start?bypassPayment=1');
  });

  it('prefers scoped onboarding continuation over the generic login fallback', () => {
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1', 'alex@example.com');
    expect(resolveLoginReturnPath('/dashboard/overview', 'alex@example.com')).toBe('/onboarding/quick-start?bypassPayment=1');
  });

  it('uses the generic fallback when no saved continuation exists', () => {
    expect(resolveLoginReturnPath('/dashboard/overview')).toBe('/dashboard/overview');
  });
});
