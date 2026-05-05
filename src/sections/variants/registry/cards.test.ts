import { describe, expect, it } from 'vitest';
import { getRegistryItemPublicUrl, getSafePublicRegistryUrl, groupByStore, normalizeRegistryStoreGroupItems, shouldUseLiveRegistryStoreGroups } from './cards';
import type { RegistryItem } from '../../../pages/dashboard/registry/registryTypes';

const makeItem = (overrides: Partial<RegistryItem>): RegistryItem => ({
  id: overrides.id ?? 'item-1',
  wedding_site_id: overrides.wedding_site_id ?? 'site-1',
  item_name: overrides.item_name ?? 'Test item',
  item_url: overrides.item_url ?? null,
  canonical_url: overrides.canonical_url ?? null,
  store_name: overrides.store_name ?? 'Crate & Barrel',
  merchant: overrides.merchant ?? null,
  purchase_status: overrides.purchase_status ?? 'available',
  hide_when_purchased: overrides.hide_when_purchased ?? false,
  quantity_needed: overrides.quantity_needed ?? 1,
  quantity_purchased: overrides.quantity_purchased ?? 0,
  image_url: overrides.image_url ?? null,
  notes: overrides.notes ?? null,
  description: overrides.description ?? null,
  price_label: overrides.price_label ?? null,
  price_amount: overrides.price_amount ?? null,
  priority: overrides.priority ?? 'normal',
  created_at: overrides.created_at ?? null,
  updated_at: overrides.updated_at ?? null,
  sort_order: overrides.sort_order ?? 0,
  metadata_fetch_status: overrides.metadata_fetch_status ?? null,
  metadata_confidence_score: overrides.metadata_confidence_score ?? null,
  metadata_source_method: overrides.metadata_source_method ?? null,
  metadata_retailer: overrides.metadata_retailer ?? null,
  availability: overrides.availability ?? null,
  purchaser_name: overrides.purchaser_name ?? null,
}) as RegistryItem;

describe('registry cards public parity helpers', () => {
  it('falls back to canonical url when imported items lost item_url', () => {
    expect(getRegistryItemPublicUrl(makeItem({ item_url: null, canonical_url: 'https://example.com/canonical' }))).toBe('https://example.com/canonical');
  });

  it('rejects placeholder or non-web registry urls before public rendering', () => {
    expect(getSafePublicRegistryUrl('#')).toBeNull();
    expect(getSafePublicRegistryUrl('javascript:alert(1)')).toBeNull();
    expect(getRegistryItemPublicUrl(makeItem({ item_url: '#', canonical_url: 'mailto:test@example.com' }))).toBeNull();
  });

  it('keeps store group links usable for canonical-only public registry items', () => {
    const groups = groupByStore([
      makeItem({
        id: 'item-1',
        store_name: 'Crate & Barrel',
        item_url: null,
        canonical_url: 'https://example.com/canonical',
      }),
    ]);

    expect(groups).toEqual([
      {
        store: 'Crate & Barrel',
        count: 1,
        available: 1,
        partial: 0,
        purchased: 0,
        url: 'https://example.com/canonical',
      },
    ]);
  });

  it('tracks partial and purchased registry truth separately in store summaries', () => {
    const groups = groupByStore([
      makeItem({ id: 'available', store_name: 'Target', purchase_status: 'available' }),
      makeItem({ id: 'partial', store_name: 'Target', purchase_status: 'partial', quantity_purchased: 1, quantity_needed: 2 }),
      makeItem({ id: 'purchased', store_name: 'Target', purchase_status: 'purchased', quantity_purchased: 1, quantity_needed: 1 }),
    ]);

    expect(groups).toEqual([
      {
        store: 'Target',
        count: 3,
        available: 1,
        partial: 1,
        purchased: 1,
        url: null,
      },
    ]);
  });

  it('does not fall back to template links once live registry data has loaded empty', () => {
    expect(shouldUseLiveRegistryStoreGroups([])).toBe(true);
    expect(shouldUseLiveRegistryStoreGroups(null)).toBe(false);
  });

  it('normalizes contradictory purchase truth before grouping live store summaries', () => {
    expect(normalizeRegistryStoreGroupItems([
      makeItem({ purchase_status: 'purchased', quantity_purchased: 0, quantity_needed: 1, purchaser_name: 'Alex' }),
    ])).toEqual([
      expect.objectContaining({
        purchase_status: 'available',
        quantity_purchased: 0,
        quantity_needed: 1,
        purchaser_name: null,
      }),
    ]);
  });

  it('filters imported placeholder titles before live store summaries render', () => {
    expect(groupByStore([
      makeItem({ id: 'bad-title', item_name: 'Page Not Found', store_name: 'Debug Store', item_url: 'https://example.com/bad' }),
      makeItem({ id: 'good-title', item_name: 'Serving Bowl', store_name: 'Home Store', item_url: 'https://example.com/good' }),
    ])).toEqual([
      {
        store: 'Home Store',
        count: 1,
        available: 1,
        partial: 0,
        purchased: 0,
        url: 'https://example.com/good',
      },
    ]);
  });
});
