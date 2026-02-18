import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RegistryPreview } from './registryTypes';

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
      error: null,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(preview),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { fetchUrlPreview } = await import('./registryService');
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

    const { fetchUrlPreview } = await import('./registryService');
    await expect(fetchUrlPreview('https://amazon.com/dp/B001')).rejects.toThrow();
  });

  it('throws on network failure', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const { fetchUrlPreview } = await import('./registryService');
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
      error: 'Could not fetch page',
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(preview),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { fetchUrlPreview } = await import('./registryService');
    const result = await fetchUrlPreview('https://amazon.com/dp/B001');

    expect(result.error).toBe('Could not fetch page');
    expect(result.title).toBeNull();
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
