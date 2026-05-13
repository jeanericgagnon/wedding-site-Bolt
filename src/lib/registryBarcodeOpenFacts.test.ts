import { describe, expect, it } from 'vitest';

import { buildOpenFactsLookupProduct } from './registryBarcodeOpenFacts';

describe('buildOpenFactsLookupProduct', () => {
  it('builds an Open Products Facts match from the shared API payload shape', () => {
    const match = buildOpenFactsLookupProduct({
      barcode: '1234567890123',
      flavor: {
        host: 'world.openproductsfacts.org',
        provider: 'open_products_facts',
        label: 'Open Products Facts',
      },
      payload: {
        product: {
          product_name: 'Air Purifier Filter',
          brands: 'DayOf Home',
          image_front_url: 'https://example.com/filter.jpg',
          categories: 'Home, Filters',
          stores: 'DayOf Hardware',
        },
      },
    });

    expect(match).toMatchObject({
      title: 'Air Purifier Filter',
      brand: 'DayOf Home',
      provider: 'open_products_facts',
      selected_retailer: 'DayOf Hardware',
      provider_path: ['open_products_facts'],
    });
    expect(match?.product_url).toContain('world.openproductsfacts.org/product/1234567890123');
    expect(match?.retailer_options[0]?.is_best_match).toBe(true);
  });

  it('falls back to the flavor label when store metadata is missing', () => {
    const match = buildOpenFactsLookupProduct({
      barcode: '3560070791460',
      flavor: {
        host: 'world.openbeautyfacts.org',
        provider: 'open_beauty_facts',
        label: 'Open Beauty Facts',
      },
      payload: {
        product: {
          product_name: 'Hydrating Serum',
          image_url: 'https://example.com/serum.jpg',
        },
      },
    });

    expect(match?.selected_retailer).toBe('Open Beauty Facts');
    expect(match?.provider_path).toEqual(['open_beauty_facts']);
  });

  it('returns null when the shared payload has no usable title', () => {
    const match = buildOpenFactsLookupProduct({
      barcode: '7613035974685',
      flavor: {
        host: 'world.openpetfoodfacts.org',
        provider: 'open_pet_food_facts',
        label: 'Open Pet Food Facts',
      },
      payload: {
        product: {
          brands: 'DayOf Pets',
        },
      },
    });

    expect(match).toBeNull();
  });
});
