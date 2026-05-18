import { describe, expect, it } from 'vitest';

import { isVendorProfileCreationEnabled } from './vendorProfileLaunch';

describe('vendor profile launch gating', () => {
  it('keeps vendor profile generation on unless it is explicitly disabled', () => {
    expect(isVendorProfileCreationEnabled('true')).toBe(true);
    expect(isVendorProfileCreationEnabled('TRUE')).toBe(true);
    expect(isVendorProfileCreationEnabled('false')).toBe(false);
    expect(isVendorProfileCreationEnabled(undefined)).toBe(true);
    expect(isVendorProfileCreationEnabled('')).toBe(true);
  });
});
