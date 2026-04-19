import { beforeEach, describe, expect, it } from 'vitest';
import { writeSignupReturnPath, readSignupReturnPath } from './signupContinuation';

describe('weddingStatus entry cleanup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('can clear stale signup return state once wedding status onboarding has started', () => {
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1');
    writeSignupReturnPath(null);
    expect(readSignupReturnPath()).toBeNull();
  });
});
