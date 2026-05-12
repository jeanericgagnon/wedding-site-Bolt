import { describe, expect, it } from 'vitest';

import { isInternalToolingRouteEnabled } from './internalToolingRoutes';

describe('internal tooling route gating', () => {
  it('keeps internal tooling routes enabled in local development', () => {
    expect(isInternalToolingRouteEnabled(undefined, true)).toBe(true);
  });

  it('requires an explicit production flag outside local development', () => {
    expect(isInternalToolingRouteEnabled('true', false)).toBe(true);
    expect(isInternalToolingRouteEnabled('1', false)).toBe(true);
    expect(isInternalToolingRouteEnabled('yes', false)).toBe(true);
    expect(isInternalToolingRouteEnabled('false', false)).toBe(false);
    expect(isInternalToolingRouteEnabled(undefined, false)).toBe(false);
    expect(isInternalToolingRouteEnabled('', false)).toBe(false);
  });
});
