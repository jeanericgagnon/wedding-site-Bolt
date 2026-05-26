import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RegistryItem, RegistryPreview } from './registryTypes';
import { derivePurchaseStatus, sanitizeRegistryQuantityState } from './registryTypes';
import {
  createRegistryItem,
  deleteRegistryItem,
  fetchUrlPreview,
  findDuplicateItem,
  mergeDuplicateRegistryItems,
  ownerMarkPurchased,
  publicIncrementPurchase,
  reorderRegistryItems,
  saveRegistryRefreshPolicy,
  updateRegistryItem,
  updateRegistryRefreshBudget,
} from './registryService';
import { MAX_REGISTRY_ITEMS, MAX_REGISTRY_SORT_LOOKUP_ROWS } from './registryQueries';

const mockRpcResult = {
  data: null as unknown,
  error: null as { message: string } | null,
};

const mockSelectResult = {
  data: null as unknown,
  error: null as { message: string } | null,
};

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(() => Promise.resolve(mockRpcResult)),
}));

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
    rpc: rpcMock,
  },
}));

describe('fetchUrlPreview', () => {
  beforeEach(() => {
    rpcMock.mockClear();
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
    await expect(fetchUrlPreview('https://amazon.com/dp/B001')).rejects.toThrow('Couldn’t fill in gift details from that link. You can still add the item by hand.');
  });

  it('throws on network failure', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);
    await expect(fetchUrlPreview('https://amazon.com/dp/B001')).rejects.toThrow('Couldn’t fill in gift details from that link. You can still add the item by hand.');
  });

  it('does not expose raw preview error details to owner-facing callers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve(JSON.stringify({
        error: 'database failed',
        details: 'select * from registry_items with service role',
      })),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(fetchUrlPreview('https://amazon.com/dp/B001')).rejects.toThrow('Couldn’t fill in gift details from that link. You can still add the item by hand.');
    await expect(fetchUrlPreview('https://amazon.com/dp/B001')).rejects.not.toThrow(/database|service role|select \*/i);
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

