import { beforeEach, describe, expect, it } from 'vitest';
import { consumeSignupReturnPath, writeSignupReturnPath } from './signupContinuation';
import { buildQuickStartEntryPath } from './quickStartContinuation';

describe('signupContinuation cleanup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('allows payment/auth transitions to clear a stale saved path before generic onboarding resumes', () => {
    writeSignupReturnPath(buildQuickStartEntryPath());
    expect(consumeSignupReturnPath()).toBe(buildQuickStartEntryPath());
    expect(consumeSignupReturnPath()).toBeNull();
  });
});
