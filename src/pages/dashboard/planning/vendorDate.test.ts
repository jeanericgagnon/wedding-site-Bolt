import { describe, expect, it } from 'vitest';

import { formatVendorDate, isVendorDateBetween, isVendorDateOnOrBefore, toValidVendorDateOrNull } from './vendorDate';

describe('vendor date guards', () => {
  it('drops invalid persisted vendor dates instead of leaking Invalid Date', () => {
    const compareTo = new Date('2026-06-21T00:00:00.000Z');
    expect(toValidVendorDateOrNull('not-a-date')).toBeNull();
    expect(toValidVendorDateOrNull('2027-02-30')).toBeNull();
    expect(isVendorDateOnOrBefore('not-a-date', compareTo)).toBe(false);
    expect(isVendorDateOnOrBefore('2027-02-30', compareTo)).toBe(false);
    expect(isVendorDateBetween('not-a-date', new Date('2026-06-20T00:00:00.000Z'), new Date('2026-06-28T00:00:00.000Z'))).toBe(false);
    expect(isVendorDateBetween('2027-02-30', new Date('2026-06-20T00:00:00.000Z'), new Date('2026-06-28T00:00:00.000Z'))).toBe(false);
    expect(formatVendorDate('not-a-date')).toBe('Unknown date');
    expect(formatVendorDate('2027-02-30')).toBe('Unknown date');
  });

  it('keeps valid vendor dates truthful', () => {
    const value = '2026-06-20';
    const compareTo = new Date('2026-06-21T00:00:00.000Z');
    expect(toValidVendorDateOrNull(value)?.getTime()).toBe(new Date(2026, 5, 20).getTime());
    expect(isVendorDateOnOrBefore(value, compareTo)).toBe(true);
    expect(isVendorDateBetween(value, new Date('2026-06-19T00:00:00.000Z'), new Date('2026-06-21T00:00:00.000Z'))).toBe(true);
    expect(formatVendorDate(value)).toBe(new Date(2026, 5, 20).toLocaleDateString());
  });

  it('formats date-only vendor due dates as the saved local calendar day', () => {
    const value = '2026-06-15';
    const parsed = toValidVendorDateOrNull(value);

    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(5);
    expect(parsed?.getDate()).toBe(15);
    expect(formatVendorDate(value)).toBe(new Date(2026, 5, 15).toLocaleDateString());
  });
});
