import { describe, expect, it } from 'vitest';
import { getRegistryDisplayPriority, getRegistryEmptyStateMessage, getRegistryPurchaseCtaLabel, getRegistryPurchaseDialogCopy, getRegistryPurchaserStatusLabel, shouldUseLiveRegistryItems } from './RegistrySection';

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

  it('keeps partial registry dialog copy aligned with remaining-purchase flow', () => {
    expect(getRegistryPurchaseDialogCopy({ purchase_status: 'partial' })).toEqual({
      title: 'Buy remaining gift',
      confirmLabel: 'Confirm remaining purchase',
      successMessage: 'This gift is now updated with the remaining purchase.',
    });
  });

  it('only shows purchaser status after public purchase state leaves available', () => {
    expect(getRegistryPurchaserStatusLabel({ purchase_status: 'available', purchaser_name: 'Alex' })).toBeNull();
    expect(getRegistryPurchaserStatusLabel({ purchase_status: 'partial', purchaser_name: 'Alex' })).toBe('Purchasing: Alex');
  });

  it('does not claim everything is purchased when a registry filter is empty', () => {
    expect(getRegistryEmptyStateMessage([
      { purchase_status: 'available', hide_when_purchased: false, item_type: 'physical' },
    ], 'funds')).toBe('No items match this filter right now.');
  });

  it('keeps empty live registry loads from falling back to stale carryover links', () => {
    expect(shouldUseLiveRegistryItems([])).toBe(true);
    expect(shouldUseLiveRegistryItems(null)).toBe(false);
  });
});
