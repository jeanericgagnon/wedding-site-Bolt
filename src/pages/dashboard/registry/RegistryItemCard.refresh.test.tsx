import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RegistryItemCard } from './RegistryItemCard';
import type { RegistryItem } from './registryTypes';

function makeItem(overrides: Partial<RegistryItem> = {}): RegistryItem {
  return {
    id: 'item-1',
    wedding_site_id: 'site-1',
    item_name: 'KitchenAid Mixer',
    price_label: '$399.99',
    price_amount: 399.99,
    store_name: 'Amazon',
    merchant: 'Amazon',
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

describe('RegistryItemCard refresh actions', () => {
  it('keeps refresh and re-import actions available for canonical-only items', async () => {
    const onRefetchMetadata = vi.fn(async () => undefined);

    render(
      <RegistryItemCard
        item={makeItem({ canonical_url: 'https://example.com/canonical-product' })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRefetchMetadata={onRefetchMetadata}
      />,
    );

    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /re-import/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => {
      expect(onRefetchMetadata).toHaveBeenCalledWith(expect.objectContaining({ id: 'item-1' }));
    });
  });

  it('routes canonical-only re-import clicks through the replace-existing path', async () => {
    const onRefetchMetadata = vi.fn(async () => undefined);

    render(
      <RegistryItemCard
        item={makeItem({ canonical_url: 'https://example.com/canonical-product' })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRefetchMetadata={onRefetchMetadata}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /re-import/i }));

    await waitFor(() => {
      expect(onRefetchMetadata).toHaveBeenCalledWith(expect.objectContaining({ id: 'item-1' }), false, true);
    });
  });
});
