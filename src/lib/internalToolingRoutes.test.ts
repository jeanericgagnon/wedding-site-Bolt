import { describe, expect, it } from 'vitest';

import { canAccessInternalToolingRoutes, isInternalToolingRouteFlagEnabled } from './internalToolingRoutes';

describe('internal tooling route gating', () => {
  it('keeps the internal tooling flag enabled in local development', () => {
    expect(isInternalToolingRouteFlagEnabled(undefined, true)).toBe(true);
  });

  it('requires an explicit production flag outside local development', () => {
    expect(isInternalToolingRouteFlagEnabled('true', false)).toBe(true);
    expect(isInternalToolingRouteFlagEnabled('1', false)).toBe(true);
    expect(isInternalToolingRouteFlagEnabled('yes', false)).toBe(true);
    expect(isInternalToolingRouteFlagEnabled('false', false)).toBe(false);
    expect(isInternalToolingRouteFlagEnabled(undefined, false)).toBe(false);
    expect(isInternalToolingRouteFlagEnabled('', false)).toBe(false);
  });

  it('still requires admin access even when the env flag is on', () => {
    expect(canAccessInternalToolingRoutes(true, true)).toBe(true);
    expect(canAccessInternalToolingRoutes(true, false)).toBe(false);
    expect(canAccessInternalToolingRoutes(false, true)).toBe(false);
  });
});
