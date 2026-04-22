import { describe, expect, it } from 'vitest';

import type { RegistryItem } from './registryTypes';
import { getRegistryRepairStates } from './repairState';

function makeItem(overrides: Partial<RegistryItem> = {}): RegistryItem {
  return {
    id: 'item-1',
    wedding_site_id: 'site-1',
    item_name: 'KitchenAid Mixer',
    price_label: '$399.99',
    price_amount: 399.99,
    store_name: 'Amazon',
    merchant: 'amazon.com',
    item_url: 'https://example.com/product',
    canonical_url: 'https://example.com/product',
    image_url: 'https://example.com/image.jpg',
    description: 'A stand mixer',
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
    metadata_fetch_status: 'success',
    metadata_confidence_score: 0.95,
    metadata_source_method: 'adapter',
    metadata_retailer: 'amazon',
    next_refresh_at: null,
    refresh_fail_count: 0,
    ...overrides,
  };
}

describe('getRegistryRepairStates', () => {
  it('returns every repair state when signals overlap', () => {
    const states = getRegistryRepairStates(
      makeItem({
        item_name: 'Page not found',
        image_url: null,
        price_label: null,
        price_amount: null,
        metadata_fetch_status: 'blocked',
        metadata_confidence_score: 0.3,
        next_refresh_at: '2020-01-01T00:00:00.000Z',
        refresh_fail_count: 2,
      }),
    );

    expect(states).toEqual(
      expect.arrayContaining(['broken-import', 'partial-import', 'stale-details', 'manual-review']),
    );
  });

  it('marks unavailable/import-failure titles as broken imports even before fetch status degrades', () => {
    const states = getRegistryRepairStates(
      makeItem({
        item_name: 'Product unavailable',
        metadata_fetch_status: 'success',
        metadata_confidence_score: 0.92,
      }),
    );

    expect(states).toContain('broken-import');
  });
});
