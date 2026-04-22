import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RegistryItemForm } from './RegistryItemForm';
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

describe('RegistryItemForm', () => {
  it('seeds canonical-only items into the editable product URL field', () => {
    render(
      <RegistryItemForm
        initial={makeItem({ canonical_url: 'https://example.com/canonical-product' })}
        existingItems={[]}
        onSave={vi.fn(async () => {})}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('https://example.com/canonical-product')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /re-fetch details/i })).toBeInTheDocument();
  });
});
