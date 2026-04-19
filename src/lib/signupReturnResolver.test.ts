import { beforeEach, describe, expect, it } from 'vitest';
import { writeSignupReturnPath } from './signupContinuation';
import { resolveSignupReturnPath } from './signupReturnResolver';

describe('signupReturnResolver', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('prefers an explicit navigation-state return path over stored fallback state', () => {
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1');

    expect(resolveSignupReturnPath('/onboarding/quick-start?bypassPayment=1&step=followups', '/onboarding?signup=1')).toBe(
      '/onboarding/quick-start?bypassPayment=1&step=followups',
    );
  });

  it('falls back to saved signup return path when no explicit path is provided', () => {
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1');

    expect(resolveSignupReturnPath('', '/onboarding?signup=1')).toBe('/onboarding/quick-start?bypassPayment=1');
  });

  it('uses the generic fallback when nothing else exists', () => {
    expect(resolveSignupReturnPath(null, '/onboarding?signup=1')).toBe('/onboarding?signup=1');
  });
});
