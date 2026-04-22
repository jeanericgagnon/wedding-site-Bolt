import { describe, expect, it } from 'vitest';
import { getRegistryDisplayPriority, getRegistryPurchaseCtaLabel } from './RegistrySection';

describe('getRegistryPurchaseCtaLabel', () => {
  it('keeps available items in purchasing state language', () => {
    expect(getRegistryPurchaseCtaLabel({ purchase_status: 'available' })).toBe('Mark as purchasing');
  });

  it('tells guests to buy remaining quantity for partial items', () => {
    expect(getRegistryPurchaseCtaLabel({ purchase_status: 'partial' })).toBe('Buy remaining');
  });

  it('keeps partial registry items ahead of purchased ones in public sorting', () => {
    expect(getRegistryDisplayPriority({ purchase_status: 'partial', item_type: 'physical' })).toBe(1);
    expect(getRegistryDisplayPriority({ purchase_status: 'purchased', item_type: 'physical' })).toBe(0);
  });
});
