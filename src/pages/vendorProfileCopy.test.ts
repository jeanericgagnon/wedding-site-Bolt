import { describe, expect, it } from 'vitest';

import {
  mapVendorProfileError,
  VENDOR_PROFILE_CREATE_RETRY_ERROR,
  VENDOR_PROFILE_DRAFT_RETRY_ERROR,
  VENDOR_PROFILE_LOAD_RETRY_ERROR,
} from './vendorProfileCopy';

describe('vendorProfileCopy', () => {
  it('keeps known missing-page guidance readable', () => {
    expect(mapVendorProfileError(new Error('Vendor page not found.'), VENDOR_PROFILE_LOAD_RETRY_ERROR)).toBe(
      'Vendor page not found.',
    );
  });

  it('masks provider and backend vendor failures behind calm public copy', () => {
    expect(mapVendorProfileError(new Error('openai provider timeout with token=abc'), VENDOR_PROFILE_DRAFT_RETRY_ERROR)).toBe(
      VENDOR_PROFILE_DRAFT_RETRY_ERROR,
    );
    expect(mapVendorProfileError(new Error('Supabase row-level security policy denied vendor profile insert'), VENDOR_PROFILE_CREATE_RETRY_ERROR)).toBe(
      VENDOR_PROFILE_CREATE_RETRY_ERROR,
    );
  });
});
