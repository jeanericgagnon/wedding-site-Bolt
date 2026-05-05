import { describe, expect, it } from 'vitest';
import {
  buildRegistryPreviewFromItem,
  computeConfidence,
  getBlockedMessage,
  getRegistryItemMetadataState,
  itemNeedsAttention,
  normalizeRegistryComparisonUrl,
  normalizeRegistryTitleForComparison,
  type RegistryItem,
  type RegistryPreview,
} from './registryTypes';

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

describe('registry metadata confidence + attention state', () => {
  it('computes full confidence for strong successful previews', () => {
    const preview: RegistryPreview = {
      title: 'KitchenAid Mixer',
      price_label: '$399.99',
      price_amount: 399.99,
      image_url: 'https://example.com/image.jpg',
      merchant: 'amazon.com',
      canonical_url: 'https://example.com/product',
      description: null,
      currency: null,
      availability: null,
      brand: null,
      retailer: 'amazon',
      confidence_score: 0.92,
      source_method: 'adapter',
      fetch_status: 'success',
      error: null,
    };

    expect(computeConfidence(preview)).toBe('full');
  });

  it('treats blocked previews as manual and explains the block', () => {
    const preview: RegistryPreview = {
      title: null,
      price_label: null,
      price_amount: null,
      image_url: null,
      merchant: 'amazon.com',
      canonical_url: 'https://amazon.com/dp/B001',
      description: null,
      currency: null,
      availability: null,
      brand: null,
      retailer: 'amazon',
      confidence_score: null,
      source_method: 'adapter',
      fetch_status: 'blocked',
      error: null,
    };

    expect(computeConfidence(preview)).toBe('manual');
    expect(getBlockedMessage(preview)).toMatch(/Amazon blocks automatic product lookups/i);
  });

  it('marks broken imports and missing fields as attention-worthy', () => {
    const item = makeItem({
      item_name: 'Page not found',
      image_url: null,
      price_label: null,
      price_amount: null,
      metadata_fetch_status: 'blocked',
      metadata_confidence_score: null,
    });

    const state = getRegistryItemMetadataState(item);

    expect(state.hasBadImportTitle).toBe(true);
    expect(state.missingSummary).toMatch(/Missing:/);
    expect(state.repairStates).toEqual(expect.arrayContaining(['broken-import', 'stale-details', 'manual-review']));
    expect(itemNeedsAttention(item)).toBe(true);
  });

  it('treats product unavailable titles as bad imports that need repair', () => {
    const item = makeItem({
      item_name: 'Product unavailable',
      metadata_fetch_status: 'success',
      metadata_confidence_score: 0.92,
    });

    const state = getRegistryItemMetadataState(item);

    expect(state.hasBadImportTitle).toBe(true);
    expect(state.repairStates).toEqual(expect.arrayContaining(['broken-import']));
    expect(itemNeedsAttention(item)).toBe(true);
  });

  it('builds preview data from stored registry item fields', () => {
    const item = makeItem();
    expect(buildRegistryPreviewFromItem(item)).toMatchObject({
      title: 'KitchenAid Mixer',
      merchant: 'amazon.com',
      price_amount: 399.99,
      fetch_status: 'success',
    });
  });
});

describe('normalizeRegistryComparisonUrl', () => {
  it('drops tracking params and normalizes host/path', () => {
    expect(normalizeRegistryComparisonUrl('https://Example.com/product/?utm_source=ig&ref=abc')).toBe('example.com/product');
  });

  it('preserves meaningful query params while removing tracking noise', () => {
    expect(normalizeRegistryComparisonUrl('https://shop.example.com/product?id=42&utm_campaign=test')).toBe('shop.example.com/product?id=42');
  });
});

describe('normalizeRegistryTitleForComparison', () => {
  it('normalizes punctuation, apostrophes, and whitespace drift', () => {
    expect(normalizeRegistryTitleForComparison("KitchenAid   Mixer — Matte Black!!!")).toBe('kitchenaid mixer matte black');
    expect(normalizeRegistryTitleForComparison("KitchenAid Mixer, Matte Black")).toBe('kitchenaid mixer matte black');
    expect(normalizeRegistryTitleForComparison("The Couple’s Favorite Pan")).toBe('the couples favorite pan');
  });
});
