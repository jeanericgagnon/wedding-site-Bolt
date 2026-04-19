import { beforeEach, describe, expect, it } from 'vitest';
import { writeSignupReturnPath, readSignupReturnPath } from './signupContinuation';

describe('onboarding entry cleanup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('can clear stale signup return state once generic onboarding has started', () => {
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1');
    writeSignupReturnPath(null);
    expect(readSignupReturnPath()).toBeNull();
  });
});
