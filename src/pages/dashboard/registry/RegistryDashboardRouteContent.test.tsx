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
            purchaserLabel: 'Purchaser: Alex',
            detail: 'Ready for a thank-you.',
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
    expect(screen.getByText('Missing purchaser names: 0')).toBeInTheDocument();
    expect(screen.getByText('All gifts already marked purchased')).toBeInTheDocument();
    expect(screen.getByText('100% purchaser named · 100% fully claimed · 100% quantity claimed (1) · 0% still open (0)')).toBeInTheDocument();
    expect(screen.getByText('Main gap: no purchaser-name blockers right now')).toBeInTheDocument();
    expect(screen.getByText('Main gap: no guest-visibility blockers right now')).toBeInTheDocument();
    expect(screen.getByText('Main gap: no thank-you blockers right now')).toBeInTheDocument();
    expect(screen.getByText('All claimed gifts already have a purchaser name and are fully closed out.')).toBeInTheDocument();
    expect(screen.getAllByText('All gifts ready for guests are visible right now.')).not.toHaveLength(0);
    expect(screen.getByText('All thank-you follow-up is already closed out right now.')).toBeInTheDocument();
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
            purchaserLabel: 'Purchaser still missing',
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

    expect(screen.getByText('Missing purchaser names: 1')).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Purchasers named: 0 · Missing purchaser names: 1'),
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

  it('derives cleaner registry launch-readiness all-clear wording', () => {
    const derived = buildRegistryDashboardDerivedState({
      autoRefreshEnabled: true,
      items: [
        makeItem({
          id: 'gift-ready',
          item_name: 'Dinner plates',
          item_url: 'https://example.com/gift',
          canonical_url: 'https://example.com/gift',
          purchase_status: 'available',
          quantity_needed: 1,
          quantity_purchased: 0,
          hide_when_purchased: false,
        }),
        makeItem({
          id: 'fund-ready',
          item_name: 'Honeymoon fund',
          item_type: 'cash_fund',
          fund_custom_url: 'https://example.com/fund',
          fund_goal_amount: 500,
          fund_received_amount: 0,
          purchase_status: 'available',
          quantity_needed: 1,
          quantity_purchased: 0,
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

    expect(derived.registryLaunchReadiness.headline).toBe('Registry share setup looks ready to share.');
    expect(derived.registryLaunchReadiness.summary).toBe('Gift links, fund links, and purchase-state basics look ready to share right now.');
    expect(derived.registryLaunchReadiness.items.find((item) => item.id === 'purchase-state')?.detail).toBe('No gifts are marked purchased yet.');
    expect(derived.registryLaunchReadiness.items.find((item) => item.id === 'hide-purchased')?.detail).toBe('No gifts hide after purchase right now.');
  });

  it('derives cleaner registry launch-readiness empty wording', () => {
    const derived = buildRegistryDashboardDerivedState({
      autoRefreshEnabled: true,
      items: [],
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

    expect(derived.registryLaunchReadiness.headline).toBe('Registry share setup is still empty.');
    expect(derived.registryLaunchReadiness.summary).toBe('Add product gifts or funds when you want registry links ready to share.');
    expect(derived.registryLaunchReadiness.items.find((item) => item.id === 'external-links')?.detail).toBe('No product gifts are listed yet, so there are no gift links to share right now.');
    expect(derived.registryLaunchReadiness.items.find((item) => item.id === 'cash-funds')?.detail).toBe('No cash funds are listed right now, which is fine for a gift-only registry.');
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

  it('derives a quiet thank-you plan when no purchased gifts need follow-up yet', () => {
    const derived = buildRegistryDashboardDerivedState({
      autoRefreshEnabled: true,
      items: [
        makeItem({
          id: 'available-gift',
          item_name: 'Dinner plates',
          purchaser_name: null,
          purchase_status: 'available',
          quantity_needed: 1,
          quantity_purchased: 0,
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

    expect(derived.registryThankYouPlan.headline).toBe('Thank-you follow-up is quiet right now');
    expect(derived.registryThankYouPlan.summary).toBe('No purchased gifts need thank-you follow-up right now.');
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

    expect(screen.getByText('100% ready to share · 1 already moving · 1 waiting on a first gift · 1 missing a goal')).toBeInTheDocument();
    expect(screen.getByText('Main gap: 1 still missing a goal')).toBeInTheDocument();
    expect(screen.getByText('50% goal-tracked · 50% already receiving gifts · 1 showing tracked progress · 1 flexible fund already receiving gifts')).toBeInTheDocument();
    expect(screen.getByText('Next gift gap: 1 still missing a goal')).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Ready funds already receiving gifts: 1 · Waiting on first gift: 1'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Flexible funds already receiving gifts: 1 · Tracked progress funds: 1'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Ready-to-share coverage: 100% · Goal-tracked funds: 50%'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Receiving-gift coverage: 50% · Already receiving gifts: 1'),
    ).toBeInTheDocument();
  });

  it('renders fund all-clear readback when every cash fund lane is fully set up and already moving', () => {
    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={0}
        alertCounts={{ stale: 0, priceChanged: 0, outOfStock: 0, imageIssues: 0 }}
        autoRefreshEnabled
        autoRefreshing={false}
        bulkImportBusy={false}
        bulkReviewCounts={{ repair: 0, duplicates: 0, imageIssues: 0 }}
        budgetUtilization={0}
        claimStats={{ claimedItems: 0, claimedQuantity: 0, fullyClaimedItems: 0, partiallyClaimedItems: 0, namedPurchaserItems: 0, missingPurchaserItems: 0, multiQuantityInProgress: 0, remainingQuantity: 0 }}
        counts={{ total: 2, available: 2, partial: 0, purchased: 0, totalValue: 0 }}
        duplicateGroups={[]}
        editItem={null}
        filter="all"
        filtered={[makeItem({ id: 'fund-1' }), makeItem({ id: 'fund-2' })]}
        fulfillmentRate={0}
        fundStats={{ count: 2, received: 2500, goal: 4000, readyToShare: 2, needsSetup: 0, readyWithProgress: 2, readyAwaitingFirstGift: 0, withGoal: 2, missingGoal: 0, withProgress: 2, awaitingFirstGift: 0, flexibleWithProgress: 0 }}
        fundGoalCoverageRate={100}
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

    expect(screen.getByText('Main gap: no fund setup blockers right now')).toBeInTheDocument();
    expect(screen.getByText('Next gift gap: no fund momentum blockers right now')).toBeInTheDocument();
    expect(screen.getByText('All fund links are ready to share right now.')).toBeInTheDocument();
    expect(screen.getByText('All fund momentum blockers are clear right now.')).toBeInTheDocument();
    expect(screen.getByText('No gifts purchased yet')).toBeInTheDocument();
    expect(screen.getByText('Nothing needs review right now')).toBeInTheDocument();
    expect(screen.getByText('No claimed gifts yet')).toBeInTheDocument();
    expect(screen.getByText('No thank-you follow-up open yet')).toBeInTheDocument();
    expect(screen.getByText('No cash funds added yet')).toBeInTheDocument();
    expect(screen.getByText('No fund gifts moving yet')).toBeInTheDocument();
    expect(screen.getByText('Registry snapshot looks clean right now.')).toBeInTheDocument();
    expect(screen.getByText('No active registry watchouts inside this snapshot.')).toBeInTheDocument();
    expect(screen.getByText('No active registry follow-through gaps right now.')).toBeInTheDocument();
    expect(screen.getByText('No gifts are waiting on send or purchaser cleanup right now')).toBeInTheDocument();
    expect(screen.getByText('No fund links are waiting on a share path right now')).toBeInTheDocument();
    expect(screen.getByText('No funds are already receiving gifts yet')).toBeInTheDocument();
    expect(screen.getByText('No goal-tracked fund setup is open right now')).toBeInTheDocument();
    expect(screen.getByText('No flexible or tracked funds are already receiving gifts yet')).toBeInTheDocument();
    expect(screen.getByText('No purchased gifts are in the thank-you list yet.')).toBeInTheDocument();
    expect(screen.getByText('No image issues or duplicate groups')).toBeInTheDocument();
    expect(screen.getByText('No imported-gift cleanup work is open right now.')).toBeInTheDocument();
    expect(screen.getByText('No gifts are waiting in the cleanup queue right now.')).toBeInTheDocument();
  });

  it('summarizes cleanup queue severity before listing repair items', () => {
    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={0}
        alertCounts={{ stale: 0, priceChanged: 0, outOfStock: 0, imageIssues: 0 }}
        autoRefreshEnabled
        autoRefreshing={false}
        bulkImportBusy={false}
        bulkReviewCounts={{ repair: 2, duplicates: 0, imageIssues: 1 }}
        budgetUtilization={0}
        claimStats={{ claimedItems: 0, claimedQuantity: 0, fullyClaimedItems: 0, partiallyClaimedItems: 0, namedPurchaserItems: 0, missingPurchaserItems: 0, multiQuantityInProgress: 0, remainingQuantity: 0 }}
        counts={{ total: 3, available: 3, partial: 0, purchased: 0, totalValue: 240 }}
        duplicateGroups={[]}
        editItem={null}
        filter="all"
        filtered={[makeItem({ id: 'gift-1' }), makeItem({ id: 'gift-2' }), makeItem({ id: 'gift-3' })]}
        fulfillmentRate={0}
        fundStats={{ count: 0, received: 0, goal: 0, readyToShare: 0, needsSetup: 0, readyWithProgress: 0, readyAwaitingFirstGift: 0, withGoal: 0, missingGoal: 0, withProgress: 0, awaitingFirstGift: 0, flexibleWithProgress: 0 }}
        guestVisibilityStats={{ guestReadyItems: 0, guestVisibleItems: 0, visibleAvailableItems: 0, visibleClaimedItems: 0, hiddenPurchasedItems: 0, blockedGuestItems: 0, guestReadyCoverageRate: 0, guestVisibleCoverageRate: 0 }}
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
        items={[makeItem({ id: 'gift-1' }), makeItem({ id: 'gift-2' }), makeItem({ id: 'gift-3' })]}
        loading={false}
        monthlyRefreshCap={100}
        monthlyRefreshCount={0}
        mergingDuplicateGroupId={null}
        nearBudgetCap={false}
        normalizedItems={[makeItem({ id: 'gift-1' }), makeItem({ id: 'gift-2' }), makeItem({ id: 'gift-3' })]}
        recentActivity={[]}
        registryActionsOpen={false}
        registryActionsRef={{ current: null }}
        registryInsights={[]}
        registryLaunchReadiness={{ headline: 'Ready', summary: 'Ready', status: 'ready', reviewCount: 0, items: [] }}
        registryThankYouPlan={{ headline: 'Quiet', summary: 'Quiet', purchasedCount: 0, namedPurchaserCount: 0, missingPurchaserCount: 0, completedCount: 0, items: [] }}
        registryThankYouStats={{ purchasedCount: 0, completedCount: 0, pendingCount: 0, readyToSendCount: 0, blockedByMissingPurchaserCount: 0, attributionCoverageRate: 0, completionRate: 0 }}
        registryThankYouBusyItemId={null}
        registryThankYouSyncing={false}
        repairingBadImports={false}
        repairQueue={[
          {
            id: 'gift-1-broken-import',
            item: makeItem({ id: 'gift-1', item_name: 'Dinner plates' }),
            states: ['broken-import'],
            severity: 'high',
            summary: 'Re-import weak product details',
            detail: 'This gift imported with a broken title or a failed product fetch. Re-import from the source, then review what guests will see.',
            primaryAction: 'reimport-source',
            primaryActionLabel: 'Re-import source',
            secondaryAction: 'review-item',
            secondaryActionLabel: 'Review item',
          },
          {
            id: 'gift-2-partial-import',
            item: makeItem({ id: 'gift-2', item_name: 'Cake stand' }),
            states: ['partial-import', 'proxy-image'],
            severity: 'medium',
            summary: 'Upgrade the product photo',
            detail: 'This gift is still leaning on a fallback preview image. Review it now so guests see a real product photo.',
            primaryAction: 'review-item',
            primaryActionLabel: 'Review item',
            secondaryAction: 'refresh-details',
            secondaryActionLabel: 'Refresh details',
          },
          {
            id: 'gift-3-stale-details',
            item: makeItem({ id: 'gift-3', item_name: 'Serving bowls' }),
            states: ['stale-details'],
            severity: 'low',
            summary: 'Refresh stale registry details',
            detail: 'This gift is due for a freshness check. Refresh it now so price, stock, and merchant details do not drift.',
            primaryAction: 'refresh-details',
            primaryActionLabel: 'Refresh details',
            secondaryAction: 'review-item',
            secondaryActionLabel: 'Review item',
          },
        ]}
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

    expect(screen.getByText('Cleanup queue')).toBeInTheDocument();
    expect(screen.getByText('1 needs attention · 1 review soon · 1 keep fresh.')).toBeInTheDocument();
    expect(screen.getByText('3 gifts still need stronger detail truth, store repair, or fresher product photos.')).toBeInTheDocument();
    expect(screen.getByText('3 waiting')).toBeInTheDocument();
    expect(screen.getByText('Re-import weak product details')).toBeInTheDocument();
    expect(screen.getByText('Upgrade the product photo')).toBeInTheDocument();
    expect(screen.getByText('Refresh stale registry details')).toBeInTheDocument();
  });

  it('summarizes duplicate review before listing merge groups', () => {
    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={0}
        alertCounts={{ stale: 0, priceChanged: 0, outOfStock: 0, imageIssues: 0 }}
        autoRefreshEnabled
        autoRefreshing={false}
        bulkImportBusy={false}
        bulkReviewCounts={{ repair: 0, duplicates: 2, imageIssues: 0 }}
        budgetUtilization={0}
        claimStats={{ claimedItems: 0, claimedQuantity: 0, fullyClaimedItems: 0, partiallyClaimedItems: 0, namedPurchaserItems: 0, missingPurchaserItems: 0, multiQuantityInProgress: 0, remainingQuantity: 0 }}
        counts={{ total: 3, available: 3, partial: 0, purchased: 0, totalValue: 240 }}
        duplicateGroups={[
          {
            id: 'dup-1',
            primaryItem: makeItem({ id: 'gift-1', item_name: 'Dinner plates', quantity_needed: 4, quantity_purchased: 1 }),
            secondaryItems: [
              makeItem({ id: 'gift-2', item_name: 'Dinner plates set', quantity_needed: 2, quantity_purchased: 0 }),
              makeItem({ id: 'gift-3', item_name: 'Dinner plates bundle', quantity_needed: 1, quantity_purchased: 0 }),
            ],
            items: [
              makeItem({ id: 'gift-1', item_name: 'Dinner plates', quantity_needed: 4, quantity_purchased: 1 }),
              makeItem({ id: 'gift-2', item_name: 'Dinner plates set', quantity_needed: 2, quantity_purchased: 0 }),
              makeItem({ id: 'gift-3', item_name: 'Dinner plates bundle', quantity_needed: 1, quantity_purchased: 0 }),
            ],
            mergedQuantityNeeded: 7,
            mergedQuantityPurchased: 1,
            signals: [
              { kind: 'name-match', label: 'Name match', score: 0.95 },
              { kind: 'store-match', label: 'Store match', score: 0.81 },
            ],
          },
        ]}
        editItem={null}
        filter="all"
        filtered={[makeItem({ id: 'gift-1' }), makeItem({ id: 'gift-2' }), makeItem({ id: 'gift-3' })]}
        fulfillmentRate={0}
        fundStats={{ count: 0, received: 0, goal: 0, readyToShare: 0, needsSetup: 0, readyWithProgress: 0, readyAwaitingFirstGift: 0, withGoal: 0, missingGoal: 0, withProgress: 0, awaitingFirstGift: 0, flexibleWithProgress: 0 }}
        guestVisibilityStats={{ guestReadyItems: 0, guestVisibleItems: 0, visibleAvailableItems: 0, visibleClaimedItems: 0, hiddenPurchasedItems: 0, blockedGuestItems: 0, guestReadyCoverageRate: 0, guestVisibleCoverageRate: 0 }}
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
        items={[makeItem({ id: 'gift-1' }), makeItem({ id: 'gift-2' }), makeItem({ id: 'gift-3' })]}
        loading={false}
        monthlyRefreshCap={100}
        monthlyRefreshCount={0}
        mergingDuplicateGroupId={null}
        nearBudgetCap={false}
        normalizedItems={[makeItem({ id: 'gift-1' }), makeItem({ id: 'gift-2' }), makeItem({ id: 'gift-3' })]}
        recentActivity={[]}
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
        topRegistryItems={[makeItem({ id: 'gift-1' })]}
        weddingSiteId="site-1"
      />,
    );

    expect(screen.getByText('Duplicate review')).toBeInTheDocument();
    expect(screen.getByText('1 merge candidate covering 2 repeated gifts.')).toBeInTheDocument();
    expect(screen.getByText('2 match signals are already grouped for review.')).toBeInTheDocument();
    expect(screen.getByText('Possible duplicate group')).toBeInTheDocument();
    expect(screen.getByText('Merge result: 1/7')).toBeInTheDocument();
  });

  it('summarizes cleanup tools before the repair actions', () => {
    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={1}
        alertCounts={{ stale: 0, priceChanged: 0, outOfStock: 0, imageIssues: 2 }}
        autoRefreshEnabled
        autoRefreshing={false}
        bulkImportBusy={false}
        bulkReviewCounts={{ repair: 2, duplicates: 1, imageIssues: 2 }}
        budgetUtilization={0.34}
        claimStats={{ claimedItems: 0, claimedQuantity: 0, fullyClaimedItems: 0, partiallyClaimedItems: 0, namedPurchaserItems: 0, missingPurchaserItems: 0, multiQuantityInProgress: 0, remainingQuantity: 0 }}
        counts={{ total: 3, available: 3, partial: 0, purchased: 0, totalValue: 240 }}
        duplicateGroups={[]}
        editItem={null}
        filter="all"
        filtered={[makeItem({ id: 'gift-1' }), makeItem({ id: 'gift-2' }), makeItem({ id: 'gift-3' })]}
        fulfillmentRate={0}
        fundStats={{ count: 0, received: 0, goal: 0, readyToShare: 0, needsSetup: 0, readyWithProgress: 0, readyAwaitingFirstGift: 0, withGoal: 0, missingGoal: 0, withProgress: 0, awaitingFirstGift: 0, flexibleWithProgress: 0 }}
        guestVisibilityStats={{ guestReadyItems: 0, guestVisibleItems: 0, visibleAvailableItems: 0, visibleClaimedItems: 0, hiddenPurchasedItems: 0, blockedGuestItems: 0, guestReadyCoverageRate: 0, guestVisibleCoverageRate: 0 }}
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
        items={[makeItem({ id: 'gift-1' }), makeItem({ id: 'gift-2' }), makeItem({ id: 'gift-3' })]}
        loading={false}
        monthlyRefreshCap={100}
        monthlyRefreshCount={0}
        mergingDuplicateGroupId={null}
        nearBudgetCap={false}
        normalizedItems={[makeItem({ id: 'gift-1' }), makeItem({ id: 'gift-2' }), makeItem({ id: 'gift-3' })]}
        recentActivity={[]}
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
        refreshBudgetRemaining={66}
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

    expect(screen.getByText('Detail cleanup')).toBeInTheDocument();
    expect(screen.getByText('Duplicate review')).toBeInTheDocument();
    expect(screen.getByText('Image refresh')).toBeInTheDocument();
    expect(screen.getByText('2 detail cleanups · 1 duplicate review · 2 image refreshes still worth a pass.')).toBeInTheDocument();
    expect(screen.getByText('These tools help tidy imported links, repeated gifts, and product photos without merging or deleting anything unless you choose it.')).toBeInTheDocument();
    expect(screen.getByText('Review details')).toBeInTheDocument();
    expect(screen.getByText('Refresh image issues')).toBeInTheDocument();
    expect(screen.getByText('Clean up imported gifts')).toBeInTheDocument();
  });

  it('uses owner-facing labels in the registry toolbar and refresh strip', () => {
    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={1}
        alertCounts={{ stale: 1, priceChanged: 1, outOfStock: 0, imageIssues: 2 }}
        autoRefreshEnabled
        autoRefreshing={false}
        bulkImportBusy={false}
        bulkReviewCounts={{ repair: 2, duplicates: 1, imageIssues: 2 }}
        budgetUtilization={0.34}
        claimStats={{ claimedItems: 0, claimedQuantity: 0, fullyClaimedItems: 0, partiallyClaimedItems: 0, namedPurchaserItems: 0, missingPurchaserItems: 0, multiQuantityInProgress: 0, remainingQuantity: 0 }}
        counts={{ total: 3, available: 3, partial: 0, purchased: 0, totalValue: 240 }}
        duplicateGroups={[]}
        editItem={null}
        filter="all"
        filtered={[makeItem({ id: 'gift-1' }), makeItem({ id: 'gift-2' }), makeItem({ id: 'gift-3' })]}
        fulfillmentRate={0}
        fundStats={{ count: 0, received: 0, goal: 0, readyToShare: 0, needsSetup: 0, readyWithProgress: 0, readyAwaitingFirstGift: 0, withGoal: 0, missingGoal: 0, withProgress: 0, awaitingFirstGift: 0, flexibleWithProgress: 0 }}
        guestVisibilityStats={{ guestReadyItems: 0, guestVisibleItems: 0, visibleAvailableItems: 0, visibleClaimedItems: 0, hiddenPurchasedItems: 0, blockedGuestItems: 0, guestReadyCoverageRate: 0, guestVisibleCoverageRate: 0 }}
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
        items={[makeItem({ id: 'gift-1' }), makeItem({ id: 'gift-2' }), makeItem({ id: 'gift-3' })]}
        loading={false}
        monthlyRefreshCap={100}
        monthlyRefreshCount={12}
        mergingDuplicateGroupId={null}
        nearBudgetCap={false}
        normalizedItems={[makeItem({ id: 'gift-1' }), makeItem({ id: 'gift-2' }), makeItem({ id: 'gift-3' })]}
        recentActivity={[]}
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
        refreshBudgetRemaining={88}
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

    expect(screen.getByText('Weekly refresh running')).toBeInTheDocument();
    expect(screen.getByText('Refresh budget 12/100 this month')).toBeInTheDocument();
    expect(screen.getByText('Focus review items')).toBeInTheDocument();
    expect(screen.getByText('Focus image issues')).toBeInTheDocument();
    expect(screen.getByText('Worth checking: 2')).toBeInTheDocument();
    expect(screen.getByText('Image issues: 2')).toBeInTheDocument();
    expect(screen.getByText('Cleanup queue: 0')).toBeInTheDocument();
    expect(screen.getByText('Gifts with cleanup flags: 0')).toBeInTheDocument();
    expect(screen.getByText('Duplicate review groups: 0')).toBeInTheDocument();
    expect(screen.getByText('Refresh budget used: 34%')).toBeInTheDocument();
  });

  it('renders owner-facing empty registry copy', () => {
    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={0}
        alertCounts={{ stale: 0, priceChanged: 0, outOfStock: 0, imageIssues: 0 }}
        autoRefreshEnabled
        autoRefreshing={false}
        bulkImportBusy={false}
        bulkReviewCounts={{ repair: 0, duplicates: 0, imageIssues: 0 }}
        budgetUtilization={0}
        claimStats={{ claimedItems: 0, claimedQuantity: 0, fullyClaimedItems: 0, partiallyClaimedItems: 0, namedPurchaserItems: 0, missingPurchaserItems: 0, multiQuantityInProgress: 0, remainingQuantity: 0 }}
        counts={{ total: 0, available: 0, partial: 0, purchased: 0, totalValue: 0 }}
        duplicateGroups={[]}
        editItem={null}
        filter="all"
        filtered={[]}
        fulfillmentRate={0}
        fundStats={{ count: 0, received: 0, goal: 0, readyToShare: 0, needsSetup: 0, readyWithProgress: 0, readyAwaitingFirstGift: 0, withGoal: 0, missingGoal: 0, withProgress: 0, awaitingFirstGift: 0, flexibleWithProgress: 0 }}
        guestVisibilityStats={{ guestReadyItems: 0, guestVisibleItems: 0, visibleAvailableItems: 0, visibleClaimedItems: 0, hiddenPurchasedItems: 0, blockedGuestItems: 0, guestReadyCoverageRate: 0, guestVisibleCoverageRate: 0 }}
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
        items={[]}
        loading={false}
        monthlyRefreshCap={100}
        monthlyRefreshCount={0}
        mergingDuplicateGroupId={null}
        nearBudgetCap={false}
        normalizedItems={[]}
        recentActivity={[]}
        registryActionsOpen={false}
        registryActionsRef={{ current: null }}
        registryInsights={[]}
        registryLaunchReadiness={{ headline: 'Empty', summary: 'Empty', status: 'empty', reviewCount: 0, items: [] }}
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
        topRegistryItems={[]}
        weddingSiteId="site-1"
      />,
    );

    expect(screen.getByText('No registry gifts added yet.')).toBeInTheDocument();
    expect(screen.getByText('Add your first gift or fund when you want guests to have registry options.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add your first item/i })).toBeInTheDocument();
  });

  it('renders owner-facing filtered-empty registry copy', () => {
    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={0}
        alertCounts={{ stale: 0, priceChanged: 0, outOfStock: 0, imageIssues: 0 }}
        autoRefreshEnabled
        autoRefreshing={false}
        bulkImportBusy={false}
        bulkReviewCounts={{ repair: 0, duplicates: 0, imageIssues: 0 }}
        budgetUtilization={0}
        claimStats={{ claimedItems: 0, claimedQuantity: 0, fullyClaimedItems: 0, partiallyClaimedItems: 0, namedPurchaserItems: 0, missingPurchaserItems: 0, multiQuantityInProgress: 0, remainingQuantity: 0 }}
        counts={{ total: 1, available: 1, partial: 0, purchased: 0, totalValue: 80 }}
        duplicateGroups={[]}
        editItem={null}
        filter="purchased"
        filtered={[]}
        fulfillmentRate={0}
        fundStats={{ count: 0, received: 0, goal: 0, readyToShare: 0, needsSetup: 0, readyWithProgress: 0, readyAwaitingFirstGift: 0, withGoal: 0, missingGoal: 0, withProgress: 0, awaitingFirstGift: 0, flexibleWithProgress: 0 }}
        guestVisibilityStats={{ guestReadyItems: 0, guestVisibleItems: 0, visibleAvailableItems: 0, visibleClaimedItems: 0, hiddenPurchasedItems: 0, blockedGuestItems: 0, guestReadyCoverageRate: 0, guestVisibleCoverageRate: 0 }}
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
        items={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'available', quantity_needed: 1, quantity_purchased: 0, purchaser_name: null })]}
        loading={false}
        monthlyRefreshCap={100}
        monthlyRefreshCount={0}
        mergingDuplicateGroupId={null}
        nearBudgetCap={false}
        normalizedItems={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'available', quantity_needed: 1, quantity_purchased: 0, purchaser_name: null })]}
        recentActivity={[]}
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
        search="plates"
        setBulkImportOpen={vi.fn()}
        setFilter={vi.fn()}
        setRegistryActionsOpen={vi.fn()}
        setSearch={vi.fn()}
        setShowAlertsOnly={vi.fn()}
        setShowImageIssuesOnly={vi.fn()}
        showAlertsOnly={false}
        showImageIssuesOnly={false}
        topRegistryItems={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'available', quantity_needed: 1, quantity_purchased: 0, purchaser_name: null })]}
        weddingSiteId="site-1"
      />,
    );

    expect(screen.getByText('No registry gifts match this filter right now.')).toBeInTheDocument();
    expect(screen.getByText('Try a broader search or switch filters to bring those gifts back into view.')).toBeInTheDocument();
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
    expect(screen.getByText('2 with purchaser named · 1 still missing purchaser')).toBeInTheDocument();
    expect(screen.getByText('67% purchaser named · 33% fully claimed · 67% partial (2) · 56% quantity claimed (5) · 44% still open (4)')).toBeInTheDocument();
    expect(screen.getByText('Main gap: 1 still need a purchaser name')).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Claimed gifts: 3 · Purchasers named: 2'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Purchasers named: 67% · Fully claimed gifts: 1'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Partial claims: 2 · Missing purchaser names: 1'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Claimed quantity: 5 · Still open: 4'),
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
    expect(screen.getByText('2 still need a thank-you · 1 still missing purchaser')).toBeInTheDocument();
    expect(screen.getByText('33% ready to send · 33% already sent · 33% still missing purchaser')).toBeInTheDocument();
    expect(screen.getByText('1 ready to send · 1 still missing purchaser · 67% with purchaser named')).toBeInTheDocument();
    expect(screen.getByText('Main gap: 1 still missing a purchaser name')).toBeInTheDocument();
    expect(screen.getByText('Main watchouts: 1 gift still missing a purchaser name · 2 thank-yous still pending.')).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Thank-yous sent: 1 · Still pending: 2'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Ready to send: 1 · Missing purchaser names: 1'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Purchasers named: 67% · Thank-yous sent: 33%'),
    ).toBeInTheDocument();
  });

  it('renders guest-visible inventory analytics for hidden and blocked gifts', () => {
    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={0}
        alertCounts={{ stale: 1, priceChanged: 1, outOfStock: 1, imageIssues: 0 }}
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
    expect(screen.getByText('1 stale · 1 price change · 1 out of stock')).toBeInTheDocument();
    expect(screen.getByText('Snapshot focus: 1 gift still missing a purchaser name · 1 blocked from guests · 1 thank-you still pending · 3 items worth checking.')).toBeInTheDocument();
    expect(screen.getByText('Main watchouts: 1 gift still missing a purchaser name · 1 blocked from guests · 1 thank-you still pending · 3 items worth checking.')).toBeInTheDocument();
    expect(screen.getByText('50% visible to guests · 75% ready for guests · 1 hidden when bought · 1 blocked from guests')).toBeInTheDocument();
    expect(screen.getByText('Main gap: 1 still blocked from guests')).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Visible to guests: 2 · Hidden when purchased: 1'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Ready-for-guests coverage: 75% · Visible coverage: 50%'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Ready-for-guests items: 3 · Blocked from guests: 1'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Visible and available now: 1 · Claimed but still visible: 1'),
    ).toBeInTheDocument();
  });

  it('renders guest-view zero-state readback when nothing is visible to guests yet', () => {
    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={0}
        alertCounts={{ stale: 0, priceChanged: 0, outOfStock: 0, imageIssues: 0 }}
        autoRefreshEnabled
        autoRefreshing={false}
        bulkImportBusy={false}
        bulkReviewCounts={{ repair: 0, duplicates: 0, imageIssues: 0 }}
        budgetUtilization={0}
        claimStats={{ claimedItems: 0, claimedQuantity: 0, fullyClaimedItems: 0, partiallyClaimedItems: 0, namedPurchaserItems: 0, missingPurchaserItems: 0, multiQuantityInProgress: 0, remainingQuantity: 0 }}
        counts={{ total: 2, available: 2, partial: 0, purchased: 0, totalValue: 120 }}
        duplicateGroups={[]}
        editItem={null}
        filter="all"
        filtered={[makeItem({ id: 'gift-1' })]}
        fulfillmentRate={0}
        fundStats={{ count: 0, received: 0, goal: 0, readyToShare: 0, needsSetup: 0, readyWithProgress: 0, readyAwaitingFirstGift: 0, withGoal: 0, missingGoal: 0, withProgress: 0, awaitingFirstGift: 0, flexibleWithProgress: 0 }}
        guestVisibilityStats={{ guestReadyItems: 0, guestVisibleItems: 0, visibleAvailableItems: 0, visibleClaimedItems: 0, hiddenPurchasedItems: 0, blockedGuestItems: 0, guestReadyCoverageRate: 0, guestVisibleCoverageRate: 0 }}
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
        topRegistryItems={[makeItem({ id: 'gift-1' })]}
        weddingSiteId="site-1"
      />,
    );

    expect(screen.getByText('No gifts visible to guests yet')).toBeInTheDocument();
    expect(screen.getByText('Main gap: no guest-visibility blockers right now')).toBeInTheDocument();
  });

  it('renders friendly progress and recent-activity wording in supporting registry cards', () => {
    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={0}
        alertCounts={{ stale: 0, priceChanged: 0, outOfStock: 0, imageIssues: 0 }}
        autoRefreshEnabled
        autoRefreshing={false}
        bulkImportBusy={false}
        bulkReviewCounts={{ repair: 0, duplicates: 0, imageIssues: 0 }}
        budgetUtilization={0}
        claimStats={{ claimedItems: 1, claimedQuantity: 2, fullyClaimedItems: 0, partiallyClaimedItems: 1, namedPurchaserItems: 1, missingPurchaserItems: 0, multiQuantityInProgress: 1, remainingQuantity: 1 }}
        counts={{ total: 3, available: 2, partial: 1, purchased: 0, totalValue: 240 }}
        duplicateGroups={[]}
        editItem={null}
        filter="all"
        filtered={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'partial', quantity_needed: 3, quantity_purchased: 2, purchaser_name: 'Alex' })]}
        fulfillmentRate={0}
        fundStats={{ count: 0, received: 0, goal: 0, readyToShare: 0, needsSetup: 0, readyWithProgress: 0, readyAwaitingFirstGift: 0, withGoal: 0, missingGoal: 0, withProgress: 0, awaitingFirstGift: 0, flexibleWithProgress: 0 }}
        guestVisibilityStats={{ guestReadyItems: 1, guestVisibleItems: 1, visibleAvailableItems: 0, visibleClaimedItems: 1, hiddenPurchasedItems: 0, blockedGuestItems: 0, guestReadyCoverageRate: 33, guestVisibleCoverageRate: 33 }}
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
        items={[
          makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'partial', quantity_needed: 3, quantity_purchased: 2, purchaser_name: 'Alex' }),
          makeItem({ id: 'gift-2', item_name: 'Cake stand', purchase_status: 'purchased', quantity_needed: 1, quantity_purchased: 1, purchaser_name: 'Jordan' }),
          makeItem({ id: 'gift-3', item_name: 'Serving bowls', purchase_status: 'available', quantity_needed: 1, quantity_purchased: 0, purchaser_name: null }),
        ]}
        loading={false}
        monthlyRefreshCap={100}
        monthlyRefreshCount={0}
        mergingDuplicateGroupId={null}
        nearBudgetCap={false}
        normalizedItems={[
          makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'partial', quantity_needed: 3, quantity_purchased: 2, purchaser_name: 'Alex' }),
          makeItem({ id: 'gift-2', item_name: 'Cake stand', purchase_status: 'purchased', quantity_needed: 1, quantity_purchased: 1, purchaser_name: 'Jordan' }),
          makeItem({ id: 'gift-3', item_name: 'Serving bowls', purchase_status: 'available', quantity_needed: 1, quantity_purchased: 0, purchaser_name: null }),
        ]}
        recentActivity={[
          makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'partial', quantity_needed: 3, quantity_purchased: 2, purchaser_name: 'Alex' }),
          makeItem({ id: 'gift-2', item_name: 'Cake stand', purchase_status: 'purchased', quantity_needed: 1, quantity_purchased: 1, purchaser_name: 'Jordan' }),
          makeItem({ id: 'gift-3', item_name: 'Serving bowls', purchase_status: 'available', quantity_needed: 1, quantity_purchased: 0, purchaser_name: null }),
        ]}
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
        topRegistryItems={[
          makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'partial', quantity_needed: 3, quantity_purchased: 2, purchaser_name: 'Alex' }),
          makeItem({ id: 'gift-2', item_name: 'Cake stand', purchase_status: 'purchased', quantity_needed: 1, quantity_purchased: 1, purchaser_name: 'Jordan' }),
          makeItem({ id: 'gift-3', item_name: 'Serving bowls', purchase_status: 'available', quantity_needed: 1, quantity_purchased: 0, purchaser_name: null }),
        ]}
        weddingSiteId="site-1"
      />,
    );

    expect(screen.getByText('Top gifts: 1 fully claimed · 1 partially claimed · 1 still fully open.')).toBeInTheDocument();
    expect(screen.getByText('1 purchased · 1 partially claimed · 1 still available')).toBeInTheDocument();
    expect(screen.getByText('1 still open')).toBeInTheDocument();
    expect(screen.getByText('Partially claimed')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent?.includes('Partially claimed by Alex · Updated') ?? false)).toBeInTheDocument();
  });

  it('renders all-clear and empty supporting-card summaries explicitly', () => {
    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={0}
        alertCounts={{ stale: 0, priceChanged: 0, outOfStock: 0, imageIssues: 0 }}
        autoRefreshEnabled
        autoRefreshing={false}
        bulkImportBusy={false}
        bulkReviewCounts={{ repair: 0, duplicates: 0, imageIssues: 0 }}
        budgetUtilization={0}
        claimStats={{ claimedItems: 0, claimedQuantity: 0, fullyClaimedItems: 0, partiallyClaimedItems: 0, namedPurchaserItems: 0, missingPurchaserItems: 0, multiQuantityInProgress: 0, remainingQuantity: 0 }}
        counts={{ total: 1, available: 0, partial: 0, purchased: 1, totalValue: 80 }}
        duplicateGroups={[]}
        editItem={null}
        filter="all"
        filtered={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'purchased', quantity_needed: 1, quantity_purchased: 1, purchaser_name: 'Alex' })]}
        fulfillmentRate={100}
        fundStats={{ count: 0, received: 0, goal: 0, readyToShare: 0, needsSetup: 0, readyWithProgress: 0, readyAwaitingFirstGift: 0, withGoal: 0, missingGoal: 0, withProgress: 0, awaitingFirstGift: 0, flexibleWithProgress: 0 }}
        guestVisibilityStats={{ guestReadyItems: 1, guestVisibleItems: 1, visibleAvailableItems: 0, visibleClaimedItems: 1, hiddenPurchasedItems: 0, blockedGuestItems: 0, guestReadyCoverageRate: 100, guestVisibleCoverageRate: 100 }}
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
        items={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'purchased', quantity_needed: 1, quantity_purchased: 1, purchaser_name: 'Alex' })]}
        loading={false}
        monthlyRefreshCap={100}
        monthlyRefreshCount={0}
        mergingDuplicateGroupId={null}
        nearBudgetCap={false}
        normalizedItems={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'purchased', quantity_needed: 1, quantity_purchased: 1, purchaser_name: 'Alex' })]}
        recentActivity={[]}
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
        topRegistryItems={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'purchased', quantity_needed: 1, quantity_purchased: 1, purchaser_name: 'Alex' })]}
        weddingSiteId="site-1"
      />,
    );

    expect(screen.getByText('Top gifts are already fully claimed right now.')).toBeInTheDocument();
    expect(screen.getByText('No recent registry changes yet.')).toBeInTheDocument();
    expect(screen.getAllByText('No recent registry changes yet.').length).toBeGreaterThan(1);
  });

  it('keeps registry quick check explicit in the all-clear state', () => {
    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={0}
        alertCounts={{ stale: 0, priceChanged: 0, outOfStock: 0, imageIssues: 0 }}
        autoRefreshEnabled
        autoRefreshing={false}
        bulkImportBusy={false}
        bulkReviewCounts={{ repair: 0, duplicates: 0, imageIssues: 0 }}
        budgetUtilization={0}
        claimStats={{ claimedItems: 0, claimedQuantity: 0, fullyClaimedItems: 0, partiallyClaimedItems: 0, namedPurchaserItems: 0, missingPurchaserItems: 0, multiQuantityInProgress: 0, remainingQuantity: 0 }}
        counts={{ total: 1, available: 0, partial: 0, purchased: 1, totalValue: 80 }}
        duplicateGroups={[]}
        editItem={null}
        filter="all"
        filtered={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'purchased', quantity_needed: 1, quantity_purchased: 1, purchaser_name: 'Alex' })]}
        fulfillmentRate={100}
        fundStats={{ count: 0, received: 0, goal: 0, readyToShare: 0, needsSetup: 0, readyWithProgress: 0, readyAwaitingFirstGift: 0, withGoal: 0, missingGoal: 0, withProgress: 0, awaitingFirstGift: 0, flexibleWithProgress: 0 }}
        guestVisibilityStats={{ guestReadyItems: 1, guestVisibleItems: 1, visibleAvailableItems: 0, visibleClaimedItems: 1, hiddenPurchasedItems: 0, blockedGuestItems: 0, guestReadyCoverageRate: 100, guestVisibleCoverageRate: 100 }}
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
        items={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'purchased', quantity_needed: 1, quantity_purchased: 1, purchaser_name: 'Alex' })]}
        loading={false}
        monthlyRefreshCap={100}
        monthlyRefreshCount={0}
        mergingDuplicateGroupId={null}
        nearBudgetCap={false}
        normalizedItems={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'purchased', quantity_needed: 1, quantity_purchased: 1, purchaser_name: 'Alex' })]}
        recentActivity={[]}
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
        topRegistryItems={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'purchased', quantity_needed: 1, quantity_purchased: 1, purchaser_name: 'Alex' })]}
        weddingSiteId="site-1"
      />,
    );

    expect(screen.getByText('Registry quick check')).toBeInTheDocument();
    expect(screen.getByText('No quick registry fixes worth flagging right now.')).toBeInTheDocument();
    expect(screen.getByText('No quick cleanup prompts right now.')).toBeInTheDocument();
  });

  it('surfaces registry share readiness in the all-clear state', () => {
    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={0}
        alertCounts={{ stale: 0, priceChanged: 0, outOfStock: 0, imageIssues: 0 }}
        autoRefreshEnabled
        autoRefreshing={false}
        bulkImportBusy={false}
        bulkReviewCounts={{ repair: 0, duplicates: 0, imageIssues: 0 }}
        budgetUtilization={0}
        claimStats={{ claimedItems: 0, claimedQuantity: 0, fullyClaimedItems: 0, partiallyClaimedItems: 0, namedPurchaserItems: 0, missingPurchaserItems: 0, multiQuantityInProgress: 0, remainingQuantity: 0 }}
        counts={{ total: 1, available: 1, partial: 0, purchased: 0, totalValue: 80 }}
        duplicateGroups={[]}
        editItem={null}
        filter="all"
        filtered={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'available', quantity_needed: 1, quantity_purchased: 0, purchaser_name: null })]}
        fulfillmentRate={0}
        fundStats={{ count: 0, received: 0, goal: 0, readyToShare: 0, needsSetup: 0, readyWithProgress: 0, readyAwaitingFirstGift: 0, withGoal: 0, missingGoal: 0, withProgress: 0, awaitingFirstGift: 0, flexibleWithProgress: 0 }}
        guestVisibilityStats={{ guestReadyItems: 1, guestVisibleItems: 1, visibleAvailableItems: 1, visibleClaimedItems: 0, hiddenPurchasedItems: 0, blockedGuestItems: 0, guestReadyCoverageRate: 100, guestVisibleCoverageRate: 100 }}
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
        items={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'available', quantity_needed: 1, quantity_purchased: 0, purchaser_name: null })]}
        loading={false}
        monthlyRefreshCap={100}
        monthlyRefreshCount={0}
        mergingDuplicateGroupId={null}
        nearBudgetCap={false}
        normalizedItems={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'available', quantity_needed: 1, quantity_purchased: 0, purchaser_name: null })]}
        recentActivity={[]}
        registryActionsOpen={false}
        registryActionsRef={{ current: null }}
        registryInsights={[]}
        registryLaunchReadiness={{
          headline: 'Registry share setup looks ready to share.',
          summary: 'Gift links, fund links, and purchase-state basics look ready to share right now.',
          status: 'ready',
          reviewCount: 0,
          items: [
            { id: 'external-links', label: 'Gift links ready to share', detail: '1 product gift is ready to share (100% coverage).', tone: 'ready' },
            { id: 'hide-purchased', label: 'Hide after purchase', detail: 'No gifts hide after purchase right now.', tone: 'ready' },
          ],
        }}
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
        topRegistryItems={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'available', quantity_needed: 1, quantity_purchased: 0, purchaser_name: null })]}
        weddingSiteId="site-1"
      />,
    );

    expect(screen.getByText('Registry share readiness')).toBeInTheDocument();
    expect(screen.getByText('Registry share setup looks ready to share.')).toBeInTheDocument();
    expect(screen.getByText('No registry share blockers right now.')).toBeInTheDocument();
    expect(screen.getByText('0 to review')).toBeInTheDocument();
    expect(screen.getAllByText('Ready').length).toBeGreaterThan(0);
  });

  it('surfaces registry share readiness review details when follow-through is still open', () => {
    render(
      <RegistryDashboardRouteContent
        actionableBadImportCount={0}
        alertCounts={{ stale: 0, priceChanged: 0, outOfStock: 0, imageIssues: 0 }}
        autoRefreshEnabled
        autoRefreshing={false}
        bulkImportBusy={false}
        bulkReviewCounts={{ repair: 0, duplicates: 0, imageIssues: 0 }}
        budgetUtilization={0}
        claimStats={{ claimedItems: 0, claimedQuantity: 0, fullyClaimedItems: 0, partiallyClaimedItems: 0, namedPurchaserItems: 0, missingPurchaserItems: 0, multiQuantityInProgress: 0, remainingQuantity: 0 }}
        counts={{ total: 1, available: 1, partial: 0, purchased: 0, totalValue: 80 }}
        duplicateGroups={[]}
        editItem={null}
        filter="all"
        filtered={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'available', quantity_needed: 1, quantity_purchased: 0, purchaser_name: null })]}
        fulfillmentRate={0}
        fundStats={{ count: 1, received: 0, goal: 0, readyToShare: 0, needsSetup: 1, readyWithProgress: 0, readyAwaitingFirstGift: 0, withGoal: 0, missingGoal: 0, withProgress: 0, awaitingFirstGift: 0, flexibleWithProgress: 0 }}
        guestVisibilityStats={{ guestReadyItems: 0, guestVisibleItems: 0, visibleAvailableItems: 0, visibleClaimedItems: 0, hiddenPurchasedItems: 0, blockedGuestItems: 1, guestReadyCoverageRate: 0, guestVisibleCoverageRate: 0 }}
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
        items={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'available', quantity_needed: 1, quantity_purchased: 0, purchaser_name: null })]}
        loading={false}
        monthlyRefreshCap={100}
        monthlyRefreshCount={0}
        mergingDuplicateGroupId={null}
        nearBudgetCap={false}
        normalizedItems={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'available', quantity_needed: 1, quantity_purchased: 0, purchaser_name: null })]}
        recentActivity={[]}
        registryActionsOpen={false}
        registryActionsRef={{ current: null }}
        registryInsights={[]}
        registryLaunchReadiness={{
          headline: 'A few registry share details still need review.',
          summary: '2 link or fund setup items still need a quick share-readiness check.',
          status: 'needs-review',
          reviewCount: 2,
          items: [
            { id: 'external-links', label: 'Gift links ready to share', detail: '0 product gifts are ready to share (0% coverage). 1 product gift still need a share-safe link.', tone: 'review' },
            { id: 'cash-funds', label: 'Fund links ready to share', detail: '0 cash funds are ready to share (0% coverage). 1 cash fund still need a share path or handle.', tone: 'review' },
          ],
        }}
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
        topRegistryItems={[makeItem({ id: 'gift-1', item_name: 'Dinner plates', purchase_status: 'available', quantity_needed: 1, quantity_purchased: 0, purchaser_name: null })]}
        weddingSiteId="site-1"
      />,
    );

    expect(screen.getByText('A few registry share details still need review.')).toBeInTheDocument();
    expect(screen.getByText('2 registry share details still need review.')).toBeInTheDocument();
    expect(screen.getByText('2 to review')).toBeInTheDocument();
    expect(screen.getAllByText('Needs review').length).toBeGreaterThan(0);
    expect(screen.getByText('Fund links ready to share')).toBeInTheDocument();
  });

  it('summarizes mixed registry quick-check prompts before the cards', () => {
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
        filtered={[makeItem({ id: 'fund-1', purchaser_name: null, purchase_status: 'partial', item_type: 'cash_fund', fund_goal_amount: null, fund_received_amount: 0, fund_custom_url: null, fund_paypal_url: null, fund_venmo_url: null, fund_zelle_handle: null })]}
        fulfillmentRate={0}
        fundStats={{ count: 1, received: 0, goal: 0, readyToShare: 0, needsSetup: 1, readyWithProgress: 0, readyAwaitingFirstGift: 0, withGoal: 0, missingGoal: 1, withProgress: 0, awaitingFirstGift: 0, flexibleWithProgress: 0 }}
        guestVisibilityStats={{ guestReadyItems: 0, guestVisibleItems: 0, visibleAvailableItems: 0, visibleClaimedItems: 0, hiddenPurchasedItems: 0, blockedGuestItems: 1, guestReadyCoverageRate: 0, guestVisibleCoverageRate: 0 }}
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
        items={[makeItem({ id: 'fund-1', purchaser_name: null, purchase_status: 'partial', item_type: 'cash_fund', fund_goal_amount: null, fund_received_amount: 0, fund_custom_url: null, fund_paypal_url: null, fund_venmo_url: null, fund_zelle_handle: null })]}
        loading={false}
        monthlyRefreshCap={100}
        monthlyRefreshCount={0}
        mergingDuplicateGroupId={null}
        nearBudgetCap={false}
        normalizedItems={[makeItem({ id: 'fund-1', purchaser_name: null, purchase_status: 'partial', item_type: 'cash_fund', fund_goal_amount: null, fund_received_amount: 0, fund_custom_url: null, fund_paypal_url: null, fund_venmo_url: null, fund_zelle_handle: null })]}
        recentActivity={[]}
        registryActionsOpen={false}
        registryActionsRef={{ current: null }}
        registryInsights={[
          { id: 'registry-fund-setup', area: 'registry', priority: 'next', title: 'Cash fund setup', detail: '1 cash fund still needs a share path or handle before it is easy to share.', actionLabel: 'Review cash funds', source: 'deterministic', confidence: 0.88 },
          { id: 'registry-fund-goals', area: 'registry', priority: 'polish', title: 'Track one simple goal', detail: '1 cash fund could use a simple goal so progress reads clearly for you and your guests.', actionLabel: 'Add fund goals', source: 'deterministic', confidence: 0.76 },
        ]}
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
        topRegistryItems={[makeItem({ id: 'fund-1', purchaser_name: null, purchase_status: 'partial' })]}
        weddingSiteId="site-1"
      />,
    );

    expect(screen.getByText('1 next-step fix · 1 polish cleanup worth a quick pass.')).toBeInTheDocument();
    expect(screen.getByText('Cash fund setup')).toBeInTheDocument();
    expect(screen.getByText('Track one simple goal')).toBeInTheDocument();
  });
});
