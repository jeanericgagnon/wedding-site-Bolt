import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RegistryDashboardRouteContent } from './RegistryDashboardRouteContent';
import type { RegistryItem } from './registryTypes';

function makeItem(overrides: Partial<RegistryItem> = {}): RegistryItem {
  return {
    id: 'gift-1',
    wedding_site_id: 'site-1',
    item_name: 'Dinner plates',
    price_label: '$80',
    price_amount: 80,
    store_name: 'Store',
    merchant: 'Store',
    item_url: null,
    canonical_url: null,
    image_url: null,
    description: null,
    notes: null,
    quantity_needed: 1,
    quantity_purchased: 1,
    purchaser_name: 'Alex',
    purchase_status: 'purchased',
    hide_when_purchased: false,
    sort_order: 0,
    priority: 'medium',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('RegistryDashboardRouteContent', () => {
  it('renders persisted thank-you tasks and routes owner actions', () => {
    const handleToggleRegistryThankYouTask = vi.fn(async () => {});
    const handleSyncRegistryThankYouTasks = vi.fn(async () => {});

    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={0}
        alertCounts={{ stale: 0, priceChanged: 0, outOfStock: 0, imageIssues: 0 }}
        autoRefreshEnabled
        autoRefreshing={false}
        bulkImportBusy={false}
        bulkReviewCounts={{ repair: 0, duplicates: 0, imageIssues: 0 }}
        budgetUtilization={0}
        counts={{ total: 1, available: 0, partial: 0, purchased: 1, totalValue: 80 }}
        duplicateGroups={[]}
        editItem={null}
        filter="all"
        filtered={[makeItem()]}
        fulfillmentRate={100}
        fundStats={{ count: 0, received: 0, goal: 0 }}
        handleAddNew={vi.fn()}
        handleAutoRefreshStale={vi.fn(async () => {})}
        handleBulkImport={vi.fn(async () => {})}
        handleCopyDuplicateReviewList={vi.fn(async () => {})}
        handleDelete={vi.fn(async () => {})}
        handleEdit={vi.fn()}
        handleMergeDuplicateGroup={vi.fn(async () => {})}
        handleMarkPurchased={vi.fn(async () => {})}
        handleResetPurchaseState={vi.fn(async () => {})}
        handleRefetchMetadata={vi.fn(async () => true)}
        handleRefreshImageIssues={vi.fn(async () => {})}
        handleRepairBadImports={vi.fn(async () => {})}
        handleRunRepairQueueAction={vi.fn(async () => {})}
        handleSyncRegistryThankYouTasks={handleSyncRegistryThankYouTasks}
        handleToggleRegistryThankYouTask={handleToggleRegistryThankYouTask}
        imageRefreshBusy={false}
        items={[makeItem()]}
        loading={false}
        monthlyRefreshCap={100}
        monthlyRefreshCount={0}
        mergingDuplicateGroupId={null}
        nearBudgetCap={false}
        normalizedItems={[makeItem()]}
        recentActivity={[makeItem()]}
        registryActionsOpen={false}
        registryActionsRef={{ current: null }}
        registryInsights={[]}
        registryLaunchReadiness={{ headline: 'Ready', summary: 'Ready', status: 'ready', reviewCount: 0, items: [] }}
        registryThankYouPlan={{
          headline: 'Thank-you follow-up list',
          summary: '1 purchased gift is in the thank-you list.',
          purchasedCount: 1,
          namedPurchaserCount: 1,
          missingPurchaserCount: 0,
          completedCount: 0,
          items: [{
            id: 'gift-1',
            giftName: 'Dinner plates',
            purchaserLabel: 'Purchased by Alex',
            detail: 'Ready for thank-you follow-up.',
            status: 'ready',
            taskStatus: 'todo',
            completedAt: null,
          }],
        }}
        registryThankYouBusyItemId={null}
        registryThankYouSyncing={false}
        repairingBadImports={false}
        repairQueue={[]}
        refreshBudgetRemaining={100}
        refreshWindowOpen={true}
        search=""
        setBulkImportOpen={vi.fn()}
        setFilter={vi.fn()}
        setRegistryActionsOpen={vi.fn()}
        setSearch={vi.fn()}
        setShowAlertsOnly={vi.fn()}
        setShowImageIssuesOnly={vi.fn()}
        showAlertsOnly={false}
        showImageIssuesOnly={false}
        topRegistryItems={[makeItem()]}
        weddingSiteId="site-1"
      />,
    );

    expect(screen.getByText('Thank-you follow-up list')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /save thank-you list/i }));
    fireEvent.click(screen.getByRole('button', { name: /mark sent/i }));

    expect(handleSyncRegistryThankYouTasks).toHaveBeenCalled();
    expect(handleToggleRegistryThankYouTask).toHaveBeenCalledWith('gift-1');
  });
});

