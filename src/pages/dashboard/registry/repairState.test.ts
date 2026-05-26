import { describe, expect, it } from 'vitest';

import type { RegistryItem } from './registryTypes';
import { buildRegistryRepairQueue, getRegistryRepairStates } from './repairState';

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
        item_url: null,
        canonical_url: null,
        selected_product_url: null,
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
        item_url: null,
        canonical_url: null,
        selected_product_url: null,
        metadata_fetch_status: 'success',
        metadata_confidence_score: 0.92,
      }),
    );

    expect(states).toContain('broken-import');
  });

  it('treats invalid persisted next refresh dates as stale details instead of dropping the repair state', () => {
    const states = getRegistryRepairStates(
      makeItem({
        next_refresh_at: 'not-a-date',
      }),
    );

    expect(states).toContain('stale-details');
  });

  it('flags retailer drift when the saved retailer no longer matches the freshest metadata path', () => {
    const states = getRegistryRepairStates(
      makeItem({
        selected_retailer: 'Target',
        metadata_retailer: 'Amazon',
        product_metadata: {
          retailer_options: [{ label: 'Amazon', url: 'https://amazon.com/example' }],
        },
      }),
    );

    expect(states).toContain('retailer-drift');
  });

  it('flags proxy preview images so the owner queue can ask for a stronger product photo', () => {
    const states = getRegistryRepairStates(
      makeItem({
        image_url: 'https://images.weserv.nl/?url=example.com/image.jpg',
      }),
    );

    expect(states).toContain('proxy-image');
  });
});

describe('buildRegistryRepairQueue', () => {
  it('prioritizes broken imports over lower-severity cleanup work', () => {
    const queue = buildRegistryRepairQueue([
      makeItem({
        id: 'item-broken',
        item_name: 'Page not found',
        item_url: null,
        canonical_url: null,
        selected_product_url: null,
        metadata_fetch_status: 'blocked',
        metadata_confidence_score: 0.3,
      }),
      makeItem({
        id: 'item-stale',
        item_name: 'Fresh towels',
        next_refresh_at: '2020-01-01T00:00:00.000Z',
      }),
    ]);

    expect(queue[0]).toMatchObject({
      id: 'item-broken-broken-import',
      severity: 'high',
      primaryAction: 'reimport-source',
    });
    expect(queue[1]).toMatchObject({
      id: 'item-stale-stale-details',
      severity: 'low',
      primaryAction: 'refresh-details',
    });
  });

  it('uses the retailer repair action when retailer drift is the strongest remaining issue', () => {
    const queue = buildRegistryRepairQueue([
      makeItem({
        id: 'item-retailer',
        item_name: 'Drifting Toaster',
        selected_retailer: 'Target',
        metadata_retailer: 'Amazon',
        product_metadata: {
          retailer_options: [{ label: 'Amazon', url: 'https://amazon.com/toaster' }],
        },
      }),
    ]);

    expect(queue[0]).toMatchObject({
      primaryAction: 'review-retailer',
      secondaryAction: 'reimport-source',
      summary: 'Repair the current store choice',
    });
  });
});
