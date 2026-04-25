import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getOwnerRegistryPurchaserLabel, normalizeOwnerRegistryItemState, RegistryItemCard } from './RegistryItemCard';
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

  it('falls back to a canonical page preview image when image_url and item_url are missing', () => {
    render(
      <RegistryItemCard
        item={makeItem({ canonical_url: 'https://example.com/canonical-product' })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const image = screen.getByRole('img', { name: /kitchenaid mixer/i });
    expect(image).toHaveAttribute('src', expect.stringContaining(encodeURIComponent('https://example.com/canonical-product')));
  });

  it('tries canonical page preview after direct image failure when no item_url exists', () => {
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
    fireEvent.error(image);

    expect(image.getAttribute('src')).toContain(encodeURIComponent('https://example.com/canonical-product'));
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
});
