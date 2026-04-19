import { beforeEach, describe, expect, it } from 'vitest';
import { writeSignupReturnPath } from './signupContinuation';
import { resolveSignupReturnPath } from './signupReturnResolver';
import { buildQuickStartEntryPath } from './quickStartContinuation';

describe('signupReturnResolver', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('prefers an explicit navigation-state return path over stored fallback state', () => {
    writeSignupReturnPath(buildQuickStartEntryPath());

    expect(resolveSignupReturnPath(`${buildQuickStartEntryPath()}&step=followups`, '/onboarding?signup=1')).toBe(
      `${buildQuickStartEntryPath()}&step=followups`,
    );
  });

  it('falls back to saved signup return path when no explicit path is provided', () => {
    writeSignupReturnPath(buildQuickStartEntryPath());

    expect(resolveSignupReturnPath('', '/onboarding?signup=1')).toBe(buildQuickStartEntryPath());
  });

  it('uses the generic fallback when nothing else exists', () => {
    expect(resolveSignupReturnPath(null, '/onboarding?signup=1')).toBe('/onboarding?signup=1');
  });
});
