import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RegistryItem, RegistryPreview } from './registryTypes';
import { fetchUrlPreview, findDuplicateItem } from './registryService';

const mockRpcResult = {
  data: null as unknown,
  error: null as { message: string } | null,
};

const mockSelectResult = {
  data: null as unknown,
  error: null as { message: string } | null,
};

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: 'test-token' } },
        error: null,
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(() => mockSelectResult),
      maybeSingle: vi.fn(() => mockSelectResult),
      then: vi.fn((cb: (v: typeof mockSelectResult) => unknown) => Promise.resolve(cb(mockSelectResult))),
    })),
    rpc: vi.fn(() => Promise.resolve(mockRpcResult)),
  },
}));

describe('fetchUrlPreview', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    // env vars are accessed via import.meta.env in the service
  });

  it('returns preview data on success', async () => {
    const preview: RegistryPreview = {
      title: 'KitchenAid Mixer',
      price_label: '$399.99',
      price_amount: 399.99,
      image_url: 'https://example.com/img.jpg',
      merchant: 'amazon.com',
      canonical_url: 'https://amazon.com/dp/B001',
      description: null,
      currency: null,
      availability: null,
      brand: null,
      retailer: null,
      confidence_score: null,
      source_method: null,
      fetch_status: null,
      error: null,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(preview),
    });
    vi.stubGlobal('fetch', mockFetch);
    const result = await fetchUrlPreview('https://amazon.com/dp/B001');

    expect(result.title).toBe('KitchenAid Mixer');
    expect(result.price_amount).toBe(399.99);
    expect(result.error).toBeNull();
  });

  it('throws on non-ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limit exceeded'),
    });
    vi.stubGlobal('fetch', mockFetch);
    await expect(fetchUrlPreview('https://amazon.com/dp/B001')).rejects.toThrow();
  });

  it('throws on network failure', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);
    await expect(fetchUrlPreview('https://amazon.com/dp/B001')).rejects.toThrow('Network error');
  });

  it('returns error field when fetch fails gracefully', async () => {
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
      retailer: null,
      confidence_score: null,
      source_method: null,
      fetch_status: 'error',
      error: 'Could not fetch page',
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(preview),
    });
    vi.stubGlobal('fetch', mockFetch);
    const result = await fetchUrlPreview('https://amazon.com/dp/B001');

    expect(result.error).toBe('Could not fetch page');
    expect(result.title).toBeNull();
  });
});

describe('findDuplicateItem', () => {
  const mockItem = (overrides: Partial<RegistryItem>): RegistryItem => ({
    id: 'item-1',
    wedding_site_id: 'site-1',
    item_name: 'Test Product',
    price_label: null,
    price_amount: null,
    store_name: null,
    merchant: null,
    item_url: 'https://example.com/product',
    canonical_url: 'https://example.com/product',
    image_url: null,
    description: null,
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
    ...overrides,
  });

  it('finds duplicate by canonical URL', () => {
    const items = [
      mockItem({ id: 'item-1', canonical_url: 'https://target.com/p/-/A-12345678' }),
      mockItem({ id: 'item-2', canonical_url: 'https://amazon.com/dp/B07XYZ1234' }),
    ];

    const duplicate = findDuplicateItem(
      'https://target.com/p/-/A-12345678',
      'Different Title',
      items
    );

    expect(duplicate).not.toBeNull();
    expect(duplicate?.id).toBe('item-1');
  });

  it('finds duplicate by item URL when canonical is missing', () => {
    const items = [
      mockItem({
        id: 'item-1',
        item_url: 'https://example.com/product',
        canonical_url: null,
      }),
    ];

    const duplicate = findDuplicateItem(
      'https://example.com/product',
      'Test Product',
      items
    );

    expect(duplicate).not.toBeNull();
    expect(duplicate?.id).toBe('item-1');
  });

  it('finds duplicate by title when URLs differ', () => {
    const items = [
      mockItem({
        id: 'item-1',
        item_name: 'GreenPan Rio Advanced 8" Ceramic Nonstick Fry Pan',
        item_url: 'https://target.com/p/product-a/-/A-12345678',
      }),
    ];

    const duplicate = findDuplicateItem(
      'https://different-store.com/product',
      'GreenPan Rio Advanced 8" Ceramic Nonstick Fry Pan',
      items
    );

    expect(duplicate).not.toBeNull();
    expect(duplicate?.id).toBe('item-1');
  });

  it('excludes item by ID', () => {
    const items = [
      mockItem({ id: 'item-1', canonical_url: 'https://target.com/p/-/A-12345678' }),
    ];

    const duplicate = findDuplicateItem(
      'https://target.com/p/-/A-12345678',
      'Test Product',
      items,
      'item-1'
    );

    expect(duplicate).toBeNull();
  });

  it('returns null when no duplicate found', () => {
    const items = [
      mockItem({ id: 'item-1', canonical_url: 'https://target.com/p/-/A-12345678' }),
    ];

    const duplicate = findDuplicateItem(
      'https://target.com/p/-/A-87654321',
      'Different Product',
      items
    );

    expect(duplicate).toBeNull();
  });

  it('handles case-insensitive matching', () => {
    const items = [
      mockItem({
        id: 'item-1',
        item_name: 'Test Product',
        canonical_url: 'https://EXAMPLE.COM/Product',
      }),
    ];

    const duplicate = findDuplicateItem(
      'https://example.com/product',
      'test product',
      items
    );

    expect(duplicate).not.toBeNull();
    expect(duplicate?.id).toBe('item-1');
  });
});

describe('purchase status logic', () => {
  it('status is available when quantity_purchased is 0', () => {
    const item = { quantity_purchased: 0, quantity_needed: 2 };
    const status = item.quantity_purchased === 0
      ? 'available'
      : item.quantity_purchased >= item.quantity_needed
      ? 'purchased'
      : 'partial';
    expect(status).toBe('available');
  });

  it('status is partial when some but not all purchased', () => {
    const item = { quantity_purchased: 1, quantity_needed: 3 };
    const status = item.quantity_purchased === 0
      ? 'available'
      : item.quantity_purchased >= item.quantity_needed
      ? 'purchased'
      : 'partial';
    expect(status).toBe('partial');
  });

  it('status is purchased when quantity_purchased meets quantity_needed', () => {
    const item = { quantity_purchased: 2, quantity_needed: 2 };
    const status = item.quantity_purchased === 0
      ? 'available'
      : item.quantity_purchased >= item.quantity_needed
      ? 'purchased'
      : 'partial';
    expect(status).toBe('purchased');
  });

  it('status is purchased when quantity_purchased exceeds quantity_needed', () => {
    const item = { quantity_purchased: 3, quantity_needed: 2 };
    const status = item.quantity_purchased === 0
      ? 'available'
      : item.quantity_purchased >= item.quantity_needed
      ? 'purchased'
      : 'partial';
    expect(status).toBe('purchased');
  });
});
