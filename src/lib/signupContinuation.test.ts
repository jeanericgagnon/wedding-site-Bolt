import { beforeEach, describe, expect, it } from 'vitest';
import { consumeSignupReturnPath, readSignupReturnPath, resolvePostSignupPath, writeSignupReturnPath } from './signupContinuation';

describe('signupContinuation', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores and resolves an explicit post-signup return path', () => {
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1');

    expect(readSignupReturnPath()).toBe('/onboarding/quick-start?bypassPayment=1');
    expect(resolvePostSignupPath('/onboarding?signup=1')).toBe('/onboarding/quick-start?bypassPayment=1');
  });

  it('consumes the saved return path exactly once', () => {
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1');

    expect(consumeSignupReturnPath()).toBe('/onboarding/quick-start?bypassPayment=1');
    expect(readSignupReturnPath()).toBeNull();
    expect(resolvePostSignupPath('/onboarding?signup=1')).toBe('/onboarding?signup=1');
  });

  it('clears the marker when asked to write an empty value', () => {
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1');
    writeSignupReturnPath('');

    expect(readSignupReturnPath()).toBeNull();
  });
});
