import { describe, expect, it } from 'vitest';

import {
  isLocalInternalToolingHost,
  shouldAllowInternalToolingRoutes,
} from './internalToolingRouteAccess';

describe('internalToolingRouteAccess', () => {
  it('recognizes local hosts for internal tooling routes', () => {
    expect(isLocalInternalToolingHost('localhost')).toBe(true);
    expect(isLocalInternalToolingHost('127.0.0.1')).toBe(true);
    expect(isLocalInternalToolingHost('preview.local')).toBe(true);
    expect(isLocalInternalToolingHost('dayof.love')).toBe(false);
  });

  it('allows internal tooling routes for local hosts even when the env flag is off', () => {
    expect(shouldAllowInternalToolingRoutes({
      enabledFlag: false,
      hostname: 'localhost',
    })).toBe(true);
  });

  it('allows internal tooling routes on any host when the env flag is on', () => {
    expect(shouldAllowInternalToolingRoutes({
      enabledFlag: true,
      hostname: 'dayof.love',
    })).toBe(true);
  });

  it('denies internal tooling routes on non-local hosts when the env flag is off', () => {
    expect(shouldAllowInternalToolingRoutes({
      enabledFlag: false,
      hostname: 'app.dayof.love',
    })).toBe(false);
  });
});
