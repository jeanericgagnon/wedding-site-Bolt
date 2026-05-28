import { act, render } from '@testing-library/react';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  REGISTRY_ITEM_DELETE_RETRY_ERROR,
  REGISTRY_ITEM_PURCHASE_RESET_RETRY_ERROR,
  REGISTRY_ITEM_PURCHASE_RETRY_ERROR,
} from './registryDashboardErrorCopy';
import { useRegistryItemActions } from './useRegistryItemActions';
import type { RegistryItem } from './registryTypes';

const deleteRegistryItem = vi.fn();
const ownerMarkPurchased = vi.fn();
const updateRegistryItem = vi.fn();

vi.mock('./registryService', () => ({
  createRegistryItem: vi.fn(),
  deleteRegistryItem: (...args: unknown[]) => deleteRegistryItem(...args),
  fetchUrlPreview: vi.fn(),
  ownerMarkPurchased: (...args: unknown[]) => ownerMarkPurchased(...args),
  updateRegistryItem: (...args: unknown[]) => updateRegistryItem(...args),
}));

function makeItem(overrides: Partial<RegistryItem> = {}): RegistryItem {
  return {
    id: 'gift-1',
    wedding_site_id: 'site-1',
    item_type: 'product',
    item_name: 'Dinner plates',
    price_label: '$80',
    price_amount: 80,
    store_name: 'Store',
    merchant: 'Store',
    source_type: 'manual',
    barcode: null,
    item_url: null,
    canonical_url: null,
    image_url: null,
    selected_retailer: null,
    selected_product_url: null,
    estimated_price_cents: 8000,
    product_metadata: null,
    description: null,
    notes: null,
    quantity_needed: 2,
    quantity_purchased: 0,
    purchaser_name: null,
    purchase_status: 'available',
    hide_when_purchased: false,
    sort_order: 0,
    priority: 'medium',
    availability: null,
    metadata_last_checked_at: null,
    metadata_fetch_status: 'manual',
    metadata_confidence_score: null,
    metadata_source_method: 'manual',
    metadata_retailer: null,
    previous_price_amount: null,
    price_last_changed_at: null,
    next_refresh_at: null,
    last_auto_refreshed_at: null,
    refresh_fail_count: 0,
    fund_goal_amount: null,
    fund_received_amount: 0,
    fund_venmo_url: null,
    fund_paypal_url: null,
    fund_zelle_handle: null,
    fund_custom_url: null,
    fund_custom_label: null,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

type HookActions = ReturnType<typeof useRegistryItemActions>;

function renderActions(item = makeItem()) {
  const toast = vi.fn();
  const logRegistryAction = vi.fn();
  let latestActions: HookActions | null = null;

  function Harness() {
    const [items, setItems] = React.useState<RegistryItem[]>([item]);
    const [editItem, setEditItem] = React.useState<RegistryItem | null>(null);
    const [showForm, setShowForm] = React.useState(false);
    void items;
    void editItem;
    void showForm;
    latestActions = useRegistryItemActions({
      editItem,
      isDemoMode: false,
      items: [item],
      normalizeOwnerDashboardRegistryItem: (value) => value,
      setEditItem,
      setItems,
      setShowForm,
      toast,
      logRegistryAction,
      weddingSiteId: 'site-1',
    });
    return null;
  }

  render(<Harness />);
  if (!latestActions) throw new Error('Hook did not render');
  return {
    get actions() {
      if (!latestActions) throw new Error('Hook did not render');
      return latestActions;
    },
    toast,
  };
}

describe('useRegistryItemActions', () => {
  beforeEach(() => {
    deleteRegistryItem.mockReset();
    ownerMarkPurchased.mockReset();
    updateRegistryItem.mockReset();
  });

  it('uses shared safe copy when deleting an item fails', async () => {
    deleteRegistryItem.mockRejectedValueOnce(new Error('Supabase relation timeout token=abc'));
    const harness = renderActions();

    await act(async () => {
      await harness.actions.handleDelete('gift-1');
    });

    expect(deleteRegistryItem).toHaveBeenCalledWith('gift-1');
    expect(harness.toast).toHaveBeenCalledWith(REGISTRY_ITEM_DELETE_RETRY_ERROR, 'error');
  });

  it('uses shared safe copy when marking a purchase fails', async () => {
    ownerMarkPurchased.mockRejectedValueOnce(new Error('provider timeout token=abc'));
    const item = makeItem();
    const harness = renderActions(item);

    await act(async () => {
      await harness.actions.handleMarkPurchased(item, 1);
    });

    expect(ownerMarkPurchased).toHaveBeenCalledWith('gift-1', 1);
    expect(harness.toast).toHaveBeenCalledWith(REGISTRY_ITEM_PURCHASE_RETRY_ERROR, 'error');
  });

  it('uses shared safe copy when clearing purchase state fails', async () => {
    updateRegistryItem.mockRejectedValueOnce(new Error('provider timeout token=abc'));
    const item = makeItem({ quantity_purchased: 1, purchase_status: 'partial' });
    const harness = renderActions(item);

    await act(async () => {
      await harness.actions.handleResetPurchaseState(item);
    });

    expect(updateRegistryItem).toHaveBeenCalledWith('gift-1', {
      quantity_purchased: 0,
      purchaser_name: null,
      purchase_status: 'available',
    });
    expect(harness.toast).toHaveBeenCalledWith(REGISTRY_ITEM_PURCHASE_RESET_RETRY_ERROR, 'error');
  });
});
