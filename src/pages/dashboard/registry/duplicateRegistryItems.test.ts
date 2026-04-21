import { describe, expect, it } from 'vitest';

import type { RegistryItem } from './registryTypes';
import { findDuplicateRegistryGroups } from './duplicateRegistryItems';

function makeItem(overrides: Partial<RegistryItem> = {}): RegistryItem {
  return {
    id: 'item-1',
    wedding_site_id: 'site-1',
    item_name: 'Test Product',
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
    purchaser_name: null,
    purchase_status: 'available',
    hide_when_purchased: false,
    sort_order: 0,
    priority: 'medium',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('findDuplicateRegistryGroups', () => {
  it('groups items with matching normalized URLs', () => {
    const groups = findDuplicateRegistryGroups([
      makeItem({ id: 'item-1', canonical_url: 'https://example.com/product?utm_source=ig' }),
      makeItem({ id: 'item-2', canonical_url: 'https://example.com/product' }),
      makeItem({ id: 'item-3', canonical_url: 'https://example.com/other' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].map((item) => item.id)).toEqual(['item-1', 'item-2']);
  });

  it('groups title-only items despite punctuation and spacing drift', () => {
    const groups = findDuplicateRegistryGroups([
      makeItem({ id: 'item-1', item_name: 'KitchenAid Mixer - Matte Black' }),
      makeItem({ id: 'item-2', item_name: 'KitchenAid   Mixer Matte Black' }),
      makeItem({ id: 'item-3', item_name: "KitchenAid Mixer, Matte Black!" }),
      makeItem({ id: 'item-4', item_name: 'Dyson Airwrap' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].map((item) => item.id)).toEqual(['item-1', 'item-2', 'item-3']);
  });
});
