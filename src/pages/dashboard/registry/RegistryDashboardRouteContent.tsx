import type React from 'react';
import { DashboardPageHero } from '../../../components/dashboard/DashboardPageHero';
import { DashboardStateBlock } from '../../../components/dashboard/DashboardStateBlock';
import { ActionsMenu, Button, Card } from '../../../components/ui';
import { CheckCircle2, DollarSign, Gift, Package, Plus, Search, Sparkles } from 'lucide-react';
import { RegistryItemCard } from './RegistryItemCard';
import type { RegistryDuplicateGroup } from './duplicateRegistryItems';
import { getRegistryRepairStates } from './repairState';
import type { RegistryRepairActionKind, RegistryRepairQueueItem } from './repairState';
import type { RegistryFilter, RegistryItem } from './registryTypes';
import { formatRegistryItemDate } from '../registryItemTime';

const FILTER_TABS: { key: RegistryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'purchased', label: 'Purchased' },
];

type Counts = {
  total: number;
  available: number;
  partial: number;
  purchased: number;
  totalValue: number;
};

type RegistryLaunchReadiness = {
  headline: string;
  summary: string;
  status: string;
  reviewCount: number;
  items: Array<{ id: string; label: string; detail: string; tone: string }>;
};

type RegistryThankYouPlan = {
  headline: string;
  summary: string;
  namedPurchaserCount: number;
  purchasedCount: number;
  missingPurchaserCount: number;
  completedCount: number;
  items: Array<{
    id: string;
    giftName: string;
    purchaserLabel: string;
    detail: string;
    status: string;
    taskStatus: 'todo' | 'done' | 'needs-purchaser';
    completedAt: string | null;
  }>;
};

type RegistryInsight = {
  id: string;
  title: string;
  detail: string;
  actionLabel: string;
};

type TopRegistryItem = RegistryItem & { quantity_needed?: number | null; quantity_purchased?: number | null };

type FundStats = {
  count: number;
  received: number;
  goal: number;
  readyToShare: number;
  needsSetup: number;
  readyWithProgress: number;
  readyAwaitingFirstGift: number;
  withGoal: number;
  missingGoal: number;
  withProgress: number;
  awaitingFirstGift: number;
  flexibleWithProgress: number;
};

type ClaimStats = {
  claimedItems: number;
  claimedQuantity: number;
  fullyClaimedItems: number;
  partiallyClaimedItems: number;
  namedPurchaserItems: number;
  missingPurchaserItems: number;
  multiQuantityInProgress: number;
  remainingQuantity: number;
};

type RegistryThankYouStats = {
  purchasedCount: number;
  completedCount: number;
  pendingCount: number;
  readyToSendCount: number;
  blockedByMissingPurchaserCount: number;
  attributionCoverageRate: number;
  completionRate: number;
};

type GuestVisibilityStats = {
  guestReadyItems: number;
  guestVisibleItems: number;
  visibleAvailableItems: number;
  visibleClaimedItems: number;
  hiddenPurchasedItems: number;
  blockedGuestItems: number;
  guestReadyCoverageRate?: number;
  guestVisibleCoverageRate?: number;
};

type AlertCounts = {
  stale: number;
  priceChanged: number;
  outOfStock: number;
  imageIssues: number;
};

type BulkReviewCounts = {
  repair: number;
  duplicates: number;
  imageIssues: number;
};

