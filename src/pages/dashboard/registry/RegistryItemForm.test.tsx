import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RegistryItemForm } from './RegistryItemForm';
import type { RegistryItem } from './registryTypes';
import { fetchUrlPreview, findDuplicateItem, lookupRegistryBarcode } from './registryService';

vi.mock('./registryService', () => ({
  fetchUrlPreview: vi.fn(async () => ({
    title: 'Imported Bowl',
    price_amount: 64,
    store_name: 'DayOf QA Store',
    image_url: 'https://example.com/bowl.jpg',
    canonical_url: 'https://example.com/product',
    fetch_status: 'success',
  })),
  lookupRegistryBarcode: vi.fn(async () => ({
    ok: true,
    matched: true,
    barcode: '036000291452',
    normalized_barcode: '036000291452',
    format: 'upc_a',
    provider: 'cache',
    provider_path: ['open_food_facts', 'cache'],
    from_cache: false,
    confidence_score: 92,
    review_required: false,
    title: 'Scanned Bowl',
    brand: 'DayOf',
    image_url: 'https://example.com/scanned-bowl.jpg',
    category: 'Kitchen',
    description: 'A nice bowl',
    estimated_price_cents: 6400,
    currency: 'USD',
    product_url: 'https://example.com/scanned-bowl',
    selected_retailer: 'DayOf QA Store',
    retailer_options: [
      { label: 'DayOf QA Store', url: 'https://example.com/scanned-bowl', price_cents: 6400, currency: 'USD', is_best_match: true },
    ],
    raw_payload: { sample: true },
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

    expect(screen.getAllByDisplayValue('https://example.com/canonical-product')[0]).toBeInTheDocument();
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

    fireEvent.change(screen.getAllByDisplayValue('https://example.com/original-product')[0], {
      target: { value: 'https://example.com/updated-product' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      item_url: 'https://example.com/updated-product',
      canonical_url: 'https://example.com/updated-product',
    }));
  });

  it('saves owner purchase tracking fields with consistent registry truth', async () => {
    const onSave = vi.fn(async () => {});

    render(
      <RegistryItemForm
        initial={makeItem({
          quantity_needed: 3,
          quantity_purchased: 1,
          purchaser_name: 'Alex',
          purchase_status: 'partial',
        })}
        existingItems={[]}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/purchased so far/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/purchaser name/i), { target: { value: 'Jordan' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      quantity_purchased: '3',
      purchaser_name: 'Jordan',
      desired_quantity: '3',
    }));
  });

  it('blocks impossible purchased quantities before saving', async () => {
    const onSave = vi.fn(async () => {});

    render(
      <RegistryItemForm
        initial={makeItem({
          item_name: 'Serving Bowl',
          quantity_needed: 2,
          quantity_purchased: 1,
          purchase_status: 'partial',
        })}
        existingItems={[]}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/purchased so far/i), { target: { value: '3' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Purchased so far cannot be greater than desired quantity.');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('blocks cash funds that do not have a guest contribution path', async () => {
    const onSave = vi.fn(async () => {});

    render(
      <RegistryItemForm
        initial={makeItem({
          item_type: 'cash_fund',
          source_type: 'cash_fund',
          item_name: 'Honeymoon fund',
          fund_venmo_url: '',
          fund_paypal_url: '',
          fund_zelle_handle: '',
          fund_custom_url: '',
        })}
        existingItems={[]}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Add at least one way guests can contribute to this fund before saving.');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('allows cash funds with a guest contribution path', async () => {
    const onSave = vi.fn(async () => {});

    render(
      <RegistryItemForm
        initial={makeItem({
          item_type: 'cash_fund',
          source_type: 'cash_fund',
          item_name: 'Honeymoon fund',
          fund_zelle_handle: 'couple@example.com',
        })}
        existingItems={[]}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      item_type: 'cash_fund',
      source_type: 'cash_fund',
      fund_zelle_handle: 'couple@example.com',
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

    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
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

  it('looks up a barcode and fills the product details', async () => {
    render(
      <RegistryItemForm
        existingItems={[]}
        onSave={vi.fn(async () => {})}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /scan barcode/i }));
    fireEvent.change(screen.getByPlaceholderText(/upc, ean, gtin, or isbn/i), {
      target: { value: '036000291452' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^look up$/i }));

    await waitFor(() => expect(lookupRegistryBarcode).toHaveBeenCalledWith('036000291452'));
    await waitFor(() => expect(screen.getByDisplayValue('Scanned Bowl')).toBeInTheDocument());
    expect(screen.getByDisplayValue('64.00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('DayOf QA Store')).toBeInTheDocument();
  });

  it('lets the owner clear the store choice after a barcode match', async () => {
    render(
      <RegistryItemForm
        existingItems={[]}
        onSave={vi.fn(async () => {})}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /scan barcode/i }));
    fireEvent.change(screen.getByPlaceholderText(/upc, ean, gtin, or isbn/i), {
      target: { value: '036000291452' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^look up$/i }));

    await waitFor(() => expect(screen.getByDisplayValue('DayOf QA Store')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /add without store/i }));

    expect(screen.getByPlaceholderText('e.g. Amazon, Target')).toHaveValue('');
    expect(screen.getByPlaceholderText('https://store.com/product')).toHaveValue('');
  });

  it('shows review required copy for low-confidence barcode matches', async () => {
    vi.mocked(lookupRegistryBarcode).mockResolvedValueOnce({
      ok: true,
      matched: true,
      barcode: '5449000000996',
      normalized_barcode: '5449000000996',
      format: 'ean_13',
      provider: 'open_food_facts',
      provider_path: ['open_food_facts'],
      from_cache: false,
      confidence_score: 55,
      review_required: true,
      title: 'Possible Match',
      brand: null,
      image_url: null,
      category: null,
      description: null,
      estimated_price_cents: null,
      currency: 'USD',
      product_url: null,
      selected_retailer: null,
      retailer_options: [],
      raw_payload: null,
    });

    render(
      <RegistryItemForm
        existingItems={[]}
        onSave={vi.fn(async () => {})}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /scan barcode/i }));
    fireEvent.change(screen.getByPlaceholderText(/upc, ean, gtin, or isbn/i), {
      target: { value: '5449000000996' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^look up$/i }));

    await waitFor(() => expect(screen.getByText(/review required/i)).toBeInTheDocument());
    expect(screen.getByText(/review the title, price, image, and retailer before saving it/i)).toBeInTheDocument();
  });

  it('warns when a barcode match already exists in the registry', async () => {
    vi.mocked(findDuplicateItem).mockReturnValueOnce(makeItem({ id: 'existing-1', item_name: 'Existing Bowl' }));

    render(
      <RegistryItemForm
        existingItems={[makeItem({ id: 'existing-1', item_name: 'Existing Bowl', barcode: '036000291452' })]}
        onSave={vi.fn(async () => {})}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /scan barcode/i }));
    fireEvent.change(screen.getByPlaceholderText(/upc, ean, gtin, or isbn/i), {
      target: { value: '036000291452' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^look up$/i }));

    await waitFor(() => expect(findDuplicateItem).toHaveBeenCalled());
    expect(screen.getByText(/review the existing gift before keeping another copy/i)).toBeInTheDocument();
  });
});
