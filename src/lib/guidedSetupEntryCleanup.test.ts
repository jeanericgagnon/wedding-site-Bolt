import { beforeEach, describe, expect, it } from 'vitest';
import { writeSignupReturnPath, readSignupReturnPath } from './signupContinuation';

describe('guidedSetup entry cleanup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('can clear stale signup return state once guided setup has started', () => {
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1');
    writeSignupReturnPath(null);
    expect(readSignupReturnPath()).toBeNull();
  });
});
