import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  REGISTRY_PURCHASE_MEMORY_RETENTION_MS,
  RegistryFundHighlight,
  RegistryGrid,
  RegistrySection,
  readRegistryPurchaseMemory,
  rememberRegistryPurchase,
  safePublicRegistryPurchaseError,
  sanitizePublicRegistryItems,
} from './RegistrySection';
import type { SectionInstance } from '../../types/layoutConfig';
import { createEmptyWeddingData } from '../../types/weddingData';
import type { RegistryItem } from '../../pages/dashboard/registry/registryTypes';

function makeInstance(settings: SectionInstance['settings'], bindings?: SectionInstance['bindings']): SectionInstance {
  return {
    id: 'registry-1',
    type: 'registry',
    enabled: true,
    variant: 'default',
    settings,
    bindings,
  };
}

describe('RegistrySection', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = 'dayof_registry_purchases_v1=; Max-Age=0; Path=/; SameSite=Lax';
    vi.useRealTimers();
  });

  it('filters broken imported product metadata before guest-facing registry display', () => {
    const baseItem: RegistryItem = {
      id: 'item-1',
      wedding_site_id: 'site-1',
      item_type: 'product',
      item_name: 'DayOf QA Ceramic Serving Bowl',
      price_label: '$64.00',
      price_amount: 64,
      store_name: 'DayOf QA Store',
      merchant: 'DayOf QA Store',
      item_url: 'https://example.com/gift',
      canonical_url: 'https://example.com/gift',
      image_url: 'https://images.example.com/gift.jpg',
      description: null,
      notes: null,
      quantity_needed: 1,
      quantity_purchased: 0,
      purchaser_name: null,
      purchase_status: 'available',
      hide_when_purchased: false,
      sort_order: 0,
      priority: 'medium',
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
    };

    const sanitized = sanitizePublicRegistryItems([
      baseItem,
      {
        ...baseItem,
        id: 'bad-title',
        item_name: 'Page Not Found',
      },
      {
        ...baseItem,
        id: 'bad-image',
        item_name: 'Amazon.com: Still a real gift &amp; keepsake',
        merchant: 'A Co',
        store_name: 'A Co',
        image_url: 'https://image.thum.io/get/width/900/crop/700/https%3A%2F%2Fexample.com%2Fblocked',
      },
      {
        ...baseItem,
        id: 'generic-fallback',
        item_name: 'Gift from amazon.com',
      },
    ]);

    expect(sanitized.map((item) => item.id)).toEqual(['item-1', 'bad-image']);
    expect(sanitized.find((item) => item.id === 'bad-image')?.image_url).toBeNull();
    expect(sanitized.find((item) => item.id === 'bad-image')?.item_name).toBe('Still a real gift & keepsake');
    expect(sanitized.find((item) => item.id === 'bad-image')?.merchant).toBeNull();
  });

  it('sanitizes live item and cash-fund URLs before guest-facing registry display', () => {
    const baseItem: RegistryItem = {
      id: 'item-1',
      wedding_site_id: 'site-1',
      item_type: 'product',
      item_name: 'Dinner plates',
      price_label: '$80.00',
      price_amount: 80,
      store_name: 'Home Store',
      merchant: 'Home Store',
      item_url: 'javascript:alert(1)',
      canonical_url: 'https://example.com/dinner-plates',
      image_url: '/preview-photos/header-anchor.jpg',
      description: null,
      notes: null,
      quantity_needed: 1,
      quantity_purchased: 0,
      purchaser_name: null,
      purchase_status: 'available',
      hide_when_purchased: false,
      sort_order: 0,
      priority: 'medium',
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
    };

    const sanitized = sanitizePublicRegistryItems([
      baseItem,
      {
        ...baseItem,
        id: 'cash-1',
        item_type: 'cash_fund',
        item_name: 'Honeymoon fund',
        item_url: null,
        canonical_url: null,
        image_url: 'https://image.thum.io/get/https://example.com',
        fund_venmo_url: 'javascript:alert(1)',
        fund_paypal_url: 'ftp://example.com/paypal',
        fund_custom_url: 'https://example.com/honeymoon',
        fund_custom_label: 'Contribute',
      },
    ]);

    expect(sanitized.find((item) => item.id === 'item-1')?.item_url).toBeNull();
    expect(sanitized.find((item) => item.id === 'item-1')?.canonical_url).toBe('https://example.com/dinner-plates');
    expect(sanitized.find((item) => item.id === 'item-1')?.image_url).toBe('/preview-photos/header-anchor.jpg');
    expect(sanitized.find((item) => item.id === 'cash-1')?.image_url).toBeNull();
    expect(sanitized.find((item) => item.id === 'cash-1')?.fund_venmo_url).toBeNull();
    expect(sanitized.find((item) => item.id === 'cash-1')?.fund_paypal_url).toBeNull();
    expect(sanitized.find((item) => item.id === 'cash-1')?.fund_custom_url).toBe('https://example.com/honeymoon');
  });

  it('renders registry fallback content without bindings present across variants', () => {
    const data = createEmptyWeddingData();
    data.registry = {
      links: [
        { id: 'registry-link-1', label: 'Crate & Barrel', url: 'https://example.com/registry' },
      ],
      notes: 'Your love and support means the world.',
    };

    const { rerender } = render(
      <RegistrySection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Registry')).toBeInTheDocument();
    expect(screen.getByText('Crate & Barrel')).toBeInTheDocument();

    rerender(
      <RegistryGrid
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getAllByText('Registry').length).toBeGreaterThan(0);
    expect(screen.getByText('Open registry')).toBeInTheDocument();

    rerender(
      <RegistryFundHighlight
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getAllByText('Registry').length).toBeGreaterThan(0);
    expect(screen.getByText('Featured fund')).toBeInTheDocument();
  });

  it('hides unsafe fallback registry links across variants', () => {
    const data = createEmptyWeddingData();
    data.registry = {
      links: [
        { id: 'unsafe-1', label: 'Unsafe registry', url: 'javascript:alert(1)' },
        { id: 'unsafe-2', label: 'Unsafe protocol', url: 'ftp://example.com/registry' },
        { id: 'safe-1', label: 'Safe registry', url: 'https://example.com/registry' },
      ],
      notes: '',
    };

    const { container, rerender } = render(
      <RegistrySection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Safe registry')).toBeInTheDocument();
    expect(screen.queryByText('Unsafe registry')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('javascript:alert');

    rerender(
      <RegistryGrid
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Safe registry')).toBeInTheDocument();
    expect(screen.queryByText('Unsafe protocol')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('ftp://example.com/registry');

    rerender(
      <RegistryFundHighlight
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Safe registry')).toBeInTheDocument();
    expect(screen.queryByText('Unsafe registry')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('javascript:alert');
  });

  it('keeps default titles visible when no registry links exist', () => {
    const data = createEmptyWeddingData();

    const { rerender } = render(
      <RegistrySection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Registry')).toBeInTheDocument();

    rerender(
      <RegistryGrid
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Registry')).toBeInTheDocument();

    rerender(
      <RegistryFundHighlight
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Registry')).toBeInTheDocument();
  });

  it('keeps public purchase failure copy free of backend details', () => {
    const message = safePublicRegistryPurchaseError();

    expect(message).toBe('Could not save that purchase right now. Please try again.');
    expect(message).not.toMatch(/database|provider|storage|bucket|token|policy|service role|permission/i);
  });

  it('wraps public registry purchase memory in a timestamped bounded envelope', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T20:00:00.000Z'));

    const ids = Array.from({ length: 90 }, (_, index) => `gift-${index}`);
    window.localStorage.setItem('dayof_registry_purchase_memory_v1', JSON.stringify(ids));

    expect(readRegistryPurchaseMemory()).toEqual(ids.slice(-80));
    expect(JSON.parse(window.localStorage.getItem('dayof_registry_purchase_memory_v1') || '{}')).toMatchObject({
      savedAtISO: '2026-05-06T20:00:00.000Z',
      ids: ids.slice(-80),
    });

    const next = rememberRegistryPurchase('  gift-new  ');
    expect(next.at(-1)).toBe('gift-new');
    expect(JSON.parse(window.localStorage.getItem('dayof_registry_purchase_memory_v1') || '{}')).toMatchObject({
      savedAtISO: '2026-05-06T20:00:00.000Z',
    });
    expect(document.cookie).toContain('dayof_registry_purchases_v1=');
  });

  it('clears stale or malformed public registry purchase memory', () => {
    const staleDate = new Date(Date.now() - REGISTRY_PURCHASE_MEMORY_RETENTION_MS - 1000).toISOString();
    window.localStorage.setItem('dayof_registry_purchase_memory_v1', JSON.stringify({
      savedAtISO: staleDate,
      ids: ['gift-1'],
    }));

    expect(readRegistryPurchaseMemory()).toEqual([]);
    expect(window.localStorage.getItem('dayof_registry_purchase_memory_v1')).toBeNull();

    window.localStorage.setItem('dayof_registry_purchase_memory_v1', '{broken');
    expect(readRegistryPurchaseMemory()).toEqual([]);
    expect(window.localStorage.getItem('dayof_registry_purchase_memory_v1')).toBeNull();
  });
});
