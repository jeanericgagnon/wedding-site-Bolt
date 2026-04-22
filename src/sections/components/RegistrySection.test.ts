import { describe, expect, it } from 'vitest';
import { getRegistryDisplayPriority, getRegistryEmptyStateMessage, getRegistryPurchaseCtaLabel, getRegistryPurchaseDialogCopy, getRegistryPurchaserStatusLabel, normalizePublicRegistryItemState, shouldUseLiveRegistryItems } from './RegistrySection';

describe('getRegistryPurchaseCtaLabel', () => {
  it('keeps available items in purchasing state language', () => {
    expect(getRegistryPurchaseCtaLabel({ purchase_status: 'available' })).toBe('Mark as purchasing');
  });

  it('tells guests to buy remaining quantity for partial items', () => {
    expect(getRegistryPurchaseCtaLabel({ purchase_status: 'partial' })).toBe('Buy remaining');
  });

  it('keeps partial registry items ahead of purchased ones in public sorting', () => {
    expect(getRegistryDisplayPriority({ purchase_status: 'partial', item_type: 'product' })).toBe(1);
    expect(getRegistryDisplayPriority({ purchase_status: 'purchased', item_type: 'product' })).toBe(0);
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
    expect(getRegistryPurchaserStatusLabel({ purchase_status: 'purchased', purchaser_name: 'Alex' })).toBe('Purchased by Alex');
  });

  it('does not claim everything is purchased when a registry filter is empty', () => {
    expect(getRegistryEmptyStateMessage([
      { purchase_status: 'available', hide_when_purchased: false, item_type: 'product' },
    ], 'funds')).toBe('No items match this filter right now.');
  });

  it('keeps empty live registry loads from falling back to stale carryover links', () => {
    expect(shouldUseLiveRegistryItems([])).toBe(true);
    expect(shouldUseLiveRegistryItems(null)).toBe(false);
  });

  it('normalizes contradictory public purchase state before rendering guest truth', () => {
    expect(normalizePublicRegistryItemState({
      id: 'item-1',
      wedding_site_id: 'site-1',
      item_name: 'Mixer',
      price_label: null,
      price_amount: null,
      store_name: null,
      merchant: null,
      item_url: null,
      canonical_url: null,
      image_url: null,
      description: null,
      notes: null,
      quantity_needed: 1,
      quantity_purchased: 0,
      purchaser_name: 'Alex',
      purchase_status: 'purchased',
      hide_when_purchased: false,
      sort_order: 0,
      priority: 'medium',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })).toEqual(expect.objectContaining({
      quantity_needed: 1,
      quantity_purchased: 0,
      purchase_status: 'available',
      purchaser_name: null,
    }));
  });
});
