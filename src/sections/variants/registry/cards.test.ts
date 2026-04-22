import { describe, expect, it } from 'vitest';
import { getRegistryItemPublicUrl, groupByStore, shouldUseLiveRegistryStoreGroups } from './cards';
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
  quantity_remaining: overrides.quantity_remaining ?? 1,
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
  purchased_at: overrides.purchased_at ?? null,
  claimed_by_user_id: overrides.claimed_by_user_id ?? null,
}) as RegistryItem;

describe('registry cards public parity helpers', () => {
  it('falls back to canonical url when imported items lost item_url', () => {
    expect(getRegistryItemPublicUrl(makeItem({ item_url: null, canonical_url: 'https://example.com/canonical' }))).toBe('https://example.com/canonical');
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
      makeItem({ id: 'partial', store_name: 'Target', purchase_status: 'partial' }),
      makeItem({ id: 'purchased', store_name: 'Target', purchase_status: 'purchased' }),
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
});
