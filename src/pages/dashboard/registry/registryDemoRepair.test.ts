import { describe, expect, it } from 'vitest';

import { buildDemoRegistryRepairPatch } from './registryDemoRepair';
import type { RegistryItem } from './registryTypes';

function makeItem(overrides: Partial<RegistryItem> = {}): RegistryItem {
  return {
    id: 'gift-1',
    wedding_site_id: 'site-1',
    item_name: 'Page not found',
    price_label: '$120',
    price_amount: 120,
    store_name: null,
    merchant: null,
    item_url: 'https://crateandbarrel.com/wedding/proof-serving-bowl',
    canonical_url: 'https://crateandbarrel.com/wedding/proof-serving-bowl',
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
    metadata_fetch_status: 'blocked',
    metadata_confidence_score: 0.22,
    metadata_source_method: 'manual',
    metadata_retailer: null,
    next_refresh_at: null,
    last_auto_refreshed_at: null,
    refresh_fail_count: 3,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildDemoRegistryRepairPatch', () => {
  it('repairs broken imported titles into a readable owner-facing gift name', () => {
    const patch = buildDemoRegistryRepairPatch(makeItem());

    expect(patch.item_name).toBe('Proof Serving Bowl');
    expect(patch.merchant).toBe('Crateandbarrel');
    expect(patch.store_name).toBe('Crateandbarrel');
    expect(patch.metadata_fetch_status).toBe('success');
    expect(patch.refresh_fail_count).toBe(0);
  });

  it('can fully reimport demo details from the source url when requested', () => {
    const patch = buildDemoRegistryRepairPatch(
      makeItem({
        item_name: 'Gift from Example',
        merchant: 'Old Store',
        store_name: 'Old Store',
      }),
      { replaceExisting: true },
    );

    expect(patch.item_name).toBe('Proof Serving Bowl');
    expect(patch.merchant).toBe('Crateandbarrel');
    expect(patch.store_name).toBe('Crateandbarrel');
    expect(patch.metadata_source_method).toBe('heuristic');
  });
});
