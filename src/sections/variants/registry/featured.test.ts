import { describe, expect, it } from 'vitest';
import { getRegistryItemPublicUrl, groupRegistryStoreLinks, registryFeaturedSchema } from './featured';
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

describe('registry featured public parity helpers', () => {
  it('falls back to canonical urls for public featured links', () => {
    expect(getRegistryItemPublicUrl(makeItem({ item_url: null, canonical_url: 'https://example.com/canonical' }))).toBe('https://example.com/canonical');
  });

  it('derives live store links from canonical-only imported registry items', () => {
    expect(groupRegistryStoreLinks([
      makeItem({ id: '1', store_name: 'Crate & Barrel', item_url: null, canonical_url: 'https://example.com/cb' }),
      makeItem({ id: '2', store_name: 'Crate & Barrel', item_url: 'https://example.com/direct', canonical_url: null }),
      makeItem({ id: '3', store_name: 'Target', item_url: null, canonical_url: 'https://example.com/target' }),
    ])).toEqual([
      { id: '1', store: 'Crate & Barrel', url: 'https://example.com/cb', description: '' },
      { id: '3', store: 'Target', url: 'https://example.com/target', description: '' },
    ]);
  });

  it('maps partial purchase state into public featured gift truth', () => {
    const parsed = registryFeaturedSchema.parse({
      featuredGifts: [
        {
          id: 'gift-1',
          name: 'Mixer',
          isPartiallyClaimed: true,
        },
      ],
    });

    expect(parsed.featuredGifts[0]?.isPartiallyClaimed).toBe(true);
    expect(parsed.featuredGifts[0]?.isClaimed).toBe(false);
  });

  it('keeps hero featured gifts schema-compatible with partial purchase state', () => {
    const parsed = registryFeaturedSchema.parse({
      layout: 'hero',
      featuredGifts: [
        {
          id: 'gift-hero',
          name: 'Stand Mixer',
          isPartiallyClaimed: true,
          url: 'https://example.com/mixer',
        },
      ],
    });

    expect(parsed.layout).toBe('hero');
    expect(parsed.featuredGifts[0]?.isPartiallyClaimed).toBe(true);
  });
});
