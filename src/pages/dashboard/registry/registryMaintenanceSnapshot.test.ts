import { describe, expect, it } from 'vitest';

import { buildRegistryMaintenanceSnapshot } from './registryMaintenanceSnapshot';
import type { RegistryItem } from './registryTypes';

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
    metadata_confidence_score: 0.9,
    metadata_source_method: 'adapter',
    metadata_retailer: 'amazon',
    ...overrides,
  };
}

describe('registryMaintenanceSnapshot', () => {
  it('builds a shared maintenance snapshot from registry items', () => {
    const items: RegistryItem[] = [
      makeItem({
        id: 'broken-1',
        item_name: 'Access Denied',
        store_name: 'REI',
        merchant: 'rei.com',
        item_url: 'https://www.rei.com/product/example',
        canonical_url: 'https://www.rei.com/product/example',
        selected_product_url: 'https://www.rei.com/product/example',
        image_url: null,
        price_label: null,
        price_amount: null,
        metadata_fetch_status: 'blocked',
        metadata_confidence_score: 0.4,
        source_status: 'blocked',
      }),
      makeItem({
        id: 'partial-1',
        item_name: 'Dinner plates',
        image_url: null,
        price_label: null,
        price_amount: null,
        metadata_fetch_status: 'success',
        metadata_confidence_score: 0.55,
      }),
    ];

    const snapshot = buildRegistryMaintenanceSnapshot(items);

    expect(snapshot.actionableBadImportCount).toBe(0);
    expect(snapshot.legacyRepairReport.candidateCount).toBe(0);
    expect(snapshot.legacyRepairReport.autoConvertibleCount).toBe(0);
    expect(snapshot.truthSweepPrediction.candidateCount).toBeGreaterThan(0);
    expect(snapshot.cleanupGroups.map((group) => group.label)).toEqual(
      expect.arrayContaining(['Missing image or details']),
    );
  });
});
