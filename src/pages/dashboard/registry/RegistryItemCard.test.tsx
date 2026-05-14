import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getOwnerRegistryPurchaserLabel, getOwnerRegistrySourceLabel, normalizeOwnerRegistryItemState, RegistryItemCard } from './RegistryItemCard';
import type { RegistryItem } from './registryTypes';

function makeItem(overrides: Partial<RegistryItem> = {}): RegistryItem {
  return {
    id: 'item-1',
    wedding_site_id: 'site-1',
    item_name: 'KitchenAid Mixer',
    price_label: '$399.99',
    price_amount: 399.99,
    store_name: 'Amazon',
    merchant: 'amazon.com',
    item_url: null,
    canonical_url: null,
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
  };
}

describe('RegistryItemCard', () => {
  it('uses canonical_url for the View link when item_url is missing', () => {
    render(
      <RegistryItemCard
        item={makeItem({ canonical_url: 'https://example.com/canonical-product' })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute('href', 'https://example.com/canonical-product');
  });

  it('uses the built-in placeholder instead of a third-party page preview when image_url is missing', () => {
    render(
      <RegistryItemCard
        item={makeItem({ canonical_url: 'https://example.com/canonical-product' })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByRole('img', { name: /kitchenaid mixer/i })).not.toBeInTheDocument();
    expect(screen.getByText('Needs image')).toBeInTheDocument();
  });

  it('falls back to the built-in placeholder after direct image failure', () => {
    render(
      <RegistryItemCard
        item={makeItem({
          image_url: 'https://example.com/direct-image.jpg',
          canonical_url: 'https://example.com/canonical-product',
        })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const image = screen.getByRole('img', { name: /kitchenaid mixer/i }) as HTMLImageElement;
    fireEvent.error(image);

    expect(screen.queryByRole('img', { name: /kitchenaid mixer/i })).not.toBeInTheDocument();
    expect(screen.getByText('Product image')).toBeInTheDocument();
  });

  it('keeps owner purchaser labels aligned with actual purchase state', () => {
    expect(getOwnerRegistryPurchaserLabel(makeItem({ purchase_status: 'available', purchaser_name: 'Alex' }))).toBeNull();
    expect(getOwnerRegistryPurchaserLabel(makeItem({ purchase_status: 'partial', purchaser_name: 'Alex' }))).toBe('by Alex');
    expect(getOwnerRegistryPurchaserLabel(makeItem({ purchase_status: 'purchased', purchaser_name: 'Alex' }))).toBe('Purchased by Alex');
  });

  it('normalizes contradictory owner purchase state before rendering card truth', () => {
    expect(normalizeOwnerRegistryItemState(makeItem({
      purchase_status: 'purchased',
      quantity_purchased: 0,
      quantity_needed: 1,
      purchaser_name: 'Alex',
    }))).toEqual(expect.objectContaining({
      purchase_status: 'available',
      purchaser_name: null,
      quantity_purchased: 0,
      quantity_needed: 1,
    }));
  });

  it('drops unsafe owner registry links and image URLs before rendering', () => {
    const normalized = normalizeOwnerRegistryItemState(makeItem({
      item_url: 'javascript:alert(1)',
      canonical_url: 'ftp://example.com/gift',
      image_url: 'javascript:alert(1)',
      fund_venmo_url: 'javascript:alert(1)',
      fund_paypal_url: 'data:text/html,<script>alert(1)</script>',
      fund_custom_url: 'https://example.com/contribute',
      item_type: 'cash_fund',
    }));

    expect(normalized).toEqual(expect.objectContaining({
      item_url: null,
      canonical_url: null,
      image_url: null,
      fund_venmo_url: null,
      fund_paypal_url: null,
      fund_custom_url: 'https://example.com/contribute',
    }));
  });

  it('does not render javascript links for owner cash-fund actions', () => {
    const { container } = render(
      <RegistryItemCard
        item={makeItem({
          item_type: 'cash_fund',
          fund_venmo_url: 'javascript:alert(1)',
          fund_paypal_url: 'https://paypal.me/dayof',
          fund_custom_url: 'data:text/html,<script>alert(1)</script>',
        })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(container.querySelector('a[href^="javascript:"]')).not.toBeInTheDocument();
    expect(container.querySelector('a[href^="data:"]')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /paypal/i })).toHaveAttribute('href', 'https://paypal.me/dayof');
  });

  it('hides unsafe owner product links from the View action', () => {
    render(
      <RegistryItemCard
        item={makeItem({ item_url: 'javascript:alert(1)', canonical_url: 'https://example.com/safe' })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute('href', 'https://example.com/safe');
  });

  it('passes normalized purchase truth into owner actions', async () => {
    const onEdit = vi.fn();
    const onMarkPurchased = vi.fn(async () => {});

    render(
      <RegistryItemCard
        item={makeItem({ purchase_status: 'purchased', quantity_purchased: 0, quantity_needed: 1, purchaser_name: 'Alex' })}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onMarkPurchased={onMarkPurchased}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ purchase_status: 'available', purchaser_name: null }));
  });

  it('offers a quick reset for purchased owner state', async () => {
    const onResetPurchaseState = vi.fn(async () => {});

    render(
      <RegistryItemCard
        item={makeItem({ purchase_status: 'purchased', quantity_purchased: 1, quantity_needed: 1, purchaser_name: 'Alex' })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onResetPurchaseState={onResetPurchaseState}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /clear purchase state/i }));
    expect(onResetPurchaseState).toHaveBeenCalledWith(expect.objectContaining({
      purchase_status: 'purchased',
      purchaser_name: 'Alex',
    }));
  });

  it('keeps stale details guidance visible when persisted metadata check time is invalid', () => {
    render(
      <RegistryItemCard
        item={makeItem({ metadata_last_checked_at: 'not-a-date' })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Check details')).toBeInTheDocument();
  });

  it('maps raw metadata source methods into owner-friendly labels', () => {
    expect(getOwnerRegistrySourceLabel('adapter')).toBe('Imported from store page');
    expect(getOwnerRegistrySourceLabel('jsonld')).toBe('Imported from product data');
    expect(getOwnerRegistrySourceLabel('opengraph')).toBe('Imported from page preview');
    expect(getOwnerRegistrySourceLabel('heuristic')).toBe('Imported with partial details');
    expect(getOwnerRegistrySourceLabel('manual')).toBe('Details entered by you');
    expect(getOwnerRegistrySourceLabel(null)).toBeNull();
  });

  it('shows sync parity details when a gift has stale pricing or retries queued', () => {
    render(
      <RegistryItemCard
        item={makeItem({
          metadata_last_checked_at: '2026-05-10T00:00:00.000Z',
          next_refresh_at: '2026-05-15T00:00:00.000Z',
          previous_price_amount: 450,
          price_amount: 399.99,
          refresh_fail_count: 2,
        })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText(/checked may/i)).toBeInTheDocument();
    expect(screen.getByText(/price moved from \$450\.00 to \$399\.99/i)).toBeInTheDocument();
    expect(screen.getByText(/2 retries are queued for this gift/i)).toBeInTheDocument();
  });
});
