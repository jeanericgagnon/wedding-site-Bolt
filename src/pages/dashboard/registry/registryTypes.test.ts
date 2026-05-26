import { describe, expect, it } from 'vitest';
import {
  buildRegistryHiddenReviewPatch,
  buildRegistryLinkOnlyRepairPatch,
  buildRegistrySafetyRevalidationPatch,
  buildRegistryPreviewFromItem,
  computeConfidence,
  getBlockedMessage,
  getRegistryItemMetadataState,
  getOwnerRegistryDisplayTitle,
  itemNeedsAttention,
  isBadRegistryProductTitle,
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
      item_url: null,
      canonical_url: null,
      selected_product_url: null,
      metadata_fetch_status: 'success',
      metadata_confidence_score: 0.92,
    });

    const state = getRegistryItemMetadataState(item);

    expect(state.hasBadImportTitle).toBe(true);
    expect(state.repairStates).toEqual(expect.arrayContaining(['broken-import']));
    expect(itemNeedsAttention(item)).toBe(true);
  });

  it('keeps link-only fallback titles guest-safe instead of marking them broken', () => {
    const item = makeItem({
      item_name: 'Access Denied',
      store_name: 'REI',
      item_url: 'https://www.rei.com/product/example',
      selected_product_url: 'https://www.rei.com/product/example',
      image_url: null,
      price_label: null,
      price_amount: null,
      metadata_fetch_status: 'blocked',
      metadata_confidence_score: 0.4,
      metadata_source_method: 'link_only',
    });

    const state = getRegistryItemMetadataState(item);

    expect(isBadRegistryProductTitle('Access Denied')).toBe(true);
    expect(isBadRegistryProductTitle('404 Not Found')).toBe(true);
    expect(isBadRegistryProductTitle('Robot or human?')).toBe(true);
    expect(isBadRegistryProductTitle('A 49168231')).toBe(true);
    expect(isBadRegistryProductTitle('Gift link needs review')).toBe(true);
    expect(state.displayMode).toBe('link_card');
    expect(state.guestSafe).toBe(true);
    expect(getOwnerRegistryDisplayTitle(item.item_name, item)).toBe('Gift from REI');
  });

  it('builds a clean link-only repair patch for legacy bad imports with a saved url', () => {
    const item = makeItem({
      item_name: 'Access Denied',
      store_name: 'REI',
      item_url: 'https://www.rei.com/product/example',
      selected_product_url: 'https://www.rei.com/product/example',
      image_url: 'https://example.com/bad.jpg',
      price_label: '$12.00',
      price_amount: 12,
      metadata_fetch_status: 'blocked',
      source_status: 'blocked',
      product_metadata: {
        selected_retailer: 'REI',
      },
    });

    const patch = buildRegistryLinkOnlyRepairPatch(item);

    expect(patch).toMatchObject({
      item_name: 'Gift from REI',
      display_mode: 'link_card',
      guest_safe: true,
      source_status: 'blocked',
      review_status: 'blocked_source',
      import_source_method: 'link_only',
      price_label: null,
      price_amount: null,
      image_url: null,
    });
    expect(patch?.product_metadata).toEqual(expect.objectContaining({
      registryDisplayMode: 'link_card',
      registryGuestSafe: true,
      registryImportSourceMethod: 'link_only',
    }));
  });

  it('builds an owner-only hidden review patch for broken legacy imports with no safe url', () => {
    const item = makeItem({
      item_name: 'Robot or human?',
      item_url: null,
      canonical_url: null,
      selected_product_url: null,
      metadata_fetch_status: 'blocked',
    });

    const patch = buildRegistryHiddenReviewPatch(item);

    expect(patch).toMatchObject({
      item_name: 'Needs review',
      display_mode: 'review_only',
      guest_safe: false,
      review_status: 'needs_review',
    });
    expect(patch?.product_metadata).toEqual(expect.objectContaining({
      registryDisplayMode: 'review_only',
      registryGuestSafe: false,
      registryReviewStatus: 'needs_review',
    }));
  });

  it('builds a safety revalidation patch when saved link-only truth is missing canonical fields', () => {
    const item = makeItem({
      item_name: 'Access Denied',
      store_name: 'REI',
      item_url: 'https://www.rei.com/product/example',
      selected_product_url: 'https://www.rei.com/product/example',
      image_url: null,
      price_label: null,
      price_amount: null,
      metadata_fetch_status: 'blocked',
      metadata_confidence_score: 0.4,
      display_mode: null,
      guest_safe: null,
      review_status: null,
      source_status: null,
      product_metadata: {},
    });

    const patch = buildRegistrySafetyRevalidationPatch(item);

    expect(patch).toMatchObject({
      item_name: 'Gift from REI',
      display_mode: 'link_card',
      guest_safe: true,
      review_status: 'blocked_source',
      source_status: 'blocked',
      import_source_method: 'link_only',
    });
    expect(patch?.product_metadata).toEqual(expect.objectContaining({
      registryDisplayMode: 'link_card',
      registryGuestSafe: true,
      registryReviewStatus: 'blocked_source',
      registrySourceStatus: 'blocked',
    }));
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
