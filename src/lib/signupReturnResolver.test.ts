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

  it('falls back to scoped signup return path when no explicit path is provided', () => {
    writeSignupReturnPath(buildQuickStartEntryPath(), 'alex@example.com');

    expect(resolveSignupReturnPath('', '/onboarding?signup=1', 'alex@example.com')).toBe(buildQuickStartEntryPath());
  });

  it('uses the generic fallback when nothing else exists', () => {
    expect(resolveSignupReturnPath(null, '/onboarding?signup=1')).toBe('/onboarding?signup=1');
  });

  it('ignores external explicit return paths and keeps onboarding fallback continuity', () => {
    writeSignupReturnPath(buildQuickStartEntryPath());

    expect(resolveSignupReturnPath('https://evil.example/steal', '/onboarding?signup=1')).toBe(buildQuickStartEntryPath());
  });

  it('ignores protocol-relative stored return paths and uses the onboarding fallback', () => {
    writeSignupReturnPath('//evil.example/steal');

    expect(resolveSignupReturnPath(null, '/onboarding?signup=1')).toBe('/onboarding?signup=1');
  });
});