export function RegistryDashboardRouteContent(props: {
  actionableBadImportCount: number;
  alertCounts: AlertCounts;
  autoRefreshEnabled: boolean;
  autoRefreshing: boolean;
  bulkImportBusy: boolean;
  bulkReviewCounts: BulkReviewCounts;
  budgetUtilization: number;
  claimStats: ClaimStats;
  claimAttributionCoverageRate?: number;
  counts: Counts;
  duplicateGroups: RegistryDuplicateGroup[];
  editItem: RegistryItem | null;
  filter: RegistryFilter;
  filtered: RegistryItem[];
  fulfillmentRate: number;
  fundStats: FundStats;
  fundGoalCoverageRate?: number;
  fundShareReadyRate?: number;
  guestVisibilityStats: GuestVisibilityStats;
  handleAddNew: () => void;
  handleAutoRefreshStale: (silent?: boolean, alertsOnly?: boolean) => Promise<void>;
  handleBulkImport: (urls: string) => Promise<void>;
  handleCopyDuplicateReviewList: () => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleEdit: (item: RegistryItem) => void;
  handleMergeDuplicateGroup: (group: RegistryDuplicateGroup) => Promise<void>;
  handleMarkPurchased: (item: RegistryItem, qty: number) => Promise<void>;
  handleResetPurchaseState: (item: RegistryItem) => Promise<void>;
  handleRefetchMetadata: (item: RegistryItem, silent?: boolean, replaceExisting?: boolean) => Promise<boolean>;
  handleRefreshImageIssues: () => Promise<void>;
  handleRepairBadImports: () => Promise<void>;
  handleSyncRegistryThankYouTasks: () => Promise<void>;
  handleToggleRegistryThankYouTask: (itemId: string) => Promise<void>;
  handleRunRepairQueueAction: (queueItem: RegistryRepairQueueItem, action: RegistryRepairActionKind) => Promise<void>;
  imageRefreshBusy: boolean;
  items: RegistryItem[];
  loading: boolean;
  monthlyRefreshCap: number;
  monthlyRefreshCount: number;
  mergingDuplicateGroupId: string | null;
  nearBudgetCap: boolean;
  normalizedItems: RegistryItem[];
  recentActivity: RegistryItem[];
  repairQueue: RegistryRepairQueueItem[];
  refreshBudgetRemaining: number;
  refreshWindowOpen: boolean;
  registryActionsOpen: boolean;
  registryActionsRef: React.RefObject<HTMLDivElement>;
  registryInsights: RegistryInsight[];
  registryLaunchReadiness: RegistryLaunchReadiness;
  registryThankYouPlan: RegistryThankYouPlan;
  registryThankYouStats: RegistryThankYouStats;
  registryThankYouBusyItemId: string | null;
  registryThankYouSyncing: boolean;
  repairingBadImports: boolean;
  search: string;
  setBulkImportOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setFilter: React.Dispatch<React.SetStateAction<RegistryFilter>>;
  setRegistryActionsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  setShowAlertsOnly: React.Dispatch<React.SetStateAction<boolean>>;
  setShowImageIssuesOnly: React.Dispatch<React.SetStateAction<boolean>>;
  showAlertsOnly: boolean;
  showImageIssuesOnly: boolean;
  topRegistryItems: TopRegistryItem[];
  weddingSiteId: string | null;
}) {
  const claimAttributionCoverageRate = props.claimAttributionCoverageRate ?? 0;
  const fundGoalCoverageRate = props.fundGoalCoverageRate ?? 0;
  const fundShareReadyRate = props.fundShareReadyRate ?? 0;
  const fullyClaimedCoverageRate = props.claimStats.claimedItems > 0
    ? Math.round((props.claimStats.fullyClaimedItems / props.claimStats.claimedItems) * 100)
    : 0;
  const partialClaimCoverageRate = props.claimStats.claimedItems > 0
    ? Math.round((props.claimStats.partiallyClaimedItems / props.claimStats.claimedItems) * 100)
    : 0;
  const totalClaimQuantityScope = props.claimStats.claimedQuantity + props.claimStats.remainingQuantity;
  const claimedQuantityCoverageRate = totalClaimQuantityScope > 0
    ? Math.round((props.claimStats.claimedQuantity / totalClaimQuantityScope) * 100)
    : 0;
  const unclaimedQuantityCoverageRate = totalClaimQuantityScope > 0
    ? Math.round((props.claimStats.remainingQuantity / totalClaimQuantityScope) * 100)
    : 0;
  const thankYouReadyCoverageRate = props.registryThankYouStats.purchasedCount > 0
    ? Math.round((props.registryThankYouStats.readyToSendCount / props.registryThankYouStats.purchasedCount) * 100)
    : 0;
  const thankYouBlockedCoverageRate = props.registryThankYouStats.purchasedCount > 0
    ? Math.round((props.registryThankYouStats.blockedByMissingPurchaserCount / props.registryThankYouStats.purchasedCount) * 100)
    : 0;
  const guestReadyCoverageRate = props.guestVisibilityStats.guestReadyCoverageRate ?? 0;
  const guestVisibleCoverageRate = props.guestVisibilityStats.guestVisibleCoverageRate ?? 0;
  const fundReceivingCoverageRate = props.fundStats.count > 0
    ? Math.round((props.fundStats.withProgress / props.fundStats.count) * 100)
    : 0;
  const claimGapLabel = props.claimStats.missingPurchaserItems > 0
    ? `Main gap: ${props.claimStats.missingPurchaserItems} still need purchaser attribution`
    : props.claimStats.partiallyClaimedItems > 0
      ? `Main gap: ${props.claimStats.partiallyClaimedItems} partial claim${props.claimStats.partiallyClaimedItems === 1 ? '' : 's'} still need follow-through`
      : 'Main gap: no claim attribution blockers';
  const guestVisibilityGapLabel = props.guestVisibilityStats.blockedGuestItems > 0
    ? `Main gap: ${props.guestVisibilityStats.blockedGuestItems} still blocked from guests`
    : props.guestVisibilityStats.hiddenPurchasedItems > 0
      ? `Main gap: ${props.guestVisibilityStats.hiddenPurchasedItems} hidden after purchase`
      : 'Main gap: no guest-visibility blockers';
  const thankYouGapLabel = props.registryThankYouStats.blockedByMissingPurchaserCount > 0
    ? `Main gap: ${props.registryThankYouStats.blockedByMissingPurchaserCount} waiting on purchaser attribution`
    : props.registryThankYouStats.pendingCount > 0
      ? `Main gap: ${props.registryThankYouStats.pendingCount} still need a send`
      : 'Main gap: no thank-you blockers';
  const fundSetupGapLabel = props.fundStats.needsSetup > 0
    ? `Main gap: ${props.fundStats.needsSetup} still need a payment path`
    : props.fundStats.missingGoal > 0
      ? `Main gap: ${props.fundStats.missingGoal} still missing a goal`
      : props.fundStats.readyAwaitingFirstGift > 0
        ? `Main gap: ${props.fundStats.readyAwaitingFirstGift} waiting on a first gift`
        : 'Main gap: no fund setup blockers';
  const fundMomentumGapLabel = props.fundStats.missingGoal > 0
    ? `Next gift gap: ${props.fundStats.missingGoal} still missing a goal`
    : props.fundStats.readyAwaitingFirstGift > 0
      ? `Next gift gap: ${props.fundStats.readyAwaitingFirstGift} waiting on a first gift`
      : props.fundStats.needsSetup > 0
        ? `Next gift gap: ${props.fundStats.needsSetup} still need a payment path`
        : 'Next gift gap: no fund momentum blockers';

  const tabCount = (key: RegistryFilter) => {
    if (key === 'all') return props.counts.total;
    if (key === 'available') return props.counts.available;
    if (key === 'partial') return props.counts.partial;
    if (key === 'purchased') return props.counts.purchased;
    return 0;
  };

  return (
    <div className="max-w-[1100px] mx-auto space-y-5">
      <DashboardPageHero
        eyebrow="Registry"
        title="Keep gifts helpful, optional, and easy for guests."
        description="Add links from any store, keep images and availability fresh, and show gentle registry ideas without making the page feel pushy."
        stats={[
          { label: 'Gifts', value: props.counts.total, detail: `${props.counts.available + props.counts.partial} still available` },
          { label: 'Purchased', value: props.counts.purchased, detail: `${props.fulfillmentRate}% complete` },
          { label: 'Worth checking', value: props.alertCounts.stale + props.alertCounts.priceChanged + props.alertCounts.outOfStock, detail: 'quick review items' },
        ]}
        actions={
          <>
            <ActionsMenu
              label="More"
              open={props.registryActionsOpen}
              onToggle={() => props.setRegistryActionsOpen((value) => !value)}
              align="left"
              menuRef={props.registryActionsRef}
            >
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { props.setShowImageIssuesOnly(true); props.setShowAlertsOnly(false); props.setRegistryActionsOpen(false); }}>
                Focus image issues
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { void props.handleRefreshImageIssues(); props.setRegistryActionsOpen(false); }} disabled={props.imageRefreshBusy}>
                {props.imageRefreshBusy ? 'Refreshing image issues…' : 'Refresh image issues'}
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { props.setBulkImportOpen(true); props.setRegistryActionsOpen(false); }} disabled={!props.weddingSiteId}>
                Add a list of links
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { void props.handleRepairBadImports(); props.setRegistryActionsOpen(false); }} disabled={props.repairingBadImports}>
                {props.repairingBadImports ? 'Cleaning up imported gifts…' : 'Clean up imported gifts'}
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { void props.handleAutoRefreshStale(false); props.setRegistryActionsOpen(false); }} disabled={!props.weddingSiteId || props.autoRefreshing || !props.refreshWindowOpen || props.refreshBudgetRemaining <= 0}>
                {props.autoRefreshing ? 'Refreshing…' : 'Refresh stale gift details'}
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { void props.handleAutoRefreshStale(false, true); props.setRegistryActionsOpen(false); }} disabled={!props.weddingSiteId || props.autoRefreshing || !props.refreshWindowOpen || props.refreshBudgetRemaining <= 0}>
                {props.autoRefreshing ? 'Refreshing…' : 'Refresh gifts worth checking'}
              </Button>
            </ActionsMenu>
            <Button variant="primary" size="md" onClick={props.handleAddNew} disabled={!props.weddingSiteId}>
              <Plus className="w-4 h-4" />
              Add gift
            </Button>
          </>
        }
      >
        <div className="inline-flex flex-wrap items-center gap-2 text-[11px] text-text-tertiary">
          <span className="rounded-lg border border-border-subtle bg-white px-2 py-0.5">
            {props.autoRefreshEnabled ? (props.refreshWindowOpen ? 'Weekly refresh on' : 'Refresh window closed') : 'Refresh paused'}
          </span>
          <span>Monthly refreshes {props.monthlyRefreshCount}/{props.monthlyRefreshCap}</span>
        </div>
      </DashboardPageHero>

      <details className="rounded-lg border border-border-subtle bg-white/80 p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-text-primary">
          Gift snapshot and review details
        </summary>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Gift, bg: 'bg-primary-light', color: 'text-primary', val: props.counts.total, label: 'Gifts' },
              { icon: CheckCircle2, bg: 'bg-success-light', color: 'text-success', val: props.counts.purchased, label: 'Purchased' },
              { icon: Package, bg: 'bg-surface-subtle', color: 'text-text-secondary', val: props.counts.available + props.counts.partial, label: 'Remaining' },
              { icon: DollarSign, bg: 'bg-primary-light', color: 'text-primary', val: `$${props.counts.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, label: 'Estimated value' },
            ].map(({ icon: Icon, bg, color, val, label }) => (
              <Card key={label} variant="bordered" padding="md">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 ${bg} rounded-lg flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary leading-none">{val}</p>
                    <p className="text-xs text-text-secondary mt-1">{label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <Card variant="bordered" padding="md">
              <p className="text-xs font-medium text-text-tertiary">Gift progress</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{props.fulfillmentRate}%</p>
              <p className="mt-1 text-xs text-text-secondary">Items already marked purchased</p>
            </Card>
            <Card variant="bordered" padding="md">
              <p className="text-xs font-medium text-text-tertiary">Claimed gifts</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{props.claimStats.claimedItems}</p>
              <p className="mt-1 text-xs text-text-secondary">
                {props.claimStats.namedPurchaserItems} attributed{props.claimStats.missingPurchaserItems > 0 ? ` · ${props.claimStats.missingPurchaserItems} need purchaser` : ''}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {claimAttributionCoverageRate}% purchaser coverage · {fullyClaimedCoverageRate}% fully closed{props.claimStats.partiallyClaimedItems > 0 ? ` · ${partialClaimCoverageRate}% partial (${props.claimStats.partiallyClaimedItems})` : ''}{totalClaimQuantityScope > 0 ? ` · ${claimedQuantityCoverageRate}% quantity claimed (${props.claimStats.claimedQuantity}) · ${unclaimedQuantityCoverageRate}% still unclaimed (${props.claimStats.remainingQuantity})` : ''}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">{claimGapLabel}</p>
            </Card>
            <Card variant="bordered" padding="md">
              <p className="text-xs font-medium text-text-tertiary">Guest view</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{props.guestVisibilityStats.guestVisibleItems}</p>
              <p className="mt-1 text-xs text-text-secondary">
                {props.guestVisibilityStats.visibleAvailableItems} ready now · {props.guestVisibilityStats.visibleClaimedItems} already claimed
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {guestVisibleCoverageRate}% visible to guests · {guestReadyCoverageRate}% guest-ready · {props.guestVisibilityStats.hiddenPurchasedItems} hidden when bought{props.guestVisibilityStats.blockedGuestItems > 0 ? ` · ${props.guestVisibilityStats.blockedGuestItems} blocked from guests` : ''}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">{guestVisibilityGapLabel}</p>
            </Card>
            <Card variant="bordered" padding="md">
              <p className="text-xs font-medium text-text-tertiary">Thank-yous</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{props.registryThankYouStats.completedCount}</p>
              <p className="mt-1 text-xs text-text-secondary">
                {props.registryThankYouStats.pendingCount} still pending{props.registryThankYouStats.blockedByMissingPurchaserCount > 0 ? ` · ${props.registryThankYouStats.blockedByMissingPurchaserCount} need purchaser` : ''}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {thankYouReadyCoverageRate}% ready now · {props.registryThankYouStats.completionRate}% sent{props.registryThankYouStats.blockedByMissingPurchaserCount > 0 ? ` · ${thankYouBlockedCoverageRate}% blocked` : ''}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {props.registryThankYouStats.readyToSendCount} ready to send{props.registryThankYouStats.blockedByMissingPurchaserCount > 0 ? ` · ${props.registryThankYouStats.blockedByMissingPurchaserCount} blocked by purchaser` : ''}
                {props.registryThankYouStats.purchasedCount > 0 ? ` · ${props.registryThankYouStats.attributionCoverageRate}% purchasers named` : ''}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">{thankYouGapLabel}</p>
            </Card>
            <Card variant="bordered" padding="md">
              <p className="text-xs font-medium text-text-tertiary">Cash funds</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{props.fundStats.count}</p>
              <p className="mt-1 text-xs text-text-secondary">
                {props.fundStats.readyToShare} ready to share{props.fundStats.needsSetup > 0 ? ` · ${props.fundStats.needsSetup} need a payment path` : ''}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {fundShareReadyRate}% share-ready · {props.fundStats.readyWithProgress} already moving{props.fundStats.readyAwaitingFirstGift > 0 ? ` · ${props.fundStats.readyAwaitingFirstGift} waiting on a first gift` : ''}{props.fundStats.missingGoal > 0 ? ` · ${props.fundStats.missingGoal} missing a goal` : ''}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">{fundSetupGapLabel}</p>
            </Card>
            <Card variant="bordered" padding="md">
              <p className="text-xs font-medium text-text-tertiary">Fund gifts</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">${props.fundStats.received.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
              <p className="mt-1 text-xs text-text-secondary">
                Received toward ${props.fundStats.goal.toLocaleString('en-US', { maximumFractionDigits: 0 })} goal
                {props.fundStats.withGoal > 0 ? ` across ${props.fundStats.withGoal} tracked fund${props.fundStats.withGoal === 1 ? '' : 's'}` : ''}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {fundGoalCoverageRate}% goal-tracked · {fundReceivingCoverageRate}% already receiving gifts · {props.fundStats.withProgress} showing tracked progress{props.fundStats.flexibleWithProgress > 0 ? ` · ${props.fundStats.flexibleWithProgress} flexible fund${props.fundStats.flexibleWithProgress === 1 ? '' : 's'} already receiving gifts` : ''}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">{fundMomentumGapLabel}</p>
            </Card>
            <Card variant="bordered" padding="md">
              <p className="text-xs font-medium text-text-tertiary">Worth checking</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{props.alertCounts.stale + props.alertCounts.priceChanged + props.alertCounts.outOfStock}</p>
              <p className="mt-1 text-xs text-text-secondary">Items that may need a quick review</p>
            </Card>
          </div>

          {props.registryInsights.length > 0 && (
            <Card variant="bordered" padding="lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="text-base font-semibold text-text-primary">Registry quick check</h2>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {props.registryInsights.map((insight) => (
                  <div key={insight.id} className="rounded-lg border border-border-subtle bg-surface-subtle/20 p-4">
                    <p className="text-sm font-semibold text-text-primary">{insight.title}</p>
                    <p className="mt-1 text-sm leading-6 text-text-secondary">{insight.detail}</p>
                    <button
                      type="button"
                      className="mt-3 text-xs font-semibold text-primary hover:underline"
                      onClick={() => {
                        if (insight.id === 'registry-metadata-images') {
                          props.setShowImageIssuesOnly(true);
                          props.setShowAlertsOnly(false);
                        }
                      }}
                    >
                      {insight.actionLabel}
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <Card variant="bordered" padding="lg">
              <p className="text-sm font-semibold text-text-primary">Top registry progress</p>
              <div className="mt-3 space-y-2.5">
                {props.topRegistryItems.length === 0 ? (
                  <p className="text-sm text-text-secondary">No registry items yet.</p>
                ) : props.topRegistryItems.map((item) => {
                  const progress = Math.min(100, Math.round(((item.quantity_purchased ?? 0) / Math.max(item.quantity_needed ?? 1, 1)) * 100));
                  return (
                    <div key={item.id} className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-text-primary">{item.item_name}</p>
                        <span className="text-xs text-text-tertiary">{item.quantity_purchased ?? 0}/{item.quantity_needed ?? 1}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-lg bg-surface-subtle">
                        <div className="h-full rounded-lg bg-primary" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card variant="bordered" padding="lg">
              <p className="text-sm font-semibold text-text-primary">Recent registry activity</p>
              <div className="mt-3 space-y-2.5">
                {props.recentActivity.length === 0 ? (
                  <p className="text-sm text-text-secondary">No registry activity yet.</p>
                ) : props.recentActivity.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-text-primary">{item.item_name}</p>
                      <span className="text-xs text-text-tertiary">{item.purchase_status}</span>
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">Updated {formatRegistryItemDate(item.updated_at ?? item.created_at)}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card variant="bordered" padding="lg">
              <p className="text-sm font-semibold text-text-primary">Registry notes</p>
              <div className="mt-3 space-y-2.5 text-sm text-text-secondary">
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Purchased: <span className="font-semibold text-text-primary">{props.counts.purchased}</span> · Remaining: <span className="font-semibold text-text-primary">{props.counts.available + props.counts.partial}</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Claimed gifts: <span className="font-semibold text-text-primary">{props.claimStats.claimedItems}</span> · Attributed: <span className="font-semibold text-text-primary">{props.claimStats.namedPurchaserItems}</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Purchaser coverage: <span className="font-semibold text-text-primary">{claimAttributionCoverageRate}%</span> · Fully claimed gifts: <span className="font-semibold text-text-primary">{props.claimStats.fullyClaimedItems}</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Partial claims: <span className="font-semibold text-text-primary">{props.claimStats.partiallyClaimedItems}</span> · Missing purchaser: <span className="font-semibold text-text-primary">{props.claimStats.missingPurchaserItems}</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Claimed quantity: <span className="font-semibold text-text-primary">{props.claimStats.claimedQuantity}</span> · Still needed: <span className="font-semibold text-text-primary">{props.claimStats.remainingQuantity}</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Guest-visible gifts: <span className="font-semibold text-text-primary">{props.guestVisibilityStats.guestVisibleItems}</span> · Hidden when purchased: <span className="font-semibold text-text-primary">{props.guestVisibilityStats.hiddenPurchasedItems}</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Guest-ready coverage: <span className="font-semibold text-text-primary">{guestReadyCoverageRate}%</span> · Visible coverage: <span className="font-semibold text-text-primary">{guestVisibleCoverageRate}%</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Guest-ready gifts: <span className="font-semibold text-text-primary">{props.guestVisibilityStats.guestReadyItems}</span> · Blocked from guests: <span className="font-semibold text-text-primary">{props.guestVisibilityStats.blockedGuestItems}</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Ready for guests now: <span className="font-semibold text-text-primary">{props.guestVisibilityStats.visibleAvailableItems}</span> · Claimed but still visible: <span className="font-semibold text-text-primary">{props.guestVisibilityStats.visibleClaimedItems}</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Thank-yous sent: <span className="font-semibold text-text-primary">{props.registryThankYouStats.completedCount}</span> · Still pending: <span className="font-semibold text-text-primary">{props.registryThankYouStats.pendingCount}</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Ready to send: <span className="font-semibold text-text-primary">{props.registryThankYouStats.readyToSendCount}</span> · Blocked by purchaser: <span className="font-semibold text-text-primary">{props.registryThankYouStats.blockedByMissingPurchaserCount}</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Attribution coverage: <span className="font-semibold text-text-primary">{props.registryThankYouStats.attributionCoverageRate}%</span> · Follow-up sent: <span className="font-semibold text-text-primary">{props.registryThankYouStats.completionRate}%</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Cash funds received: <span className="font-semibold text-text-primary">${props.fundStats.received.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Funds ready to share: <span className="font-semibold text-text-primary">{props.fundStats.readyToShare}</span> · Need payment path: <span className="font-semibold text-text-primary">{props.fundStats.needsSetup}</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Share-ready coverage: <span className="font-semibold text-text-primary">{fundShareReadyRate}%</span> · Goal-tracked funds: <span className="font-semibold text-text-primary">{fundGoalCoverageRate}%</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Receiving-gift coverage: <span className="font-semibold text-text-primary">{fundReceivingCoverageRate}%</span> · Funds already moving: <span className="font-semibold text-text-primary">{props.fundStats.withProgress}</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Ready funds already moving: <span className="font-semibold text-text-primary">{props.fundStats.readyWithProgress}</span> · Waiting on first gift: <span className="font-semibold text-text-primary">{props.fundStats.readyAwaitingFirstGift}</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Goal tracking: <span className="font-semibold text-text-primary">{props.fundStats.withGoal}</span> · Missing goal: <span className="font-semibold text-text-primary">{props.fundStats.missingGoal}</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Flexible funds with gifts: <span className="font-semibold text-text-primary">{props.fundStats.flexibleWithProgress}</span> · Tracked progress funds: <span className="font-semibold text-text-primary">{props.fundStats.withProgress}</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Multi-quantity gifts in progress: <span className="font-semibold text-text-primary">{props.claimStats.multiQuantityInProgress}</span> · Fully claimed gifts: <span className="font-semibold text-text-primary">{props.claimStats.fullyClaimedItems}</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Thank-you ready: <span className="font-semibold text-text-primary">{props.registryThankYouPlan.namedPurchaserCount}</span> · Missing purchaser: <span className="font-semibold text-text-primary">{props.registryThankYouPlan.missingPurchaserCount}</span>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Image issues: <span className="font-semibold text-text-primary">{props.alertCounts.imageIssues}</span> · Duplicate groups: <span className="font-semibold text-text-primary">{props.duplicateGroups.length}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card variant="bordered" padding="lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">{props.registryThankYouPlan.headline}</p>
                <p className="mt-1 text-sm text-text-secondary">{props.registryThankYouPlan.summary}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void props.handleSyncRegistryThankYouTasks()}
                disabled={props.registryThankYouSyncing}
              >
                {props.registryThankYouSyncing ? 'Saving…' : 'Save thank-you list'}
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg border border-border px-2 py-1 text-text-tertiary">
                Purchased gifts: {props.registryThankYouPlan.purchasedCount}
              </span>
              <span className="rounded-lg border border-border px-2 py-1 text-text-tertiary">
                Purchasers named: {props.registryThankYouPlan.namedPurchaserCount}
              </span>
              <span className="rounded-lg border border-border px-2 py-1 text-text-tertiary">
                Missing purchaser: {props.registryThankYouPlan.missingPurchaserCount}
              </span>
              <span className="rounded-lg border border-border px-2 py-1 text-text-tertiary">
                Thank-yous sent: {props.registryThankYouPlan.completedCount}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {props.registryThankYouPlan.items.length === 0 ? (
                <p className="text-sm text-text-secondary">Purchased gifts will show up here once you save the thank-you list.</p>
              ) : props.registryThankYouPlan.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-border-subtle bg-surface-subtle/20 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{item.giftName}</p>
                      <p className="mt-1 text-xs text-text-secondary">{item.purchaserLabel}</p>
                      <p className="mt-2 text-sm text-text-secondary">{item.detail}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {item.taskStatus === 'needs-purchaser' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const targetItem = props.items.find((entry) => entry.id === item.id) ?? props.normalizedItems.find((entry) => entry.id === item.id);
                            if (targetItem) props.handleEdit(targetItem);
                          }}
                        >
                          Review gift
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void props.handleToggleRegistryThankYouTask(item.id)}
                          disabled={props.registryThankYouBusyItemId === item.id}
                        >
                          {props.registryThankYouBusyItemId === item.id
                            ? 'Saving…'
                            : item.taskStatus === 'done'
                              ? 'Clear sent'
                              : 'Mark sent'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </details>

      <Card variant="bordered" padding="lg" className="border-border-subtle bg-white">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="search"
              value={props.search}
              onChange={(event) => props.setSearch(event.target.value)}
              placeholder="Search by name or store…"
              className="w-full pl-9 pr-4 py-2.5 bg-surface-subtle border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-1 bg-surface-subtle rounded-lg p-1 border border-border">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => props.setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  props.filter === tab.key ? 'bg-surface text-text-primary ring-1 ring-border-subtle' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
                {tabCount(tab.key) > 0 && (
                  <span className="ml-1 text-xs text-text-tertiary">{tabCount(tab.key)}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => props.setShowAlertsOnly((value) => !value)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${props.showAlertsOnly ? 'border-border-subtle bg-primary-light text-primary' : 'border-border text-text-tertiary'}`}
          >
            {props.showAlertsOnly ? 'Showing review items' : 'Show review items'}
          </button>
          <button
            onClick={() => props.setShowImageIssuesOnly((value) => !value)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${props.showImageIssuesOnly ? 'border-border-subtle bg-primary-light text-primary' : 'border-border text-text-tertiary'}`}
          >
            {props.showImageIssuesOnly ? 'Showing image issues' : 'Show image issues'}
          </button>
          {props.showImageIssuesOnly && (
            <>
              <button
                onClick={() => void props.handleRefreshImageIssues()}
                disabled={props.imageRefreshBusy}
                className="rounded-lg border border-border-subtle bg-primary-light px-2 py-1 text-xs font-medium text-primary disabled:opacity-60"
              >
                {props.imageRefreshBusy ? 'Refreshing…' : 'Fix image issues now'}
              </button>
              <button
                onClick={() => props.setShowImageIssuesOnly(false)}
                className="rounded-lg border border-border px-2 py-1 text-text-tertiary"
              >
                Clear
              </button>
            </>
          )}
          <span className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-text-tertiary">
            Review: {props.alertCounts.stale + props.alertCounts.priceChanged + props.alertCounts.outOfStock}
          </span>
          <span className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-text-tertiary">
            Image issues: {props.alertCounts.imageIssues}
          </span>
          <span className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-text-tertiary">
            Gifts to review: {props.repairQueue.length}
          </span>
          <span className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-text-tertiary">
            Needs cleanup: {props.normalizedItems.filter((item) => getRegistryRepairStates(item).length > 0).length}
          </span>
          <span className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-text-tertiary">
            Duplicate groups: {props.duplicateGroups.length}
          </span>
          {props.actionableBadImportCount > 0 && (
            <button
              onClick={() => void props.handleRepairBadImports()}
              disabled={props.repairingBadImports}
              className="rounded-lg border border-border-subtle bg-primary-light px-2 py-1 text-xs font-medium text-primary disabled:opacity-60"
            >
              {props.repairingBadImports ? 'Cleaning up…' : 'Clean up imported gifts'}
            </button>
          )}
          <span className={`rounded-lg border px-2 py-1 ${props.nearBudgetCap ? 'border-border-subtle bg-primary-light text-primary' : 'border-border text-text-tertiary'}`}>
            Refresh room used: {Math.round(props.budgetUtilization * 100)}%
          </span>
        </div>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 p-4">
            <p className="text-xs text-text-tertiary">Could use details</p>
            <p className="mt-1 text-lg font-semibold text-text-primary">{props.bulkReviewCounts.repair}</p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 p-4">
            <p className="text-xs text-text-tertiary">Possible repeats</p>
            <p className="mt-1 text-lg font-semibold text-text-primary">{props.bulkReviewCounts.duplicates}</p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 p-4">
            <p className="text-xs text-text-tertiary">Needs better image</p>
            <p className="mt-1 text-lg font-semibold text-text-primary">{props.bulkReviewCounts.imageIssues}</p>
          </div>
        </div>

        <div className="mb-3 rounded-lg border border-border-subtle bg-surface-subtle/20 p-4 text-xs text-text-secondary">
          These tools help tidy imported links and spot repeated gifts. Nothing is merged or deleted unless you choose it.
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {props.bulkReviewCounts.repair > 0 && <button onClick={() => void props.handleRepairBadImports()} disabled={props.repairingBadImports} className="rounded-lg border border-border-subtle bg-primary-light px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-60" title="Refresh weaker gift details without deleting items">{props.repairingBadImports ? 'Cleaning up…' : 'Review details'}</button>}
          {props.bulkReviewCounts.imageIssues > 0 && <button onClick={() => void props.handleRefreshImageIssues()} disabled={props.imageRefreshBusy} className="rounded-lg border border-border-subtle bg-primary-light px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-60">{props.imageRefreshBusy ? 'Refreshing…' : 'Refresh image issues'}</button>}
          {props.duplicateGroups.length > 0 && <button onClick={() => void props.handleCopyDuplicateReviewList()} className="px-3 py-1.5 rounded-lg border border-border text-text-secondary text-xs font-medium" title="Review duplicates before removing anything">Copy duplicate review list</button>}
        </div>

        {props.repairQueue.length > 0 && (
          <div className="mb-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">Cleanup queue</p>
                <p className="mt-1 text-xs text-text-secondary">Work through the gifts that still need stronger detail truth, store repair, or fresher guest-facing media.</p>
              </div>
              <span className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-text-tertiary">
                {props.repairQueue.length} waiting
              </span>
            </div>
            {props.repairQueue.slice(0, 6).map((queueItem) => (
              <div key={queueItem.id} className="rounded-lg border border-border-subtle bg-surface-subtle/20 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">{queueItem.item.item_name}</p>
                      <span className={`rounded-lg border px-2 py-1 text-[11px] ${
                        queueItem.severity === 'high'
                          ? 'border-border-subtle bg-primary-light text-primary'
                          : queueItem.severity === 'medium'
                          ? 'border-border bg-white text-text-secondary'
                          : 'border-border bg-white text-text-tertiary'
                      }`}>
                        {queueItem.severity === 'high' ? 'Needs attention' : queueItem.severity === 'medium' ? 'Review soon' : 'Keep fresh'}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary">{queueItem.summary}</p>
                    <p className="text-xs text-text-secondary">{queueItem.detail}</p>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {queueItem.states.map((state) => (
                        <span key={`${queueItem.id}-${state}`} className="rounded-lg border border-border bg-white px-2 py-1 text-text-tertiary">
                          {state.replace(/-/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:max-w-[250px] lg:justify-end">
                    <button
                      type="button"
                      onClick={() => void props.handleRunRepairQueueAction(queueItem, queueItem.secondaryAction)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary"
                    >
                      {queueItem.secondaryActionLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => void props.handleRunRepairQueueAction(queueItem, queueItem.primaryAction)}
                      className="rounded-lg border border-border-subtle bg-primary-light px-3 py-1.5 text-xs font-medium text-primary"
                    >
                      {queueItem.primaryActionLabel}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {props.repairQueue.length > 6 && (
              <p className="text-xs text-text-tertiary">
                {props.repairQueue.length - 6} more cleanup item{props.repairQueue.length - 6 === 1 ? '' : 's'} are still waiting below the fold.
              </p>
            )}
          </div>
        )}

        {props.duplicateGroups.length > 0 && (
          <div className="mb-4 space-y-3">
            {props.duplicateGroups.slice(0, 4).map((group) => (
              <div key={group.id} className="rounded-lg border border-border-subtle bg-surface-subtle/20 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Possible duplicate group</p>
                      <p className="mt-1 text-xs text-text-secondary">
                        Keep <span className="font-medium text-text-primary">{group.primaryItem.item_name}</span> and merge {group.secondaryItems.length} repeat{group.secondaryItems.length === 1 ? '' : 's'} into it.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {group.signals.map((signal) => (
                        <span key={`${signal.kind}-${signal.value ?? signal.label}`} className="rounded-lg border border-border bg-white px-2 py-1 text-text-tertiary">
                          {signal.label}
                        </span>
                      ))}
                      <span className="rounded-lg border border-border bg-white px-2 py-1 text-text-tertiary">
                        Merge result: {group.mergedQuantityPurchased}/{group.mergedQuantityNeeded}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-text-secondary">
                      {group.items.map((item) => (
                        <p key={item.id}>
                          • {item.item_name}
                          {item.id === group.primaryItem.id ? ' (keep)' : ''}
                          {item.merchant || item.store_name ? ` — ${item.merchant || item.store_name}` : ''}
                          {item.quantity_purchased > 0 || item.quantity_needed > 1 ? ` — ${item.quantity_purchased}/${item.quantity_needed}` : ''}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:max-w-[220px] lg:justify-end">
                    <button
                      onClick={() => props.handleEdit(group.primaryItem)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary"
                    >
                      Review keep item
                    </button>
                    <button
                      onClick={() => void props.handleMergeDuplicateGroup(group)}
                      disabled={props.mergingDuplicateGroupId === group.id}
                      className="rounded-lg border border-border-subtle bg-primary-light px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-60"
                    >
                      {props.mergingDuplicateGroupId === group.id ? 'Merging…' : `Merge ${group.items.length} items`}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {props.duplicateGroups.length > 4 && (
              <p className="text-xs text-text-tertiary">
                {props.duplicateGroups.length - 4} more duplicate group{props.duplicateGroups.length - 4 === 1 ? '' : 's'} are waiting in this review list.
              </p>
            )}
          </div>
        )}

        {props.loading ? (
          <DashboardStateBlock title="Loading registry…" description="Pulling your latest items and settings." />
        ) : !props.weddingSiteId ? (
          <DashboardStateBlock title="No wedding site found" description="Complete onboarding first to set up your registry." />
        ) : props.filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface-subtle">
              <Gift className="w-8 h-8 text-text-tertiary" />
            </div>
            <div>
              <p className="text-text-primary font-semibold mb-1">
                {props.items.length === 0 ? 'Your registry is empty' : 'No items match your filter'}
              </p>
              <p className="text-sm text-text-secondary max-w-xs mx-auto">
                {props.items.length === 0
                  ? 'Paste any product URL from any store to get started.'
                  : 'Try adjusting your search or selecting a different filter.'}
              </p>
            </div>
            {props.items.length === 0 && (
              <Button variant="primary" size="md" onClick={props.handleAddNew}>
                <Plus className="w-4 h-4" />
                Add your first item
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {props.filtered.map((item) => (
              <RegistryItemCard
                key={item.id}
                item={item}
                onEdit={props.handleEdit}
                onDelete={props.handleDelete}
                onMarkPurchased={props.handleMarkPurchased}
                onResetPurchaseState={props.handleResetPurchaseState}
                onRefetchMetadata={props.handleRefetchMetadata}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
