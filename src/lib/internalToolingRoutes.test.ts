import { describe, expect, it } from 'vitest';
import {
  isInternalToolingCaptureRouteFlagEnabled,
  isInternalToolingRouteFlagEnabled,
} from './internalToolingRoutes';

describe('internal tooling route gating', () => {
  it('keeps the full internal tooling flag off on production hosts without the env flag', () => {
    expect(isInternalToolingRouteFlagEnabled('', false)).toBe(false);
  });

  it('still allows static capture routes on production when opened directly', () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: {
          hostname: 'dayof.love',
          pathname: '/variant-preview-capture',
        },
      },
    });

    try {
      expect(isInternalToolingCaptureRouteFlagEnabled('', false)).toBe(true);
    } finally {
      if (originalWindow) {
        Object.defineProperty(globalThis, 'window', {
          configurable: true,
          value: originalWindow,
        });
      } else {
        // @ts-expect-error cleaning up test shim
        delete globalThis.window;
      }
    }
  });

  it('can resolve capture route access from router pathname instead of global location', () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: {
          hostname: 'dayof.love',
          pathname: '/',
        },
      },
    });

    try {
      expect(isInternalToolingCaptureRouteFlagEnabled('', false, '/template-scroll-capture')).toBe(true);
      expect(isInternalToolingCaptureRouteFlagEnabled('', false, '/dashboard')).toBe(false);
    } finally {
      if (originalWindow) {
        Object.defineProperty(globalThis, 'window', {
          configurable: true,
          value: originalWindow,
        });
      } else {
        // @ts-expect-error cleaning up test shim
        delete globalThis.window;
      }
    }
  });
});
