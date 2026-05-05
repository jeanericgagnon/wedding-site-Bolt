import { describe, expect, it } from 'vitest';
import { resolveDemoModeAllowed } from './env';

describe('environment safety', () => {
  it('does not allow demo mode in production builds even if the env flag is set', () => {
    expect(resolveDemoModeAllowed('true', true)).toBe(false);
    expect(resolveDemoModeAllowed('1', true)).toBe(false);
    expect(resolveDemoModeAllowed('yes', true)).toBe(false);
  });

  it('keeps demo mode opt-in available for local and preview proof builds', () => {
    expect(resolveDemoModeAllowed('true', false)).toBe(true);
    expect(resolveDemoModeAllowed('1', false)).toBe(true);
    expect(resolveDemoModeAllowed('yes', false)).toBe(true);
    expect(resolveDemoModeAllowed('false', false)).toBe(false);
    expect(resolveDemoModeAllowed(undefined, false)).toBe(false);
  });
});
