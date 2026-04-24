import { describe, expect, it } from 'vitest';

import { formatVendorDate, isVendorDateOnOrBefore, toValidVendorDateOrNull } from './vendorDate';

describe('vendor date guards', () => {
  it('drops invalid persisted vendor dates instead of leaking Invalid Date', () => {
    const compareTo = new Date('2026-06-21T00:00:00.000Z');
    expect(toValidVendorDateOrNull('not-a-date')).toBeNull();
    expect(isVendorDateOnOrBefore('not-a-date', compareTo)).toBe(false);
    expect(formatVendorDate('not-a-date')).toBe('Unknown date');
  });

  it('keeps valid vendor dates truthful', () => {
    const value = '2026-06-20';
    const compareTo = new Date('2026-06-21T00:00:00.000Z');
    expect(toValidVendorDateOrNull(value)?.getTime()).toBe(new Date(value).getTime());
    expect(isVendorDateOnOrBefore(value, compareTo)).toBe(true);
    expect(formatVendorDate(value)).toBe(new Date(value).toLocaleDateString());
  });
});