describe('registry query bounds', () => {
  it('exports a stable public/dashboard registry item cap', () => {
    expect(MAX_REGISTRY_ITEMS).toBe(500);
    expect(MAX_REGISTRY_SORT_LOOKUP_ROWS).toBe(1);
  });

  it('keeps public registry reads bounded across function and fallback paths', () => {
    const serviceSource = readFileSync(join(process.cwd(), 'src/pages/dashboard/registry/registryService.ts'), 'utf8');
    const functionSource = readFileSync(join(process.cwd(), 'supabase/functions/public-registry-items/index.ts'), 'utf8');

    expect(serviceSource).toContain('limit: MAX_REGISTRY_ITEMS,');
    expect(serviceSource).toContain('.limit(MAX_REGISTRY_ITEMS);');
    expect(serviceSource).toContain("supabase.rpc('registry_item_write'");
    expect(serviceSource).toContain("supabase.rpc('registry_duplicate_merge'");
    expect(serviceSource).toContain("supabase.rpc('registry_items_reorder'");
    expect(serviceSource).toContain("supabase.rpc('registry_refresh_policy_write'");
    expect(serviceSource).not.toContain(".from('registry_items')\n    .insert(");
    expect(serviceSource).not.toContain(".from('registry_items')\n    .update({ ...fields, updated_at: new Date().toISOString() })");
    expect(serviceSource).not.toContain("const updates = orderedIds.map");
    expect(functionSource).toContain('Math.min(500, Number(body.limit))');
    expect(functionSource).toContain(') : 500;');
    expect(functionSource).toContain('.limit(limit);');
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

  it('finds duplicate by selected product URL and barcode when present', () => {
    const items = [
      mockItem({
        id: 'item-1',
        barcode: '036000291452',
        selected_product_url: 'https://store.example.com/product',
        canonical_url: null,
        item_url: null,
      }),
    ];

    const duplicate = findDuplicateItem(
      'https://store.example.com/product',
      'Test Product',
      items,
      undefined,
      '036000291452',
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

  it('matches duplicate titles despite punctuation and spacing drift', () => {
    const items = [
      mockItem({
        id: 'item-1',
        item_name: "KitchenAid   Mixer — Matte Black!",
        canonical_url: null,
        item_url: null,
      }),
    ];

    const duplicate = findDuplicateItem(
      'https://different-store.com/product',
      'KitchenAid Mixer Matte Black',
      items,
    );

    expect(duplicate).not.toBeNull();
    expect(duplicate?.id).toBe('item-1');
  });
});

describe('mergeDuplicateRegistryItems', () => {
  it('routes duplicate merges through the protected RPC', async () => {
    mockRpcResult.data = {
      id: 'item-1',
      wedding_site_id: 'site-1',
      item_name: 'Merged gift',
      quantity_needed: 2,
      quantity_purchased: 1,
      purchase_status: 'partial',
    };
    mockRpcResult.error = null;

    const result = await mergeDuplicateRegistryItems('item-1', ['item-2'], {
      item_name: 'Merged gift',
      quantity_needed: 2,
      quantity_purchased: 1,
      purchase_status: 'partial',
    });

    expect(rpcMock).toHaveBeenCalledWith('registry_duplicate_merge', expect.objectContaining({
      p_primary_item_id: 'item-1',
      p_secondary_item_ids: ['item-2'],
      p_payload: expect.objectContaining({
        item_name: 'Merged gift',
        quantity_needed: 2,
      }),
    }));
    expect(result).toEqual(expect.objectContaining({
      id: 'item-1',
      item_name: 'Merged gift',
      quantity_needed: 2,
      quantity_purchased: 1,
    }));
  });
});

describe('ownerMarkPurchased', () => {
  it('uses the increment_registry_purchase RPC so owner and public paths stay consistent', async () => {
    const rpcResultItem = {
      id: 'item-1',
      quantity_purchased: 1,
      quantity_needed: 1,
      purchase_status: 'purchased',
    };
    mockRpcResult.data = rpcResultItem;
    mockRpcResult.error = null;

    const result = await ownerMarkPurchased('item-1', 1);

    expect(result).toStrictEqual(rpcResultItem);
  });

  it('normalizes stale over-purchased RPC responses before returning them', async () => {
    mockRpcResult.data = {
      id: 'item-1',
      quantity_purchased: 4,
      quantity_needed: 2,
      purchase_status: 'partial',
    };
    mockRpcResult.error = null;

    const result = await ownerMarkPurchased('item-1', 1);

    expect(result.quantity_needed).toBe(2);
    expect(result.quantity_purchased).toBe(2);
    expect(result.purchase_status).toBe('purchased');
  });
});

describe('registry owner write RPCs', () => {
  beforeEach(() => {
    rpcMock.mockClear();
    mockRpcResult.data = null;
    mockRpcResult.error = null;
  });

  it('routes refresh budget writes through the registry policy RPC', async () => {
    await expect(updateRegistryRefreshBudget('site-1', {
      registry_monthly_refresh_count: 4,
      registry_monthly_refresh_month: '2026-05',
    })).resolves.toBeUndefined();

    expect(rpcMock).toHaveBeenCalledWith('registry_refresh_policy_write', {
      p_wedding_site_id: 'site-1',
      p_patch: {
        registry_monthly_refresh_count: 4,
        registry_monthly_refresh_month: '2026-05',
      },
    });
  });

  it('routes registry policy writes through the registry policy RPC', async () => {
    await expect(saveRegistryRefreshPolicy('site-1', {
      registry_auto_refresh_enabled: false,
      registry_refresh_include_purchased: true,
    })).resolves.toBeUndefined();

    expect(rpcMock).toHaveBeenCalledWith('registry_refresh_policy_write', {
      p_wedding_site_id: 'site-1',
      p_patch: {
        registry_auto_refresh_enabled: false,
        registry_refresh_include_purchased: true,
      },
    });
  });

  it('routes registry item create through the item write RPC', async () => {
    mockRpcResult.data = {
      id: 'item-1',
      wedding_site_id: 'site-1',
      item_name: 'Mixer',
      quantity_needed: 1,
      quantity_purchased: 0,
      purchase_status: 'available',
    };

    await expect(createRegistryItem('site-1', { item_name: 'Mixer' })).resolves.toEqual(expect.objectContaining({
      id: 'item-1',
      item_name: 'Mixer',
    }));

    expect(rpcMock).toHaveBeenCalledWith('registry_item_write', {
      p_wedding_site_id: 'site-1',
      p_item_id: null,
      p_payload: expect.objectContaining({
        item_name: 'Mixer',
        quantity_needed: 1,
        quantity_purchased: 0,
        purchase_status: 'available',
        hide_when_purchased: false,
        priority: 'medium',
      }),
    });
  });

  it('routes registry item update through the item write RPC', async () => {
    mockRpcResult.data = {
      id: 'item-1',
      wedding_site_id: 'site-1',
      item_name: 'Updated Mixer',
      quantity_needed: 1,
      quantity_purchased: 0,
      purchase_status: 'available',
    };

    await expect(updateRegistryItem('item-1', { item_name: 'Updated Mixer' })).resolves.toEqual(expect.objectContaining({
      id: 'item-1',
      item_name: 'Updated Mixer',
    }));

    expect(rpcMock).toHaveBeenCalledWith('registry_item_write', {
      p_wedding_site_id: null,
      p_item_id: 'item-1',
      p_payload: { item_name: 'Updated Mixer' },
    });
  });

  it('routes registry item delete through the delete RPC', async () => {
    await expect(deleteRegistryItem('item-1')).resolves.toBeUndefined();

    expect(rpcMock).toHaveBeenCalledWith('registry_item_delete', {
      p_item_id: 'item-1',
    });
  });

  it('routes registry reorder through the reorder RPC', async () => {
    await expect(reorderRegistryItems('site-1', ['item-2', 'item-1'])).resolves.toBeUndefined();

    expect(rpcMock).toHaveBeenCalledWith('registry_items_reorder', {
      p_wedding_site_id: 'site-1',
      p_ordered_ids: ['item-2', 'item-1'],
    });
  });
});

describe('publicIncrementPurchase', () => {
  it('normalizes stale RPC quantity/status data for the guest-facing claim path too', async () => {
    mockRpcResult.data = {
      id: 'item-1',
      quantity_purchased: 9,
      quantity_needed: 3,
      purchase_status: 'partial',
      purchaser_name: 'Alex',
    };
    mockRpcResult.error = null;

    const result = await publicIncrementPurchase('item-1', 'Alex');

    expect(result.quantity_needed).toBe(3);
    expect(result.quantity_purchased).toBe(3);
    expect(result.purchase_status).toBe('purchased');
    expect(result.purchaser_name).toBe('Alex');
  });
});

describe('purchase status logic', () => {
  it('status is available when quantity_purchased is 0', () => {
    expect(derivePurchaseStatus(0, 2)).toBe('available');
  });

  it('status is partial when some but not all purchased', () => {
    expect(derivePurchaseStatus(1, 3)).toBe('partial');
  });

  it('status is purchased when quantity_purchased meets quantity_needed', () => {
    expect(derivePurchaseStatus(2, 2)).toBe('purchased');
  });

  it('status is purchased when quantity_purchased exceeds quantity_needed', () => {
    expect(derivePurchaseStatus(3, 2)).toBe('purchased');
  });

  it('sanitizes impossible quantity states before they leak into UI logic', () => {
    expect(sanitizeRegistryQuantityState(5, 2)).toEqual({
      quantityNeeded: 2,
      quantityPurchased: 2,
      purchaseStatus: 'purchased',
    });

    expect(sanitizeRegistryQuantityState(-3, 0)).toEqual({
      quantityNeeded: 1,
      quantityPurchased: 0,
      purchaseStatus: 'available',
    });
  });
});
