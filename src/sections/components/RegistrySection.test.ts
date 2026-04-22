import { describe, expect, it } from 'vitest';
import { getRegistryPurchaseCtaLabel } from './RegistrySection';

describe('getRegistryPurchaseCtaLabel', () => {
  it('keeps available items in purchasing state language', () => {
    expect(getRegistryPurchaseCtaLabel({ purchase_status: 'available' })).toBe('Mark as purchasing');
  });

  it('tells guests to buy remaining quantity for partial items', () => {
    expect(getRegistryPurchaseCtaLabel({ purchase_status: 'partial' })).toBe('Buy remaining');
  });
});
