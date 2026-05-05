import { describe, expect, it } from 'vitest';

import { isVendorProfileCreationEnabled } from './vendorProfileLaunch';

describe('vendor profile launch gating', () => {
  it('requires an explicit true flag before profile generation is enabled', () => {
    expect(isVendorProfileCreationEnabled('true')).toBe(true);
    expect(isVendorProfileCreationEnabled('TRUE')).toBe(true);
    expect(isVendorProfileCreationEnabled('false')).toBe(false);
    expect(isVendorProfileCreationEnabled(undefined)).toBe(false);
    expect(isVendorProfileCreationEnabled('')).toBe(false);
  });
});

