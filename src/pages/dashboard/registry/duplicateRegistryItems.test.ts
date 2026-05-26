import { describe, expect, it } from 'vitest';

import type { RegistryItem } from './registryTypes';
import { buildRegistryDuplicateGroups, buildRegistryDuplicateMergePatch, findDuplicateRegistryGroups } from './duplicateRegistryItems';

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
      makeItem({ id: 'item-3', canonical_url: 'https://example.com/other', item_name: 'Other Product' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].map((item) => item.id)).toEqual(['item-1', 'item-2']);
  });

  it('groups high-confidence same-store title matches despite punctuation and spacing drift', () => {
    const groups = findDuplicateRegistryGroups([
      makeItem({ id: 'item-1', item_name: 'KitchenAid Mixer - Matte Black', store_name: 'Target', metadata_confidence_score: 0.9 }),
      makeItem({ id: 'item-2', item_name: 'KitchenAid   Mixer Matte Black', store_name: 'Target', metadata_confidence_score: 0.92 }),
      makeItem({ id: 'item-3', item_name: "KitchenAid Mixer, Matte Black!", store_name: 'Target', metadata_confidence_score: 0.91 }),
      makeItem({ id: 'item-4', item_name: 'Dyson Airwrap' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].map((item) => item.id).sort()).toEqual(['item-1', 'item-2', 'item-3']);
  });

  it('does not group blocked imports by bad titles', () => {
    const groups = findDuplicateRegistryGroups([
      makeItem({ id: 'item-1', item_name: 'Access Denied', store_name: 'REI', item_url: 'https://www.rei.com/product/one', metadata_confidence_score: 0.95 }),
      makeItem({ id: 'item-2', item_name: 'Access Denied', store_name: "Macy's", item_url: 'https://www.macys.com/shop/product/two', metadata_confidence_score: 0.95 }),
      makeItem({ id: 'item-3', item_name: 'Robot or human?', store_name: 'Walmart', item_url: 'https://www.walmart.com/ip/three', metadata_confidence_score: 0.95 }),
    ]);

    expect(groups).toHaveLength(0);
  });

  it('builds merge-ready duplicate groups with a preferred keep item', () => {
    const groups = buildRegistryDuplicateGroups([
      makeItem({
        id: 'item-1',
        item_name: 'KitchenAid Mixer - Matte Black',
        canonical_url: 'https://example.com/mixer',
        image_url: 'https://example.com/mixer.jpg',
        price_amount: 399.99,
        metadata_confidence_score: 0.9,
      }),
      makeItem({
        id: 'item-2',
        item_name: 'KitchenAid Mixer Matte Black',
        item_url: 'https://example.com/mixer?utm_source=ig',
        quantity_needed: 2,
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].primaryItem.id).toBe('item-1');
    expect(groups[0].secondaryItems.map((item) => item.id)).toEqual(['item-2']);
    expect(groups[0].signals.map((signal) => signal.kind)).toContain('product-url');
    expect(groups[0].mergedQuantityNeeded).toBe(2);
  });

  it('merges duplicate fields without dropping the strongest source details', () => {
    const primary = makeItem({
      id: 'item-1',
      item_name: 'KitchenAid Mixer',
      canonical_url: 'https://example.com/mixer',
      item_url: 'https://example.com/mixer',
      image_url: 'https://example.com/mixer.jpg',
      price_amount: 399.99,
      quantity_needed: 1,
      quantity_purchased: 1,
      metadata_confidence_score: 0.9,
      metadata_fetch_status: 'success',
      metadata_last_checked_at: '2026-05-10T00:00:00.000Z',
      next_refresh_at: '2026-05-20T00:00:00.000Z',
      notes: 'Primary note',
    });
    const patch = buildRegistryDuplicateMergePatch(primary, [
      makeItem({
        id: 'item-2',
        item_name: 'KitchenAid Mixer',
        selected_product_url: 'https://store.example.com/mixer',
        quantity_needed: 2,
        quantity_purchased: 0,
        metadata_fetch_status: 'error',
        refresh_fail_count: 2,
        next_refresh_at: '2026-05-15T00:00:00.000Z',
        notes: 'Secondary note',
      }),
    ]);

    expect(patch.canonical_url).toBe('https://example.com/mixer');
    expect(patch.selected_product_url).toBe('https://store.example.com/mixer');
    expect(patch.quantity_needed).toBe(2);
    expect(patch.quantity_purchased).toBe(1);
    expect(patch.notes).toContain('Primary note');
    expect(patch.notes).toContain('Secondary note');
    expect(patch.next_refresh_at).toBe('2026-05-15T00:00:00.000Z');
    expect(patch.refresh_fail_count).toBe(2);
  });
});
