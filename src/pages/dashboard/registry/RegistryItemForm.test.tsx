import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RegistryItemForm } from './RegistryItemForm';
import type { RegistryItem } from './registryTypes';
import { fetchUrlPreview } from './registryService';

vi.mock('./registryService', () => ({
  fetchUrlPreview: vi.fn(async () => ({
    title: 'Imported Bowl',
    price_amount: 64,
    store_name: 'DayOf QA Store',
    image_url: 'https://example.com/bowl.jpg',
    canonical_url: 'https://example.com/product',
    fetch_status: 'success',
  })),
  findDuplicateItem: vi.fn(() => null),
}));

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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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
    expect(screen.getByRole('button', { name: /refresh details/i })).toBeInTheDocument();
  });

  it('keeps canonical_url in sync when an owner edits an imported item link manually', async () => {
    const onSave = vi.fn(async () => {});

    render(
      <RegistryItemForm
        initial={makeItem({
          item_url: 'https://example.com/original-product',
          canonical_url: 'https://example.com/original-product',
        })}
        existingItems={[]}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('https://example.com/original-product'), {
      target: { value: 'https://example.com/updated-product' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      item_url: 'https://example.com/updated-product',
      canonical_url: 'https://example.com/updated-product',
    }));
  });

  it('does not render unsafe image URLs in the owner preview', () => {
    const { container } = render(
      <RegistryItemForm
        initial={makeItem({ image_url: 'javascript:alert(1)' })}
        existingItems={[]}
        onSave={vi.fn(async () => {})}
        onCancel={vi.fn()}
      />,
    );

    expect(container.querySelector('img[src^="javascript:"]')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('javascript:alert(1)')).toBeInTheDocument();
  });

  it('sanitizes unsafe registry URLs before saving', async () => {
    const onSave = vi.fn(async () => {});

    render(
      <RegistryItemForm
        initial={makeItem({
          item_url: 'javascript:alert(1)',
          canonical_url: 'ftp://example.com/product',
          image_url: 'data:text/html,<script>alert(1)</script>',
          fund_venmo_url: 'javascript:alert(1)',
          fund_paypal_url: 'https://paypal.me/dayof',
          fund_custom_url: 'data:text/html,<script>alert(1)</script>',
        })}
        existingItems={[]}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      item_url: '',
      canonical_url: '',
      image_url: '',
      fund_venmo_url: '',
      fund_paypal_url: 'https://paypal.me/dayof',
      fund_custom_url: '',
    }));
  });

  it('does not auto-fill over manual edits after the owner clicks fill details', async () => {
    const onSave = vi.fn(async () => {});

    render(
      <RegistryItemForm
        existingItems={[]}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/amazon\.com\/product/i), {
      target: { value: 'https://example.com/product' },
    });
    fireEvent.click(screen.getByRole('button', { name: /fill details/i }));

    await waitFor(() => expect(screen.getByPlaceholderText('e.g. KitchenAid Stand Mixer')).toHaveValue('Imported Bowl'));
    fireEvent.change(screen.getByPlaceholderText('e.g. KitchenAid Stand Mixer'), {
      target: { value: 'Owner Edited Bowl' },
    });

    await new Promise((resolve) => {
      window.setTimeout(resolve, 900);
    });

    expect(fetchUrlPreview).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText('e.g. KitchenAid Stand Mixer')).toHaveValue('Owner Edited Bowl');
  }, 10_000);
});
