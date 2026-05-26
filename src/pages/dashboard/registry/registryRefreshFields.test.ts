import { describe, expect, it } from 'vitest';

import type { RegistryItem, RegistryPreview } from './registryTypes';
import { buildRegistryRefreshFields, getRegistryRefreshSourceUrl, scoreRegistryItemQuality, scoreRegistryPreviewQuality } from './registryRefreshFields';

function makeItem(overrides: Partial<RegistryItem> = {}): RegistryItem {
  return {
    id: 'item-1',
    wedding_site_id: 'site-1',
    item_name: 'Scanned Bowl',
    price_label: '$72.00',
    price_amount: 72,
    store_name: 'Store A',
    merchant: 'Store A',
    source_type: 'barcode',
    barcode: '036000291452',
    item_url: 'https://store-a.example.com/bowl',
    canonical_url: 'https://store-a.example.com/bowl',
    image_url: null,
    selected_retailer: 'Store A',
    selected_product_url: 'https://store-a.example.com/bowl',
    estimated_price_cents: 7200,
    product_metadata: {
      selected_retailer: 'Store A',
      product_url: 'https://store-a.example.com/bowl',
      estimated_price_cents: 7200,
    },
    description: null,
    notes: null,
    quantity_needed: 1,
    quantity_purchased: 0,
    purchaser_name: null,
    purchase_status: 'available',
    hide_when_purchased: false,
    sort_order: 0,
    priority: 'medium',
    availability: null,
    metadata_last_checked_at: null,
    metadata_fetch_status: 'success',
    metadata_confidence_score: 0.62,
    metadata_source_method: 'adapter',
    metadata_retailer: 'Store A',
    previous_price_amount: null,
    price_last_changed_at: null,
    next_refresh_at: null,
    last_auto_refreshed_at: null,
    refresh_fail_count: 2,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

function makePreview(overrides: Partial<RegistryPreview> = {}): RegistryPreview {
  return {
    title: 'Scanned Bowl',
    price_label: '$64.00',
    price_amount: 64,
    image_url: 'https://cdn.example.com/bowl.jpg',
    merchant: 'Store B',
    store_name: 'Store B',
    canonical_url: 'https://store-b.example.com/bowl',
    description: 'A better bowl',
    currency: 'USD',
    availability: 'In stock',
    brand: 'DayOf',
    retailer: 'Store B',
    confidence_score: 0.91,
    source_method: 'adapter',
    fetch_status: 'success',
    error: null,
    ...overrides,
  };
}

describe('getRegistryRefreshSourceUrl', () => {
  it('prefers the owner-selected product URL for retailer refreshes', () => {
    const item = makeItem({
      selected_product_url: 'https://store-b.example.com/bowl',
      item_url: 'https://store-a.example.com/bowl',
    });

    expect(getRegistryRefreshSourceUrl(item)).toBe('https://store-b.example.com/bowl');
  });
});

describe('buildRegistryRefreshFields', () => {
  it('keeps retailer parity and resets refresh failures during auto refresh', () => {
    const fields = buildRegistryRefreshFields(
      makeItem(),
      makePreview(),
      { autoRefresh: true, now: new Date('2026-05-13T20:00:00.000Z') },
    );

    expect(fields.selected_retailer).toBe('Store B');
    expect(fields.store_name).toBe('Store B');
    expect(fields.merchant).toBe('Store B');
    expect(fields.selected_product_url).toBe('https://store-b.example.com/bowl');
    expect(fields.item_url).toBe('https://store-b.example.com/bowl');
    expect(fields.canonical_url).toBe('https://store-b.example.com/bowl');
    expect(fields.estimated_price_cents).toBe(6400);
    expect(fields.price_amount).toBe(64);
    expect(fields.previous_price_amount).toBe(72);
    expect(fields.refresh_fail_count).toBe(0);
    expect(fields.last_auto_refreshed_at).toBe('2026-05-13T20:00:00.000Z');
    expect(fields.product_metadata).toEqual(expect.objectContaining({
      selected_retailer: 'Store B',
      product_url: 'https://store-b.example.com/bowl',
      estimated_price_cents: 6400,
      availability: 'In stock',
    }));
  });

  it('preserves existing title and image on a non-replace refresh pass', () => {
    const fields = buildRegistryRefreshFields(
      makeItem({ item_name: 'Already Curated', image_url: 'https://cdn.example.com/existing.jpg' }),
      makePreview({ title: 'Imported Title', image_url: 'https://cdn.example.com/new.jpg' }),
      { replaceExisting: false, now: new Date('2026-05-13T20:00:00.000Z') },
    );

    expect(fields.item_name).toBeUndefined();
    expect(fields.image_url).toBeUndefined();
    expect(fields.description).toBe('A better bowl');
    expect(fields.selected_retailer).toBe('Store B');
  });

  it('does not overwrite a good item with a blocked or link-only refresh result', () => {
    const item = makeItem({
      item_name: 'Vitamix Ascent A3500 Blender',
      image_url: 'https://cdn.example.com/vitamix.jpg',
      price_amount: 649,
      price_label: '$649.00',
      store_name: 'Williams Sonoma',
      merchant: 'Williams Sonoma',
      metadata_confidence_score: 0.92,
    });
    const preview = makePreview({
      title: 'Access Denied',
      image_url: null,
      price_amount: null,
      price_label: null,
      merchant: 'Williams Sonoma',
      store_name: 'Williams Sonoma',
      fetch_status: 'blocked',
      source_method: 'link_only',
      display_mode: 'link_card',
      confidence_score: 0.4,
    });

    const fields = buildRegistryRefreshFields(item, preview, { autoRefresh: true, now: new Date('2026-05-13T20:00:00.000Z') });

    expect(scoreRegistryItemQuality(item)).toBeGreaterThan(scoreRegistryPreviewQuality(preview));
    expect(fields.item_name).toBeUndefined();
    expect(fields.image_url).toBeUndefined();
    expect(fields.price_amount).toBeUndefined();
    expect(fields.metadata_fetch_status).toBeUndefined();
    expect(fields.product_metadata).toEqual(expect.objectContaining({
      registryLastRefreshSkippedReason: 'new_result_worse',
      registryLastRefreshPreviewStatus: 'blocked',
      registryLastRefreshPreviewMode: 'link_card',
    }));
    expect(fields.last_auto_refreshed_at).toBe('2026-05-13T20:00:00.000Z');
  });
});
