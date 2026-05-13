import { describe, expect, it } from 'vitest';

import { mergeRegistryBarcodeProducts } from './registryBarcodeMatch';

describe('mergeRegistryBarcodeProducts', () => {
  it('merges provider matches into one stronger product with best-price retailer choice', () => {
    const merged = mergeRegistryBarcodeProducts([
      {
        title: 'Scanned Bowl',
        brand: 'DayOf',
        image_url: null,
        category: 'Kitchen',
        description: null,
        estimated_price_cents: null,
        currency: 'USD',
        product_url: 'https://store-a.example.com/bowl',
        selected_retailer: 'Store A',
        provider: 'open_food_facts',
        confidence_score: 62,
        provider_path: ['open_food_facts'],
        retailer_options: [
          { label: 'Store A', url: 'https://store-a.example.com/bowl', price_cents: 7200, currency: 'USD', is_best_match: true },
        ],
        raw_payload: { provider: 'open_food_facts' },
      },
      {
        title: 'Scanned Bowl',
        brand: 'DayOf',
        image_url: 'https://cdn.example.com/bowl.jpg',
        category: 'Kitchen',
        description: 'A nice bowl',
        estimated_price_cents: 6400,
        currency: 'USD',
        product_url: 'https://store-b.example.com/bowl',
        selected_retailer: 'Store B',
        provider: 'upcitemdb',
        confidence_score: 84,
        provider_path: ['upcitemdb'],
        retailer_options: [
          { label: 'Store B', url: 'https://store-b.example.com/bowl', price_cents: 6400, currency: 'USD' },
        ],
        raw_payload: { provider: 'upcitemdb' },
      },
    ]);

    expect(merged).not.toBeNull();
    expect(merged?.title).toBe('Scanned Bowl');
    expect(merged?.image_url).toBe('https://cdn.example.com/bowl.jpg');
    expect(merged?.selected_retailer).toBe('Store B');
    expect(merged?.product_url).toBe('https://store-b.example.com/bowl');
    expect(merged?.estimated_price_cents).toBe(6400);
    expect(merged?.provider_path).toEqual(['upcitemdb', 'open_food_facts']);
    expect(merged?.retailer_options[0]).toEqual(expect.objectContaining({
      label: 'Store B',
      price_cents: 6400,
      is_best_match: true,
    }));
    expect(merged?.confidence_score).toBeGreaterThan(84);
  });

  it('keeps confidence review-friendly when providers disagree on the title', () => {
    const merged = mergeRegistryBarcodeProducts([
      {
        title: 'First Guess',
        brand: 'DayOf',
        image_url: null,
        category: null,
        description: null,
        estimated_price_cents: null,
        currency: 'USD',
        product_url: 'https://store-a.example.com/product',
        selected_retailer: 'Store A',
        provider: 'open_food_facts',
        confidence_score: 74,
        provider_path: ['open_food_facts'],
        retailer_options: [],
        raw_payload: null,
      },
      {
        title: 'Completely Different Product',
        brand: 'DayOf',
        image_url: 'https://cdn.example.com/product.jpg',
        category: null,
        description: null,
        estimated_price_cents: 6400,
        currency: 'USD',
        product_url: 'https://store-b.example.com/product',
        selected_retailer: 'Store B',
        provider: 'upcitemdb',
        confidence_score: 78,
        provider_path: ['upcitemdb'],
        retailer_options: [],
        raw_payload: null,
      },
    ]);

    expect(merged).not.toBeNull();
    expect(merged?.confidence_score).toBeLessThan(78);
    expect(merged?.provider_path).toEqual(['upcitemdb', 'open_food_facts']);
  });
});
