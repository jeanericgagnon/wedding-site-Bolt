import { act, render } from '@testing-library/react';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { copyTextOrDownload } from '../../../lib/copyText';
import {
  REGISTRY_DUPLICATE_MERGE_RETRY_ERROR,
  REGISTRY_DUPLICATE_REVIEW_COPY_RETRY_ERROR,
  REGISTRY_METADATA_REFRESH_RETRY_ERROR,
} from './registryDashboardErrorCopy';
import { useRegistryMaintenanceActions } from './useRegistryMaintenanceActions';
import type { RegistryDuplicateGroup } from './duplicateRegistryItems';
import type { RegistryItem } from './registryTypes';

const copyTextOrDownloadMock = vi.mocked(copyTextOrDownload);
const fetchUrlPreview = vi.fn();
const mergeDuplicateRegistryItems = vi.fn();

vi.mock('../../../lib/copyText', () => ({
  copyTextOrDownload: vi.fn(),
}));

vi.mock('./registryService', () => ({
  createRegistryItem: vi.fn(),
  fetchUrlPreview: (...args: unknown[]) => fetchUrlPreview(...args),
  findDuplicateItem: vi.fn(),
  mergeDuplicateRegistryItems: (...args: unknown[]) => mergeDuplicateRegistryItems(...args),
  saveRegistryImportBatch: vi.fn(),
  updateRegistryItem: vi.fn(),
  updateRegistryRefreshBudget: vi.fn(),
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
    item_url: 'https://shop.example.com/dinner-plates',
    canonical_url: 'https://shop.example.com/dinner-plates',
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

function makeDuplicateGroup(primaryItem = makeItem()): RegistryDuplicateGroup {
  const secondary = makeItem({
    id: 'gift-2',
    item_name: 'Dinner plates duplicate',
    canonical_url: 'https://shop.example.com/dinner-plates-duplicate',
    item_url: 'https://shop.example.com/dinner-plates-duplicate',
  });

  return {
    id: 'group-1',
    primaryItem,
    secondaryItems: [secondary],
    items: [primaryItem, secondary],
    signals: [{ kind: 'canonical_url', label: 'Matching link', value: 'https://shop.example.com/dinner-plates' }],
  };
}

type HookActions = ReturnType<typeof useRegistryMaintenanceActions>;

function renderActions(overrides: {
  duplicateGroups?: RegistryDuplicateGroup[];
  items?: RegistryItem[];
} = {}) {
  const toast = vi.fn();
  const logRegistryAction = vi.fn();
  let latestActions: HookActions | null = null;

  function Harness() {
    const [items, setItems] = React.useState<RegistryItem[]>(overrides.items ?? [makeItem()]);
    const [bulkImportOpen, setBulkImportOpen] = React.useState(false);
    const [bulkUrls, setBulkUrls] = React.useState('');
    const [latestImportBatchSummary, setLatestImportBatchSummary] = React.useState(null);
    const [recentImportBatchesSummary, setRecentImportBatchesSummary] = React.useState(null);
    const [monthlyRefreshCount, setMonthlyRefreshCount] = React.useState(0);
    const [monthlyRefreshMonth, setMonthlyRefreshMonth] = React.useState<string | null>(null);
    void bulkImportOpen;
    void bulkUrls;
    void latestImportBatchSummary;
    void recentImportBatchesSummary;
    void monthlyRefreshCount;
    void monthlyRefreshMonth;

    latestActions = useRegistryMaintenanceActions({
      duplicateGroups: overrides.duplicateGroups ?? [makeDuplicateGroup()],
      ensureMonthlyBudgetState: async () => ({ monthKey: '2026-05', count: 0 }),
      isDemoMode: false,
      items,
      monthlyRefreshCap: 10,
      normalizeOwnerDashboardRegistryItem: (value) => value,
      refreshIncludePurchased: false,
      refreshWindowOpen: true,
      setBulkImportOpen,
      setBulkUrls,
      setLatestImportBatchSummary,
      setRecentImportBatchesSummary,
      setItems,
      setMonthlyRefreshCount,
      setMonthlyRefreshMonth,
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

describe('useRegistryMaintenanceActions', () => {
  beforeEach(() => {
    copyTextOrDownloadMock.mockReset();
    fetchUrlPreview.mockReset();
    mergeDuplicateRegistryItems.mockReset();
  });

  it('uses shared safe copy when refreshing metadata fails', async () => {
    fetchUrlPreview.mockRejectedValueOnce(new Error('provider timeout token=abc'));
    const item = makeItem();
    const harness = renderActions({ items: [item] });

    await act(async () => {
      await harness.actions.handleRefetchMetadata(item);
    });

    expect(fetchUrlPreview).toHaveBeenCalledWith('https://shop.example.com/dinner-plates', true);
    expect(harness.toast).toHaveBeenCalledWith(REGISTRY_METADATA_REFRESH_RETRY_ERROR, 'error');
  });

  it('uses shared safe copy when copying the duplicate review list fails', async () => {
    copyTextOrDownloadMock.mockRejectedValueOnce(new Error('clipboard timeout token=abc'));
    const harness = renderActions();

    await act(async () => {
      await harness.actions.handleCopyDuplicateReviewList();
    });

    expect(harness.toast).toHaveBeenCalledWith(REGISTRY_DUPLICATE_REVIEW_COPY_RETRY_ERROR, 'error');
  });

  it('uses shared safe copy when merging duplicate gifts fails', async () => {
    mergeDuplicateRegistryItems.mockRejectedValueOnce(new Error('Supabase relation timeout token=abc'));
    const group = makeDuplicateGroup();
    const harness = renderActions({ duplicateGroups: [group], items: group.items });

    await act(async () => {
      await harness.actions.handleMergeDuplicateGroup(group);
    });

    expect(mergeDuplicateRegistryItems).toHaveBeenCalled();
    expect(harness.toast).toHaveBeenCalledWith(REGISTRY_DUPLICATE_MERGE_RETRY_ERROR, 'error');
  });
});
