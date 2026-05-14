import { beforeEach, describe, expect, it } from 'vitest';

import { DEMO_REGISTRY_STATE_STORAGE_KEY, readDemoRegistryState, writeDemoRegistryState } from './registryDemoStorage';

describe('registryDemoStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns default demo registry state when storage is empty', () => {
    const state = readDemoRegistryState();

    expect(state.items.length).toBeGreaterThan(0);
    expect(state.thankYouLedger).toEqual({});
  });

  it('persists registry items and thank-you ledger for demo continuity', () => {
    const saved = writeDemoRegistryState({
      items: [
        {
          id: 'demo-registry-proof',
          wedding_site_id: 'demo-site-id',
          item_type: 'product',
          source_type: 'manual',
          item_name: 'Proof serving bowl',
          barcode: null,
          price_label: null,
          price_amount: 84.5,
          store_name: 'Proof Home',
          merchant: 'Proof Home',
          item_url: 'https://example.com/proof-bowl',
          canonical_url: 'https://example.com/proof-bowl',
          image_url: null,
          selected_retailer: null,
          selected_product_url: null,
          estimated_price_cents: null,
          product_metadata: null,
          description: null,
          notes: 'Demo continuity',
          quantity_needed: 2,
          quantity_purchased: 1,
          purchaser_name: 'Alex',
          purchase_status: 'partial',
          hide_when_purchased: false,
          sort_order: 0,
          priority: 'high',
          availability: null,
          metadata_last_checked_at: null,
          metadata_fetch_status: 'manual',
          metadata_confidence_score: null,
          metadata_source_method: 'manual',
          metadata_retailer: null,
          previous_price_amount: null,
          price_last_changed_at: null,
          next_refresh_at: null,
          last_auto_refreshed_at: null,
          refresh_fail_count: 0,
          created_at: '2026-05-14T00:00:00.000Z',
          updated_at: '2026-05-14T00:00:00.000Z',
        },
      ],
      thankYouLedger: {
        'demo-registry-proof': {
          itemId: 'demo-registry-proof',
          giftName: 'Proof serving bowl',
          purchaserName: 'Alex',
          quantityPurchased: 1,
          quantityNeeded: 2,
          status: 'todo',
          generatedAt: '2026-05-14T00:00:00.000Z',
          completedAt: null,
        },
      },
    });

    expect(saved.items[0]?.item_name).toBe('Proof serving bowl');

    const restored = readDemoRegistryState();
    expect(restored.items[0]).toMatchObject({
      item_name: 'Proof serving bowl',
      quantity_purchased: 1,
      purchaser_name: 'Alex',
      purchase_status: 'partial',
    });
    expect(restored.thankYouLedger['demo-registry-proof']).toMatchObject({
      giftName: 'Proof serving bowl',
      purchaserName: 'Alex',
      status: 'todo',
    });
  });

  it('drops malformed storage and falls back to defaults', () => {
    window.localStorage.setItem(DEMO_REGISTRY_STATE_STORAGE_KEY, JSON.stringify({ value: { items: 'bad' } }));

    const restored = readDemoRegistryState();
    expect(restored.items.length).toBeGreaterThan(0);
    expect(restored.thankYouLedger).toEqual({});
  });
});
