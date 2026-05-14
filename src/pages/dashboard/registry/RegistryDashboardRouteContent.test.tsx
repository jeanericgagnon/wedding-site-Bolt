import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RegistryDashboardRouteContent } from './RegistryDashboardRouteContent';
import { buildRegistryDashboardDerivedState } from './buildRegistryDashboardDerivedState';
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
        claimStats={{ claimedItems: 1, claimedQuantity: 1, fullyClaimedItems: 1, partiallyClaimedItems: 0, namedPurchaserItems: 1, missingPurchaserItems: 0, multiQuantityInProgress: 0, remainingQuantity: 0 }}
        counts={{ total: 1, available: 0, partial: 0, purchased: 1, totalValue: 80 }}
        duplicateGroups={[]}
        editItem={null}
        filter="all"
        filtered={[makeItem()]}
        fulfillmentRate={100}
        fundStats={{ count: 0, received: 0, goal: 0, readyToShare: 0, needsSetup: 0, readyWithProgress: 0, readyAwaitingFirstGift: 0, withGoal: 0, missingGoal: 0, withProgress: 0, awaitingFirstGift: 0, flexibleWithProgress: 0 }}
        guestVisibilityStats={{ guestReadyItems: 1, guestVisibleItems: 1, visibleAvailableItems: 0, visibleClaimedItems: 1, hiddenPurchasedItems: 0, blockedGuestItems: 0 }}
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
        registryThankYouStats={{
          purchasedCount: 1,
          completedCount: 0,
          pendingCount: 1,
          readyToSendCount: 1,
          blockedByMissingPurchaserCount: 0,
          attributionCoverageRate: 100,
          completionRate: 0,
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
    expect(screen.getByText('Purchasers named: 1')).toBeInTheDocument();
    expect(screen.getByText('Missing purchaser: 0')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /save thank-you list/i }));
    fireEvent.click(screen.getByRole('button', { name: /mark sent/i }));

    expect(handleSyncRegistryThankYouTasks).toHaveBeenCalled();
    expect(handleToggleRegistryThankYouTask).toHaveBeenCalledWith('gift-1');
  });

  it('surfaces missing purchaser follow-up state in the owner summary', () => {
    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={0}
        alertCounts={{ stale: 0, priceChanged: 0, outOfStock: 0, imageIssues: 0 }}
        autoRefreshEnabled
        autoRefreshing={false}
        bulkImportBusy={false}
        bulkReviewCounts={{ repair: 0, duplicates: 0, imageIssues: 0 }}
        budgetUtilization={0}
        claimStats={{ claimedItems: 1, claimedQuantity: 1, fullyClaimedItems: 0, partiallyClaimedItems: 1, namedPurchaserItems: 0, missingPurchaserItems: 1, multiQuantityInProgress: 0, remainingQuantity: 0 }}
        counts={{ total: 1, available: 0, partial: 1, purchased: 0, totalValue: 80 }}
        duplicateGroups={[]}
        editItem={null}
        filter="all"
        filtered={[makeItem({ purchaser_name: null, purchase_status: 'partial' })]}
        fulfillmentRate={0}
        fundStats={{ count: 0, received: 0, goal: 0, readyToShare: 0, needsSetup: 0, readyWithProgress: 0, readyAwaitingFirstGift: 0, withGoal: 0, missingGoal: 0, withProgress: 0, awaitingFirstGift: 0, flexibleWithProgress: 0 }}
        guestVisibilityStats={{ guestReadyItems: 1, guestVisibleItems: 1, visibleAvailableItems: 0, visibleClaimedItems: 1, hiddenPurchasedItems: 0, blockedGuestItems: 0 }}
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
        handleSyncRegistryThankYouTasks={vi.fn(async () => {})}
        handleToggleRegistryThankYouTask={vi.fn(async () => {})}
        imageRefreshBusy={false}
        items={[makeItem({ purchaser_name: null, purchase_status: 'partial' })]}
        loading={false}
        monthlyRefreshCap={100}
        monthlyRefreshCount={0}
        mergingDuplicateGroupId={null}
        nearBudgetCap={false}
        normalizedItems={[makeItem({ purchaser_name: null, purchase_status: 'partial' })]}
        recentActivity={[makeItem({ purchaser_name: null, purchase_status: 'partial' })]}
        registryActionsOpen={false}
        registryActionsRef={{ current: null }}
        registryInsights={[]}
        registryLaunchReadiness={{ headline: 'Ready', summary: 'Ready', status: 'ready', reviewCount: 0, items: [] }}
        registryThankYouPlan={{
          headline: 'Thank-you follow-up list',
          summary: '1 purchased gift is in the thank-you list.',
          purchasedCount: 1,
          namedPurchaserCount: 0,
          missingPurchaserCount: 1,
          completedCount: 0,
          items: [{
            id: 'gift-1',
            giftName: 'Dinner plates',
            purchaserLabel: 'Purchaser not recorded yet',
            detail: 'Add the purchaser before you send a thank-you.',
            status: 'quiet',
            taskStatus: 'needs-purchaser',
            completedAt: null,
          }],
        }}
        registryThankYouStats={{
          purchasedCount: 1,
          completedCount: 0,
          pendingCount: 1,
          readyToSendCount: 0,
          blockedByMissingPurchaserCount: 1,
          attributionCoverageRate: 0,
          completionRate: 0,
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
        topRegistryItems={[makeItem({ purchaser_name: null, purchase_status: 'partial' })]}
        weddingSiteId="site-1"
      />,
    );

    expect(screen.getByText('Missing purchaser: 1')).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Thank-you ready: 0 · Missing purchaser: 1'),
    ).toBeInTheDocument();
    expect(screen.getByText('Add the purchaser before you send a thank-you.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /review gift/i })).toBeInTheDocument();
  });

  it('derives fund readiness truth from safe payment methods', () => {
    const derived = buildRegistryDashboardDerivedState({
      autoRefreshEnabled: true,
      items: [
        makeItem({
          id: 'fund-ready',
          item_type: 'cash_fund',
          item_name: 'Honeymoon fund',
          price_amount: null,
          purchase_status: 'available',
          quantity_purchased: 0,
          quantity_needed: 1,
          purchaser_name: null,
          fund_goal_amount: 4000,
          fund_received_amount: 1200,
          fund_venmo_url: 'https://venmo.com/dayof',
        }),
        makeItem({
          id: 'fund-needs-setup',
          item_type: 'cash_fund',
          item_name: 'New home fund',
          price_amount: null,
          purchase_status: 'available',
          quantity_purchased: 0,
          quantity_needed: 1,
          purchaser_name: null,
          fund_goal_amount: 2000,
          fund_received_amount: 200,
          fund_venmo_url: 'javascript:alert(1)',
          fund_paypal_url: null,
          fund_custom_url: null,
          fund_zelle_handle: '   ',
        }),
      ],
      monthlyRefreshCap: 50,
      monthlyRefreshCount: 0,
      registryThankYouLedger: {},
      refreshEnabledUntil: null,
      refreshIncludePurchased: false,
      search: '',
      filter: 'all',
      showAlertsOnly: false,
      showImageIssuesOnly: false,
    });

    expect(derived.fundStats).toMatchObject({
      count: 2,
      readyToShare: 1,
      needsSetup: 1,
      readyWithProgress: 1,
      readyAwaitingFirstGift: 0,
      withGoal: 2,
      missingGoal: 0,
      withProgress: 2,
      awaitingFirstGift: 0,
      flexibleWithProgress: 0,
      received: 1400,
      goal: 6000,
    });
  });

  it('derives claim-state analytics from purchased and partial gifts', () => {
    const derived = buildRegistryDashboardDerivedState({
      autoRefreshEnabled: true,
      items: [
        makeItem({
          id: 'partial-set',
          item_name: 'Wine glasses',
          quantity_needed: 6,
          quantity_purchased: 2,
          purchaser_name: 'Jordan',
          purchase_status: 'partial',
        }),
        makeItem({
          id: 'purchased-missing-purchaser',
          item_name: 'Serving bowls',
          quantity_needed: 1,
          quantity_purchased: 1,
          purchaser_name: null,
          purchase_status: 'purchased',
        }),
        makeItem({
          id: 'available-gift',
          item_name: 'Cake stand',
          quantity_needed: 2,
          quantity_purchased: 0,
          purchaser_name: null,
          purchase_status: 'available',
        }),
      ],
      monthlyRefreshCap: 50,
      monthlyRefreshCount: 0,
      registryThankYouLedger: {},
      refreshEnabledUntil: null,
      refreshIncludePurchased: false,
      search: '',
      filter: 'all',
      showAlertsOnly: false,
      showImageIssuesOnly: false,
    });

    expect(derived.claimStats).toEqual({
      claimedItems: 2,
      claimedQuantity: 3,
      fullyClaimedItems: 1,
      partiallyClaimedItems: 1,
      namedPurchaserItems: 1,
      missingPurchaserItems: 1,
      multiQuantityInProgress: 1,
      remainingQuantity: 6,
    });
  });

  it('derives thank-you follow-through analytics from purchased gifts and saved ledger state', () => {
    const derived = buildRegistryDashboardDerivedState({
      autoRefreshEnabled: true,
      items: [
        makeItem({
          id: 'done-gift',
          item_name: 'Dinner plates',
          purchaser_name: 'Alex',
          purchase_status: 'purchased',
          quantity_needed: 1,
          quantity_purchased: 1,
        }),
        makeItem({
          id: 'ready-gift',
          item_name: 'Wine glasses',
          purchaser_name: 'Jordan',
          purchase_status: 'partial',
          quantity_needed: 6,
          quantity_purchased: 2,
        }),
        makeItem({
          id: 'blocked-gift',
          item_name: 'Cake stand',
          purchaser_name: null,
          purchase_status: 'purchased',
          quantity_needed: 1,
          quantity_purchased: 1,
        }),
      ],
      monthlyRefreshCap: 50,
      monthlyRefreshCount: 0,
      registryThankYouLedger: {
        'done-gift': {
          itemId: 'done-gift',
          giftName: 'Dinner plates',
          purchaserName: 'Alex',
          quantityNeeded: 1,
          quantityPurchased: 1,
          status: 'done',
          generatedAt: '2026-05-10T11:00:00.000Z',
          completedAt: '2026-05-10T12:00:00.000Z',
        },
      },
      refreshEnabledUntil: null,
      refreshIncludePurchased: false,
      search: '',
      filter: 'all',
      showAlertsOnly: false,
      showImageIssuesOnly: false,
    });

    expect(derived.registryThankYouStats).toEqual({
      purchasedCount: 3,
      completedCount: 1,
      pendingCount: 2,
      readyToSendCount: 1,
      blockedByMissingPurchaserCount: 1,
      attributionCoverageRate: 67,
      completionRate: 33,
    });
  });

  it('derives guest-visible registry analytics from hidden purchased and blocked guest items', () => {
    const derived = buildRegistryDashboardDerivedState({
      autoRefreshEnabled: true,
      items: [
        makeItem({
          id: 'visible-available',
          item_name: 'Cake stand',
          purchase_status: 'available',
          quantity_purchased: 0,
          quantity_needed: 1,
        }),
        makeItem({
          id: 'visible-partial',
          item_name: 'Wine glasses',
          purchase_status: 'partial',
          quantity_purchased: 2,
          quantity_needed: 6,
        }),
        makeItem({
          id: 'hidden-purchased',
          item_name: 'Serving bowls',
          purchase_status: 'purchased',
          quantity_purchased: 1,
          quantity_needed: 1,
          hide_when_purchased: true,
        }),
        makeItem({
          id: 'broken-guest-title',
          item_name: 'Page Not Found',
          purchase_status: 'available',
          quantity_purchased: 0,
          quantity_needed: 1,
        }),
      ],
      monthlyRefreshCap: 50,
      monthlyRefreshCount: 0,
      registryThankYouLedger: {},
      refreshEnabledUntil: null,
      refreshIncludePurchased: false,
      search: '',
      filter: 'all',
      showAlertsOnly: false,
      showImageIssuesOnly: false,
    });

    expect(derived.guestVisibilityStats).toEqual({
      guestReadyItems: 3,
      guestVisibleItems: 2,
      visibleAvailableItems: 1,
      visibleClaimedItems: 1,
      hiddenPurchasedItems: 1,
      blockedGuestItems: 1,
      guestReadyCoverageRate: 75,
      guestVisibleCoverageRate: 50,
    });
  });

  it('tracks missing fund goals and first-gift gaps separately', () => {
    const derived = buildRegistryDashboardDerivedState({
      autoRefreshEnabled: true,
      items: [
        makeItem({
          id: 'fund-no-goal',
          item_type: 'cash_fund',
          item_name: 'Honeymoon fund',
          price_amount: null,
          purchase_status: 'available',
          quantity_purchased: 0,
          quantity_needed: 1,
          purchaser_name: null,
          fund_goal_amount: null,
          fund_received_amount: 150,
          fund_custom_url: 'https://example.com/fund',
        }),
        makeItem({
          id: 'fund-awaiting-first-gift',
          item_type: 'cash_fund',
          item_name: 'New home fund',
          price_amount: null,
          purchase_status: 'available',
          quantity_purchased: 0,
          quantity_needed: 1,
          purchaser_name: null,
          fund_goal_amount: 2500,
          fund_received_amount: 0,
          fund_zelle_handle: 'dayof@zelle.test',
        }),
      ],
      monthlyRefreshCap: 50,
      monthlyRefreshCount: 0,
      registryThankYouLedger: {},
      refreshEnabledUntil: null,
      refreshIncludePurchased: false,
      search: '',
      filter: 'all',
      showAlertsOnly: false,
      showImageIssuesOnly: false,
    });

    expect(derived.fundStats).toMatchObject({
      count: 2,
      readyToShare: 2,
      needsSetup: 0,
      readyWithProgress: 1,
      readyAwaitingFirstGift: 1,
      withGoal: 1,
      missingGoal: 1,
      withProgress: 0,
      awaitingFirstGift: 1,
      flexibleWithProgress: 1,
      received: 150,
      goal: 2500,
    });
    expect(derived.fundShareReadyRate).toBe(100);
    expect(derived.fundGoalCoverageRate).toBe(50);
  });

  it('renders richer fund follow-through notes for moving and waiting funds', () => {
    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={0}
        alertCounts={{ stale: 0, priceChanged: 0, outOfStock: 0, imageIssues: 0 }}
        autoRefreshEnabled
        autoRefreshing={false}
        bulkImportBusy={false}
        bulkReviewCounts={{ repair: 0, duplicates: 0, imageIssues: 0 }}
        budgetUtilization={0}
        claimStats={{ claimedItems: 2, claimedQuantity: 3, fullyClaimedItems: 0, partiallyClaimedItems: 0, namedPurchaserItems: 2, missingPurchaserItems: 0, multiQuantityInProgress: 0, remainingQuantity: 0 }}
        claimAttributionCoverageRate={100}
        counts={{ total: 2, available: 2, partial: 0, purchased: 0, totalValue: 0 }}
        duplicateGroups={[]}
        editItem={null}
        filter="all"
        filtered={[makeItem({ id: 'fund-1' }), makeItem({ id: 'fund-2' })]}
        fulfillmentRate={0}
        fundStats={{ count: 2, received: 1500, goal: 4000, readyToShare: 2, needsSetup: 0, readyWithProgress: 1, readyAwaitingFirstGift: 1, withGoal: 1, missingGoal: 1, withProgress: 1, awaitingFirstGift: 0, flexibleWithProgress: 1 }}
        fundGoalCoverageRate={50}
        fundShareReadyRate={100}
        guestVisibilityStats={{ guestReadyItems: 2, guestVisibleItems: 2, visibleAvailableItems: 2, visibleClaimedItems: 0, hiddenPurchasedItems: 0, blockedGuestItems: 0, guestReadyCoverageRate: 100, guestVisibleCoverageRate: 100 }}
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
        handleSyncRegistryThankYouTasks={vi.fn(async () => {})}
        handleToggleRegistryThankYouTask={vi.fn(async () => {})}
        imageRefreshBusy={false}
        items={[makeItem({ id: 'fund-1' }), makeItem({ id: 'fund-2' })]}
        loading={false}
        monthlyRefreshCap={100}
        monthlyRefreshCount={0}
        mergingDuplicateGroupId={null}
        nearBudgetCap={false}
        normalizedItems={[makeItem({ id: 'fund-1' }), makeItem({ id: 'fund-2' })]}
        recentActivity={[makeItem({ id: 'fund-1' })]}
        registryActionsOpen={false}
        registryActionsRef={{ current: null }}
        registryInsights={[]}
        registryLaunchReadiness={{ headline: 'Ready', summary: 'Ready', status: 'ready', reviewCount: 0, items: [] }}
        registryThankYouPlan={{ headline: 'Quiet', summary: 'Quiet', purchasedCount: 0, namedPurchaserCount: 0, missingPurchaserCount: 0, completedCount: 0, items: [] }}
        registryThankYouStats={{ purchasedCount: 0, completedCount: 0, pendingCount: 0, readyToSendCount: 0, blockedByMissingPurchaserCount: 0, attributionCoverageRate: 0, completionRate: 0 }}
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
        topRegistryItems={[makeItem({ id: 'fund-1' })]}
        weddingSiteId="site-1"
      />,
    );

    expect(screen.getByText('100% share-ready · 1 already moving · 1 waiting on a first gift · 1 missing a goal')).toBeInTheDocument();
    expect(screen.getByText('50% goal-tracked · 50% already receiving gifts · 1 showing tracked progress · 1 flexible fund already receiving gifts')).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Ready funds already moving: 1 · Waiting on first gift: 1'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Flexible funds with gifts: 1 · Tracked progress funds: 1'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Share-ready coverage: 100% · Goal-tracked funds: 50%'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Receiving-gift coverage: 50% · Funds already moving: 1'),
    ).toBeInTheDocument();
  });

  it('renders claim-state analytics for attribution and partial gifts', () => {
    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={0}
        alertCounts={{ stale: 0, priceChanged: 0, outOfStock: 0, imageIssues: 0 }}
        autoRefreshEnabled
        autoRefreshing={false}
        bulkImportBusy={false}
        bulkReviewCounts={{ repair: 0, duplicates: 0, imageIssues: 0 }}
        budgetUtilization={0}
        claimStats={{ claimedItems: 3, claimedQuantity: 5, fullyClaimedItems: 1, partiallyClaimedItems: 2, namedPurchaserItems: 2, missingPurchaserItems: 1, multiQuantityInProgress: 1, remainingQuantity: 4 }}
        claimAttributionCoverageRate={67}
        counts={{ total: 4, available: 1, partial: 2, purchased: 1, totalValue: 240 }}
        duplicateGroups={[]}
        editItem={null}
        filter="all"
        filtered={[makeItem({ id: 'gift-1' })]}
        fulfillmentRate={25}
        fundStats={{ count: 0, received: 0, goal: 0, readyToShare: 0, needsSetup: 0, readyWithProgress: 0, readyAwaitingFirstGift: 0, withGoal: 0, missingGoal: 0, withProgress: 0, awaitingFirstGift: 0, flexibleWithProgress: 0 }}
        guestVisibilityStats={{ guestReadyItems: 3, guestVisibleItems: 2, visibleAvailableItems: 1, visibleClaimedItems: 1, hiddenPurchasedItems: 1, blockedGuestItems: 1, guestReadyCoverageRate: 75, guestVisibleCoverageRate: 50 }}
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
        handleSyncRegistryThankYouTasks={vi.fn(async () => {})}
        handleToggleRegistryThankYouTask={vi.fn(async () => {})}
        imageRefreshBusy={false}
        items={[makeItem({ id: 'gift-1' })]}
        loading={false}
        monthlyRefreshCap={100}
        monthlyRefreshCount={0}
        mergingDuplicateGroupId={null}
        nearBudgetCap={false}
        normalizedItems={[makeItem({ id: 'gift-1' })]}
        recentActivity={[makeItem({ id: 'gift-1' })]}
        registryActionsOpen={false}
        registryActionsRef={{ current: null }}
        registryInsights={[]}
        registryLaunchReadiness={{ headline: 'Ready', summary: 'Ready', status: 'ready', reviewCount: 0, items: [] }}
        registryThankYouPlan={{ headline: 'Quiet', summary: 'Quiet', purchasedCount: 1, namedPurchaserCount: 0, missingPurchaserCount: 1, completedCount: 0, items: [] }}
        registryThankYouStats={{ purchasedCount: 1, completedCount: 0, pendingCount: 1, readyToSendCount: 0, blockedByMissingPurchaserCount: 1, attributionCoverageRate: 0, completionRate: 0 }}
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
        topRegistryItems={[makeItem({ id: 'gift-1' })]}
        weddingSiteId="site-1"
      />,
    );

    expect(screen.getByText('Claimed gifts')).toBeInTheDocument();
    expect(screen.getByText('2 attributed · 1 need purchaser')).toBeInTheDocument();
    expect(screen.getByText('67% purchaser coverage · 1 fully claimed · 2 partial')).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Claimed gifts: 3 · Attributed: 2'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Purchaser coverage: 67% · Fully claimed gifts: 1'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Partial claims: 2 · Missing purchaser: 1'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Claimed quantity: 5 · Still needed: 4'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Multi-quantity gifts in progress: 1 · Fully claimed gifts: 1'),
    ).toBeInTheDocument();
  });

  it('renders thank-you follow-through analytics for pending and blocked gifts', () => {
    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={0}
        alertCounts={{ stale: 0, priceChanged: 0, outOfStock: 0, imageIssues: 0 }}
        autoRefreshEnabled
        autoRefreshing={false}
        bulkImportBusy={false}
        bulkReviewCounts={{ repair: 0, duplicates: 0, imageIssues: 0 }}
        budgetUtilization={0}
        claimStats={{ claimedItems: 3, claimedQuantity: 4, fullyClaimedItems: 2, partiallyClaimedItems: 1, namedPurchaserItems: 2, missingPurchaserItems: 1, multiQuantityInProgress: 1, remainingQuantity: 2 }}
        claimAttributionCoverageRate={67}
        counts={{ total: 4, available: 1, partial: 1, purchased: 2, totalValue: 320 }}
        duplicateGroups={[]}
        editItem={null}
        filter="all"
        filtered={[makeItem({ id: 'gift-1' })]}
        fulfillmentRate={50}
        fundStats={{ count: 0, received: 0, goal: 0, readyToShare: 0, needsSetup: 0, readyWithProgress: 0, readyAwaitingFirstGift: 0, withGoal: 0, missingGoal: 0, withProgress: 0, awaitingFirstGift: 0, flexibleWithProgress: 0 }}
        guestVisibilityStats={{ guestReadyItems: 3, guestVisibleItems: 2, visibleAvailableItems: 1, visibleClaimedItems: 1, hiddenPurchasedItems: 1, blockedGuestItems: 0, guestReadyCoverageRate: 75, guestVisibleCoverageRate: 50 }}
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
        handleSyncRegistryThankYouTasks={vi.fn(async () => {})}
        handleToggleRegistryThankYouTask={vi.fn(async () => {})}
        imageRefreshBusy={false}
        items={[makeItem({ id: 'gift-1' })]}
        loading={false}
        monthlyRefreshCap={100}
        monthlyRefreshCount={0}
        mergingDuplicateGroupId={null}
        nearBudgetCap={false}
        normalizedItems={[makeItem({ id: 'gift-1' })]}
        recentActivity={[makeItem({ id: 'gift-1' })]}
        registryActionsOpen={false}
        registryActionsRef={{ current: null }}
        registryInsights={[]}
        registryLaunchReadiness={{ headline: 'Ready', summary: 'Ready', status: 'ready', reviewCount: 0, items: [] }}
        registryThankYouPlan={{ headline: 'Thank-you follow-up list', summary: '1 thank-you marked sent. 2 gifts still need follow-up.', purchasedCount: 3, namedPurchaserCount: 2, missingPurchaserCount: 1, completedCount: 1, items: [] }}
        registryThankYouStats={{ purchasedCount: 3, completedCount: 1, pendingCount: 2, readyToSendCount: 1, blockedByMissingPurchaserCount: 1, attributionCoverageRate: 67, completionRate: 33 }}
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
        topRegistryItems={[makeItem({ id: 'gift-1' })]}
        weddingSiteId="site-1"
      />,
    );

    expect(screen.getByText('Thank-yous')).toBeInTheDocument();
    expect(screen.getByText('2 still pending · 1 need purchaser')).toBeInTheDocument();
    expect(screen.getByText('33% ready now · 33% sent · 33% blocked')).toBeInTheDocument();
    expect(screen.getByText('1 ready to send · 1 blocked by purchaser · 67% purchasers named')).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Thank-yous sent: 1 · Still pending: 2'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Ready to send: 1 · Blocked by purchaser: 1'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Attribution coverage: 67% · Follow-up sent: 33%'),
    ).toBeInTheDocument();
  });

  it('renders guest-visible inventory analytics for hidden and blocked gifts', () => {
    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={0}
        alertCounts={{ stale: 0, priceChanged: 0, outOfStock: 0, imageIssues: 0 }}
        autoRefreshEnabled
        autoRefreshing={false}
        bulkImportBusy={false}
        bulkReviewCounts={{ repair: 0, duplicates: 0, imageIssues: 0 }}
        budgetUtilization={0}
        claimStats={{ claimedItems: 3, claimedQuantity: 4, fullyClaimedItems: 2, partiallyClaimedItems: 1, namedPurchaserItems: 2, missingPurchaserItems: 1, multiQuantityInProgress: 1, remainingQuantity: 2 }}
        claimAttributionCoverageRate={67}
        counts={{ total: 4, available: 1, partial: 1, purchased: 2, totalValue: 320 }}
        duplicateGroups={[]}
        editItem={null}
        filter="all"
        filtered={[makeItem({ id: 'gift-1' })]}
        fulfillmentRate={50}
        fundStats={{ count: 0, received: 0, goal: 0, readyToShare: 0, needsSetup: 0, readyWithProgress: 0, readyAwaitingFirstGift: 0, withGoal: 0, missingGoal: 0, withProgress: 0, awaitingFirstGift: 0, flexibleWithProgress: 0 }}
        guestVisibilityStats={{ guestReadyItems: 3, guestVisibleItems: 2, visibleAvailableItems: 1, visibleClaimedItems: 1, hiddenPurchasedItems: 1, blockedGuestItems: 1, guestReadyCoverageRate: 75, guestVisibleCoverageRate: 50 }}
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
        handleSyncRegistryThankYouTasks={vi.fn(async () => {})}
        handleToggleRegistryThankYouTask={vi.fn(async () => {})}
        imageRefreshBusy={false}
        items={[makeItem({ id: 'gift-1' })]}
        loading={false}
        monthlyRefreshCap={100}
        monthlyRefreshCount={0}
        mergingDuplicateGroupId={null}
        nearBudgetCap={false}
        normalizedItems={[makeItem({ id: 'gift-1' })]}
        recentActivity={[makeItem({ id: 'gift-1' })]}
        registryActionsOpen={false}
        registryActionsRef={{ current: null }}
        registryInsights={[]}
        registryLaunchReadiness={{ headline: 'Ready', summary: 'Ready', status: 'ready', reviewCount: 0, items: [] }}
        registryThankYouPlan={{ headline: 'Quiet', summary: 'Quiet', purchasedCount: 1, namedPurchaserCount: 0, missingPurchaserCount: 1, completedCount: 0, items: [] }}
        registryThankYouStats={{ purchasedCount: 1, completedCount: 0, pendingCount: 1, readyToSendCount: 0, blockedByMissingPurchaserCount: 1, attributionCoverageRate: 0, completionRate: 0 }}
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
        topRegistryItems={[makeItem({ id: 'gift-1' })]}
        weddingSiteId="site-1"
      />,
    );

    expect(screen.getByText('Guest view')).toBeInTheDocument();
    expect(screen.getByText('1 ready now · 1 already claimed')).toBeInTheDocument();
    expect(screen.getByText('50% visible to guests · 75% guest-ready · 1 hidden when bought · 1 blocked from guests')).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Guest-visible gifts: 2 · Hidden when purchased: 1'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Guest-ready coverage: 75% · Visible coverage: 50%'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Guest-ready gifts: 3 · Blocked from guests: 1'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Ready for guests now: 1 · Claimed but still visible: 1'),
    ).toBeInTheDocument();
  });
});
