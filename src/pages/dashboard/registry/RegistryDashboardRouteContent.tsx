import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { DashboardPageHero } from '../../../components/dashboard/DashboardPageHero';
import { DashboardStateBlock } from '../../../components/dashboard/DashboardStateBlock';
import { ActionsMenu, Button, Card } from '../../../components/ui';
import { CheckCircle2, DollarSign, Gift, Package, Plus, Search, Sparkles } from 'lucide-react';
import { copyTextOrDownload } from '../../../lib/copyText';
import { RegistryItemCard } from './RegistryItemCard';
import type { RegistryDuplicateGroup } from './duplicateRegistryItems';
import { getRegistryRepairStates } from './repairState';
import type { RegistryRepairActionKind, RegistryRepairQueueItem } from './repairState';
import { getOwnerRegistryDisplayTitle, type RegistryFilter, type RegistryItem } from './registryTypes';
import { formatRegistryItemDate } from '../registryItemTime';

const FILTER_TABS: { key: RegistryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'purchased', label: 'Purchased' },
];

function formatRegistryPurchaseStatusLabel(status: RegistryItem['purchase_status']) {
  if (status === 'partial') return 'Partially claimed';
  if (status === 'purchased') return 'Purchased';
  return 'Available';
}

function formatRegistryActivityDetail(item: RegistryItem) {
  if (item.purchase_status === 'purchased') {
    return item.purchaser_name ? `Purchased by ${item.purchaser_name}` : 'Purchased';
  }

  if (item.purchase_status === 'partial') {
    return item.purchaser_name ? `Partially claimed by ${item.purchaser_name}` : 'Partially claimed';
  }

  return 'Still available';
}

function getRegistryProgressState(item: TopRegistryItem) {
  const quantityNeeded = Math.max(item.quantity_needed ?? 1, 1);
  const quantityPurchased = item.quantity_purchased ?? 0;
  const remainingQuantity = Math.max(quantityNeeded - quantityPurchased, 0);

  if (quantityPurchased === 0) return 'open' as const;
  if (remainingQuantity === 0) return 'claimed' as const;
  return 'partial' as const;
}

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
  priority?: string;
  source?: string;
  confidence?: number;
  area?: string;
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

type CopyActionResult = 'copied' | 'downloaded';

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
  handleCopyDuplicateReviewList: () => Promise<CopyActionResult | null | void>;
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
  error?: string | null;
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
  siteSlug?: string | null;
  topRegistryItems: TopRegistryItem[];
  weddingSiteId: string | null;
}) {
  const [guestRegistryLinkNotice, setGuestRegistryLinkNotice] = useState<CopyActionResult | null>(null);
  const [copyingGuestRegistryLink, setCopyingGuestRegistryLink] = useState(false);
  const [duplicateReviewCopyNotice, setDuplicateReviewCopyNotice] = useState<CopyActionResult | null>(null);
  const [copyingDuplicateReviewList, setCopyingDuplicateReviewList] = useState(false);
  const guestRegistryUrl = props.siteSlug ? `https://${props.siteSlug}.dayof.love/#registry` : null;
  const guestRegistryLinkCopyRequestIdRef = useRef(0);
  const duplicateReviewCopyRequestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const guestRegistryUrlRef = useRef(guestRegistryUrl);
  guestRegistryUrlRef.current = guestRegistryUrl;
  const duplicateReviewContextKey = JSON.stringify(props.duplicateGroups.map((group) => [
    group.id,
    group.primaryItem.id,
    group.primaryItem.item_name,
    group.items.map((item) => [item.id, item.item_name]),
    group.signals.map((signal) => [signal.kind, signal.label, signal.value]),
  ]));
  const duplicateReviewContextKeyRef = useRef(duplicateReviewContextKey);
  duplicateReviewContextKeyRef.current = duplicateReviewContextKey;

  useEffect(() => () => {
    mountedRef.current = false;
    guestRegistryLinkCopyRequestIdRef.current += 1;
    duplicateReviewCopyRequestIdRef.current += 1;
  }, []);

  useEffect(() => {
    guestRegistryLinkCopyRequestIdRef.current += 1;
    setGuestRegistryLinkNotice(null);
    setCopyingGuestRegistryLink(false);
  }, [guestRegistryUrl]);

  useEffect(() => {
    duplicateReviewCopyRequestIdRef.current += 1;
    setDuplicateReviewCopyNotice(null);
    setCopyingDuplicateReviewList(false);
  }, [duplicateReviewContextKey]);

  const handleOpenGuestRegistry = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!guestRegistryUrl) return;
    window.open(guestRegistryUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyGuestRegistryLink = async () => {
    if (!guestRegistryUrl || copyingGuestRegistryLink) return;
    const requestId = guestRegistryLinkCopyRequestIdRef.current + 1;
    guestRegistryLinkCopyRequestIdRef.current = requestId;
    const requestUrl = guestRegistryUrl;
    const isCurrentGuestRegistryLinkCopy = () => (
      mountedRef.current &&
      requestId === guestRegistryLinkCopyRequestIdRef.current &&
      requestUrl === guestRegistryUrlRef.current
    );
    setGuestRegistryLinkNotice(null);
    setCopyingGuestRegistryLink(true);
    try {
      const result = await copyTextOrDownload(guestRegistryUrl, 'dayof-registry-guest-link.txt');
      if (!isCurrentGuestRegistryLinkCopy()) return;
      setGuestRegistryLinkNotice(result);
    } finally {
      if (isCurrentGuestRegistryLinkCopy()) {
        setCopyingGuestRegistryLink(false);
      }
    }
  };

  const handleCopyDuplicateReviewList = async () => {
    if (copyingDuplicateReviewList) return;
    const requestId = duplicateReviewCopyRequestIdRef.current + 1;
    duplicateReviewCopyRequestIdRef.current = requestId;
    const requestContextKey = duplicateReviewContextKeyRef.current;
    const isCurrentDuplicateReviewCopy = () => (
      mountedRef.current &&
      requestId === duplicateReviewCopyRequestIdRef.current &&
      requestContextKey === duplicateReviewContextKeyRef.current
    );
    setDuplicateReviewCopyNotice(null);
    setCopyingDuplicateReviewList(true);
    try {
      const result = await props.handleCopyDuplicateReviewList();
      if (!isCurrentDuplicateReviewCopy()) return;
      if (result) {
        setDuplicateReviewCopyNotice(result);
      }
    } finally {
      if (isCurrentDuplicateReviewCopy()) {
        setCopyingDuplicateReviewList(false);
      }
    }
  };

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
    ? `Main gap: ${props.claimStats.missingPurchaserItems} still need a purchaser name`
    : props.claimStats.partiallyClaimedItems > 0
      ? `Main gap: ${props.claimStats.partiallyClaimedItems} partial claim${props.claimStats.partiallyClaimedItems === 1 ? '' : 's'} still need a final gift`
      : 'Main gap: no purchaser-name blockers right now';
  const guestVisibilityGapLabel = props.guestVisibilityStats.blockedGuestItems > 0
    ? `Main gap: ${props.guestVisibilityStats.blockedGuestItems} still blocked from guests`
    : props.guestVisibilityStats.hiddenPurchasedItems > 0
      ? `Main gap: ${props.guestVisibilityStats.hiddenPurchasedItems} hidden after purchase`
      : 'Main gap: no guest-visibility blockers right now';
  const thankYouGapLabel = props.registryThankYouStats.blockedByMissingPurchaserCount > 0
    ? `Main gap: ${props.registryThankYouStats.blockedByMissingPurchaserCount} still missing a purchaser name`
    : props.registryThankYouStats.pendingCount > 0
      ? `Main gap: ${props.registryThankYouStats.pendingCount} still need a thank-you`
      : 'Main gap: no thank-you blockers right now';
  const fundSetupGapLabel = props.fundStats.needsSetup > 0
    ? `Main gap: ${props.fundStats.needsSetup} still need a share path`
    : props.fundStats.missingGoal > 0
      ? `Main gap: ${props.fundStats.missingGoal} still missing a goal`
      : props.fundStats.readyAwaitingFirstGift > 0
        ? `Main gap: ${props.fundStats.readyAwaitingFirstGift} waiting on a first gift`
        : 'Main gap: no fund setup blockers right now';
  const fundMomentumGapLabel = props.fundStats.missingGoal > 0
    ? `Next gift gap: ${props.fundStats.missingGoal} still missing a goal`
    : props.fundStats.readyAwaitingFirstGift > 0
      ? `Next gift gap: ${props.fundStats.readyAwaitingFirstGift} waiting on a first gift`
      : props.fundStats.needsSetup > 0
        ? `Next gift gap: ${props.fundStats.needsSetup} still need a share path`
        : 'Next gift gap: no fund momentum blockers right now';
  const claimAllClearLabel = props.claimStats.claimedItems > 0
    && props.claimStats.missingPurchaserItems === 0
    && props.claimStats.partiallyClaimedItems === 0
    && props.claimStats.remainingQuantity === 0
    ? 'All claimed gifts already have a purchaser name and are fully closed out.'
    : null;
  const giftProgressSummaryLabel = props.counts.purchased === 0
    ? 'No gifts purchased yet'
    : props.counts.purchased === props.counts.total
      ? 'All gifts already marked purchased'
      : `${props.counts.purchased} gift${props.counts.purchased === 1 ? '' : 's'} already marked purchased`;
  const guestVisibilityAllClearLabel = props.guestVisibilityStats.guestReadyItems > 0
    && props.guestVisibilityStats.blockedGuestItems === 0
    && props.guestVisibilityStats.hiddenPurchasedItems === 0
    && props.guestVisibilityStats.guestVisibleItems === props.guestVisibilityStats.guestReadyItems
    ? 'All gifts ready for guests are visible right now.'
    : null;
  const guestVisibilitySummaryLabel = props.guestVisibilityStats.guestVisibleItems === 0
    ? 'No gifts visible to guests yet'
    : guestVisibilityAllClearLabel ?? `${props.guestVisibilityStats.visibleAvailableItems} ready now · ${props.guestVisibilityStats.visibleClaimedItems} already claimed`;
  const thankYouAllClearLabel = props.registryThankYouStats.purchasedCount > 0
    && props.registryThankYouStats.pendingCount === 0
    && props.registryThankYouStats.blockedByMissingPurchaserCount === 0
    ? 'All thank-you follow-up is already closed out right now.'
    : props.registryThankYouStats.purchasedCount === 0
      ? 'No thank-you follow-up is open right now.'
      : null;
  const fundSetupAllClearLabel = props.fundStats.count > 0
    && props.fundStats.needsSetup === 0
    && props.fundStats.missingGoal === 0
    && props.fundStats.readyAwaitingFirstGift === 0
    ? 'All fund links are ready to share right now.'
    : null;
  const fundMomentumAllClearLabel = props.fundStats.count > 0
    && props.fundStats.needsSetup === 0
    && props.fundStats.missingGoal === 0
    && props.fundStats.readyAwaitingFirstGift === 0
    ? 'All fund momentum blockers are clear right now.'
    : null;
  const reviewAlertCount = props.alertCounts.stale + props.alertCounts.priceChanged + props.alertCounts.outOfStock;
  const reviewSummaryLabel = reviewAlertCount === 0
    ? 'Nothing needs a closer look right now'
    : [
        props.alertCounts.stale > 0 ? `${props.alertCounts.stale} older link${props.alertCounts.stale === 1 ? '' : 's'}` : null,
        props.alertCounts.priceChanged > 0 ? `${props.alertCounts.priceChanged} price shift${props.alertCounts.priceChanged === 1 ? '' : 's'}` : null,
        props.alertCounts.outOfStock > 0 ? `${props.alertCounts.outOfStock} out of stock` : null,
      ].filter(Boolean).join(' · ');
  const registryNoteWatchouts = [
    props.claimStats.missingPurchaserItems > 0 ? `${props.claimStats.missingPurchaserItems} gift${props.claimStats.missingPurchaserItems === 1 ? '' : 's'} still missing a purchaser name` : null,
    props.guestVisibilityStats.blockedGuestItems > 0 ? `${props.guestVisibilityStats.blockedGuestItems} blocked from guests` : null,
    props.registryThankYouStats.pendingCount > 0 ? `${props.registryThankYouStats.pendingCount} thank-you${props.registryThankYouStats.pendingCount === 1 ? '' : 's'} still pending` : null,
    props.fundStats.needsSetup > 0 ? `${props.fundStats.needsSetup} fund${props.fundStats.needsSetup === 1 ? '' : 's'} need a share path` : null,
    reviewAlertCount > 0 ? `${reviewAlertCount} item${reviewAlertCount === 1 ? '' : 's'} worth a closer look` : null,
  ].filter(Boolean);
  const registryNotesSummary = registryNoteWatchouts.length === 0
    ? 'No active registry follow-through gaps right now.'
    : `Main watchouts: ${registryNoteWatchouts.join(' · ')}.`;
  const topRegistryProgressCounts = props.topRegistryItems.reduce((acc, item) => {
    const state = getRegistryProgressState(item);
    acc[state] += 1;
    return acc;
  }, { open: 0, partial: 0, claimed: 0 });
  const topRegistryProgressSummary = props.topRegistryItems.length === 0
    ? 'No top registry gifts to track yet.'
    : topRegistryProgressCounts.open === 0 && topRegistryProgressCounts.partial === 0
      ? 'Top gifts are already fully claimed right now.'
      : `Top gifts: ${topRegistryProgressCounts.claimed} fully claimed · ${topRegistryProgressCounts.partial} partially claimed · ${topRegistryProgressCounts.open} still fully open.`;
  const recentActivitySummary = props.recentActivity.length === 0
    ? 'No recent registry changes yet.'
    : [
        `${props.recentActivity.filter((item) => item.purchase_status === 'purchased').length} purchased`,
        `${props.recentActivity.filter((item) => item.purchase_status === 'partial').length} partially claimed`,
        `${props.recentActivity.filter((item) => item.purchase_status === 'available').length} still available`,
      ].join(' · ');
  const registryQuickCheckNextCount = props.registryInsights.filter((insight) => insight.priority === 'next').length;
  const registryQuickCheckPolishCount = props.registryInsights.filter((insight) => insight.priority === 'polish').length;
  const registryQuickCheckSummary = props.registryInsights.length === 0
    ? 'No quick registry fixes worth flagging right now.'
    : `${[
        registryQuickCheckNextCount > 0
          ? `${registryQuickCheckNextCount} next-step ${registryQuickCheckNextCount === 1 ? 'fix' : 'fixes'}`
          : null,
        registryQuickCheckPolishCount > 0
          ? `${registryQuickCheckPolishCount} polish ${registryQuickCheckPolishCount === 1 ? 'cleanup' : 'cleanups'}`
          : null,
      ].filter(Boolean).join(' · ')} worth a quick pass.`;
  const registryShareReadinessSummary = props.registryLaunchReadiness.status === 'empty'
    ? 'No registry links or funds are ready to share yet.'
    : props.registryLaunchReadiness.reviewCount > 0
      ? `${props.registryLaunchReadiness.reviewCount} registry share detail${props.registryLaunchReadiness.reviewCount === 1 ? '' : 's'} still need review.`
      : 'No registry share blockers right now.';
  const giftSnapshotLeadSummary = props.counts.total === 0
    ? 'No registry gifts added yet.'
    : registryNoteWatchouts.length > 0
      ? `Snapshot focus: ${registryNoteWatchouts.join(' · ')}.`
      : props.registryInsights.length > 0
        ? `Snapshot focus: ${registryQuickCheckSummary}`
        : 'Registry snapshot looks clean right now.';
  const giftSnapshotAllClearLabel = props.counts.total > 0
    && registryNoteWatchouts.length === 0
    && props.registryInsights.length === 0
    ? 'No active registry watchouts inside this snapshot.'
    : null;
  const cleanupQueueSummary = props.repairQueue.length === 0
    ? 'No gifts are waiting in the cleanup queue right now.'
    : `${props.repairQueue.length} gift${props.repairQueue.length === 1 ? '' : 's'} still need stronger detail truth, store repair, or fresher product photos.`;
  const cleanupHighCount = props.repairQueue.filter((item) => item.severity === 'high').length;
  const cleanupMediumCount = props.repairQueue.filter((item) => item.severity === 'medium').length;
  const cleanupLowCount = props.repairQueue.filter((item) => item.severity === 'low').length;
  const cleanupQueueLeadSummary = props.repairQueue.length === 0
    ? 'No quick registry cleanup work is waiting right now.'
    : `${[
        cleanupHighCount > 0 ? `${cleanupHighCount} fix now` : null,
        cleanupMediumCount > 0 ? `${cleanupMediumCount} look soon` : null,
        cleanupLowCount > 0 ? `${cleanupLowCount} keep fresh` : null,
      ].filter(Boolean).join(' · ')}.`;
  const duplicateSecondaryItemCount = props.duplicateGroups.reduce((sum, group) => sum + group.secondaryItems.length, 0);
  const duplicateSignalCount = props.duplicateGroups.reduce((sum, group) => sum + group.signals.length, 0);
  const duplicateQueueSummary = props.duplicateGroups.length === 0
    ? 'No duplicate gift groups are waiting right now.'
    : `${props.duplicateGroups.length} merge candidate${props.duplicateGroups.length === 1 ? '' : 's'} covering ${duplicateSecondaryItemCount} repeated gift${duplicateSecondaryItemCount === 1 ? '' : 's'}.`;
  const duplicateQueueDetail = props.duplicateGroups.length === 0
    ? null
    : `${duplicateSignalCount} match clue${duplicateSignalCount === 1 ? '' : 's'} are already grouped to compare.`;
  const cleanupToolsSummary = [
    props.bulkReviewCounts.repair > 0 ? `${props.bulkReviewCounts.repair} detail touchup${props.bulkReviewCounts.repair === 1 ? '' : 's'}` : null,
    props.bulkReviewCounts.duplicates > 0 ? `${props.bulkReviewCounts.duplicates} duplicate check${props.bulkReviewCounts.duplicates === 1 ? '' : 's'}` : null,
    props.bulkReviewCounts.imageIssues > 0 ? `${props.bulkReviewCounts.imageIssues} photo refresh${props.bulkReviewCounts.imageIssues === 1 ? '' : 'es'}` : null,
  ].filter(Boolean).join(' · ');
  const cleanupToolsLeadSummary = props.bulkReviewCounts.repair === 0
    && props.bulkReviewCounts.duplicates === 0
    && props.bulkReviewCounts.imageIssues === 0
    ? 'No quick cleanup tools need attention right now.'
    : `${cleanupToolsSummary} still worth a pass.`;
  const cleanupToolsAllClearLabel = props.bulkReviewCounts.repair === 0
    && props.bulkReviewCounts.duplicates === 0
    && props.bulkReviewCounts.imageIssues === 0
    && props.actionableBadImportCount === 0
    ? 'No imported-gift cleanup work is open right now.'
    : null;

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
        title="Gifts and funds, clearly shared."
        description="Add the places guests should look first. Keep it simple with links, or add individual gifts and funds later."
        stats={[
          { label: 'Registry', value: props.counts.total > 0 ? 'Ready to share' : 'Nothing added yet', detail: `${props.counts.total} gifts or links` },
          { label: 'Purchased', value: props.counts.purchased > 0 ? `${props.counts.purchased} already purchased` : 'Nothing purchased yet', detail: `${props.fulfillmentRate}% complete` },
          { label: 'Watchouts', value: props.alertCounts.stale + props.alertCounts.priceChanged + props.alertCounts.outOfStock > 0 ? 'Needs a quick pass' : 'Quiet right now', detail: 'links, prices, and photos' },
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
                {props.autoRefreshing ? 'Refreshing…' : 'Refresh flagged gifts'}
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
          <span className="rounded-xl border border-border-subtle bg-white px-2 py-0.5">
            {props.autoRefreshEnabled ? (props.refreshWindowOpen ? 'Weekly refresh on' : 'Refresh window closed') : 'Weekly refresh paused'}
          </span>
          <span>{props.monthlyRefreshCount} of {props.monthlyRefreshCap} refreshes used this month</span>
        </div>
      </DashboardPageHero>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_340px]">
        <article className="rounded-3xl border border-border-subtle bg-white p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,0.85fr)] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Guest view</p>
              <h2 className="mt-3 font-serif text-2xl font-normal text-text-primary">The registry should feel finished before anything else.</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">Guests should see one clear place for links, funds, and gifts. The deeper cleanup tools can stay behind the scenes.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="primary" size="sm" onClick={handleOpenGuestRegistry} disabled={!guestRegistryUrl}>
                  View registry
                </Button>
                <Button variant="outline" size="sm" onClick={() => { void handleCopyGuestRegistryLink(); }} disabled={!guestRegistryUrl || copyingGuestRegistryLink}>
                  {copyingGuestRegistryLink
                    ? 'Copying link...'
                    : guestRegistryLinkNotice === 'downloaded'
                      ? 'Downloaded registry link'
                      : guestRegistryLinkNotice === 'copied'
                        ? 'Copied registry link'
                        : 'Copy link'}
                </Button>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-border-subtle bg-surface-subtle/30 p-4">
              <div className="rounded-[1.25rem] border border-border-subtle bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Guest preview</p>
                    <p className="mt-1 font-serif text-xl text-text-primary">Our registry</p>
                    <p className="mt-1 text-sm text-text-secondary">Gifts, funds, and links in one place.</p>
                  </div>
                  <Gift className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div className="mt-4 space-y-2">
                  {props.topRegistryItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                      <p className="text-sm font-semibold text-text-primary">{getOwnerRegistryDisplayTitle(item.item_name)}</p>
                      <p className="mt-1 text-xs text-text-secondary">{formatRegistryPurchaseStatusLabel(item.purchase_status)}</p>
                    </div>
                  ))}
                  {props.topRegistryItems.length === 0 && (
                    <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                      <p className="text-sm font-semibold text-text-primary">Ready for your first registry item.</p>
                      <p className="mt-1 text-xs text-text-secondary">Links, gifts, and funds can all start here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </article>

        <aside className="rounded-3xl border border-border-subtle bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Manage when needed</p>
          <div className="mt-4 space-y-3">
            {[
              ['Registry links', 'Add or adjust the places guests should look first.', 'Manage'],
              ['Gifts and funds', 'Keep gifts, funds, and display order together.', 'Manage'],
              ['Thank-you notes', 'Purchaser names and gift status for later.', 'Track'],
              ['Import, scanner, and cleanup', 'Use deeper tools only when you are adding or polishing items.', 'More'],
            ].map(([title, detail, action]) => (
              <div key={title} className="rounded-2xl border border-border-subtle bg-surface-subtle/30 p-4">
                <p className="text-sm font-semibold text-text-primary">{title}</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{detail}</p>
                <p className="mt-4 text-sm font-semibold text-primary">{action}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <details className="rounded-2xl border border-border-subtle bg-white/80 p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-text-primary">
          Gift snapshot and review details
        </summary>
        <div className="mt-4 space-y-4">
          <div className="space-y-1">
            <p className="text-sm text-text-secondary">{giftSnapshotLeadSummary}</p>
            {giftSnapshotAllClearLabel ? <p className="text-xs text-text-tertiary">{giftSnapshotAllClearLabel}</p> : null}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Gift, bg: 'bg-primary-light', color: 'text-primary', val: props.counts.total, label: 'Gifts' },
              { icon: CheckCircle2, bg: 'bg-success-light', color: 'text-success', val: props.counts.purchased, label: 'Purchased' },
              { icon: Package, bg: 'bg-surface-subtle', color: 'text-text-secondary', val: props.counts.available + props.counts.partial, label: 'Remaining' },
              { icon: DollarSign, bg: 'bg-primary-light', color: 'text-primary', val: `$${props.counts.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, label: 'Estimated value' },
            ].map(({ icon: Icon, bg, color, val, label }) => (
              <Card key={label} variant="bordered" padding="md">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2.5 ${bg} flex-shrink-0`}>
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
              <p className="mt-1 text-xs text-text-secondary">{giftProgressSummaryLabel}</p>
            </Card>
            <Card variant="bordered" padding="md">
              <p className="text-xs font-medium text-text-tertiary">Claimed gifts</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{props.claimStats.claimedItems}</p>
              <p className="mt-1 text-xs text-text-secondary">
                {props.claimStats.claimedItems === 0
                  ? 'No claimed gifts yet'
                  : `${props.claimStats.namedPurchaserItems} with purchaser named${props.claimStats.missingPurchaserItems > 0 ? ` · ${props.claimStats.missingPurchaserItems} still missing purchaser` : ''}`}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {claimAttributionCoverageRate}% purchaser named · {fullyClaimedCoverageRate}% fully claimed{props.claimStats.partiallyClaimedItems > 0 ? ` · ${partialClaimCoverageRate}% partial (${props.claimStats.partiallyClaimedItems})` : ''}{totalClaimQuantityScope > 0 ? ` · ${claimedQuantityCoverageRate}% quantity claimed (${props.claimStats.claimedQuantity}) · ${unclaimedQuantityCoverageRate}% still open (${props.claimStats.remainingQuantity})` : ''}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">{claimGapLabel}</p>
              {claimAllClearLabel ? <p className="mt-1 text-xs text-text-tertiary">{claimAllClearLabel}</p> : null}
            </Card>
            <Card variant="bordered" padding="md">
              <p className="text-xs font-medium text-text-tertiary">Guest view</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{props.guestVisibilityStats.guestVisibleItems}</p>
              <p className="mt-1 text-xs text-text-secondary">{guestVisibilitySummaryLabel}</p>
              <p className="mt-1 text-xs text-text-tertiary">
                {guestVisibleCoverageRate}% visible to guests · {guestReadyCoverageRate}% ready for guests · {props.guestVisibilityStats.hiddenPurchasedItems} hidden when bought{props.guestVisibilityStats.blockedGuestItems > 0 ? ` · ${props.guestVisibilityStats.blockedGuestItems} blocked from guests` : ''}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">{guestVisibilityGapLabel}</p>
              {guestVisibilityAllClearLabel ? <p className="mt-1 text-xs text-text-tertiary">{guestVisibilityAllClearLabel}</p> : null}
            </Card>
            <Card variant="bordered" padding="md">
              <p className="text-xs font-medium text-text-tertiary">Thank-yous</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{props.registryThankYouStats.completedCount}</p>
              <p className="mt-1 text-xs text-text-secondary">
                {props.registryThankYouStats.purchasedCount === 0
                  ? 'No thank-you follow-up open yet'
                  : `${props.registryThankYouStats.pendingCount} still need a thank-you${props.registryThankYouStats.blockedByMissingPurchaserCount > 0 ? ` · ${props.registryThankYouStats.blockedByMissingPurchaserCount} still missing purchaser` : ''}`}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {thankYouReadyCoverageRate}% ready to send · {props.registryThankYouStats.completionRate}% already sent{props.registryThankYouStats.blockedByMissingPurchaserCount > 0 ? ` · ${thankYouBlockedCoverageRate}% still missing purchaser` : ''}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {props.registryThankYouStats.readyToSendCount} ready to send{props.registryThankYouStats.blockedByMissingPurchaserCount > 0 ? ` · ${props.registryThankYouStats.blockedByMissingPurchaserCount} still missing purchaser` : ''}
                {props.registryThankYouStats.purchasedCount > 0 ? ` · ${props.registryThankYouStats.attributionCoverageRate}% with purchaser named` : ''}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">{thankYouGapLabel}</p>
              {thankYouAllClearLabel ? <p className="mt-1 text-xs text-text-tertiary">{thankYouAllClearLabel}</p> : null}
            </Card>
            <Card variant="bordered" padding="md">
              <p className="text-xs font-medium text-text-tertiary">Cash funds</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{props.fundStats.count}</p>
              <p className="mt-1 text-xs text-text-secondary">
                {props.fundStats.count === 0
                  ? 'No cash funds added yet'
                  : `${props.fundStats.readyToShare} ready to share${props.fundStats.needsSetup > 0 ? ` · ${props.fundStats.needsSetup} need a share path` : ''}`}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {fundShareReadyRate}% ready to share · {props.fundStats.readyWithProgress} already moving{props.fundStats.readyAwaitingFirstGift > 0 ? ` · ${props.fundStats.readyAwaitingFirstGift} waiting on a first gift` : ''}{props.fundStats.missingGoal > 0 ? ` · ${props.fundStats.missingGoal} missing a goal` : ''}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">{fundSetupGapLabel}</p>
              {fundSetupAllClearLabel ? <p className="mt-1 text-xs text-text-tertiary">{fundSetupAllClearLabel}</p> : null}
            </Card>
            <Card variant="bordered" padding="md">
              <p className="text-xs font-medium text-text-tertiary">Fund gifts</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">${props.fundStats.received.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
              <p className="mt-1 text-xs text-text-secondary">
                {props.fundStats.count === 0
                  ? 'No fund gifts moving yet'
                  : `Received toward $${props.fundStats.goal.toLocaleString('en-US', { maximumFractionDigits: 0 })} goal${props.fundStats.withGoal > 0 ? ` across ${props.fundStats.withGoal} tracked fund${props.fundStats.withGoal === 1 ? '' : 's'}` : ''}`}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {fundGoalCoverageRate}% goal-tracked · {fundReceivingCoverageRate}% already receiving gifts · {props.fundStats.withProgress} showing tracked progress{props.fundStats.flexibleWithProgress > 0 ? ` · ${props.fundStats.flexibleWithProgress} flexible fund${props.fundStats.flexibleWithProgress === 1 ? '' : 's'} already receiving gifts` : ''}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">{fundMomentumGapLabel}</p>
              {fundMomentumAllClearLabel ? <p className="mt-1 text-xs text-text-tertiary">{fundMomentumAllClearLabel}</p> : null}
            </Card>
            <Card variant="bordered" padding="md">
              <p className="text-xs font-medium text-text-tertiary">Worth checking</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{reviewAlertCount}</p>
              <p className="mt-1 text-xs text-text-secondary">{reviewSummaryLabel}</p>
            </Card>
          </div>

          <Card variant="bordered" padding="lg">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-base font-semibold text-text-primary">Registry quick check</h2>
            </div>
            <p className="mt-1 text-sm text-text-secondary">{registryQuickCheckSummary}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {props.registryInsights.length === 0 ? (
                <p className="text-sm text-text-secondary">No quick cleanup prompts right now.</p>
              ) : props.registryInsights.map((insight) => (
                <div key={insight.id} className="rounded-xl border border-border-subtle bg-surface-subtle/20 p-4">
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

          <div className="grid gap-4 lg:grid-cols-2">
            <Card variant="bordered" padding="lg">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Registry share readiness</p>
                  <p className="mt-1 text-sm text-text-secondary">{props.registryLaunchReadiness.headline}</p>
                </div>
                <span className="rounded-xl border border-border px-2 py-1 text-xs font-medium text-text-tertiary">
                  {props.registryLaunchReadiness.reviewCount} to check
                </span>
              </div>
              <p className="mt-3 text-sm text-text-secondary">{props.registryLaunchReadiness.summary}</p>
              <p className="mt-2 text-xs text-text-tertiary">{registryShareReadinessSummary}</p>
              <div className="mt-4 space-y-2.5">
                {props.registryLaunchReadiness.items.length === 0 ? (
                  <p className="text-sm text-text-secondary">No share-readiness details are listed yet.</p>
                ) : props.registryLaunchReadiness.items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">{item.label}</p>
                      <span className={`rounded-xl border px-2 py-1 text-[11px] ${
                        item.tone === 'review'
                          ? 'border-border-subtle bg-primary-light text-primary'
                          : item.tone === 'planned'
                            ? 'border-border bg-white text-text-secondary'
                            : 'border-border bg-white text-text-tertiary'
                      }`}>
                        {item.tone === 'review' ? 'Needs a look' : item.tone === 'planned' ? 'Planned' : 'Ready to share'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">{item.detail}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card variant="bordered" padding="lg">
              <p className="text-sm font-semibold text-text-primary">Registry notes</p>
              <p className="mt-1 text-sm text-text-secondary">{registryNotesSummary}</p>
              <div className="mt-3 space-y-2.5 text-sm text-text-secondary">
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Purchased gifts: <span className="font-semibold text-text-primary">{props.counts.purchased}</span> · Still open: <span className="font-semibold text-text-primary">{props.counts.available + props.counts.partial}</span>
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Claimed gifts: <span className="font-semibold text-text-primary">{props.claimStats.claimedItems}</span> · Purchasers named: <span className="font-semibold text-text-primary">{props.claimStats.namedPurchaserItems}</span>
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Purchasers named: <span className="font-semibold text-text-primary">{claimAttributionCoverageRate}%</span> · Fully claimed gifts: <span className="font-semibold text-text-primary">{props.claimStats.fullyClaimedItems}</span>
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Partial claims: <span className="font-semibold text-text-primary">{props.claimStats.partiallyClaimedItems}</span> · Missing purchaser names: <span className="font-semibold text-text-primary">{props.claimStats.missingPurchaserItems}</span>
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Claimed quantity: <span className="font-semibold text-text-primary">{props.claimStats.claimedQuantity}</span> · Still open: <span className="font-semibold text-text-primary">{props.claimStats.remainingQuantity}</span>
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Visible to guests: <span className="font-semibold text-text-primary">{props.guestVisibilityStats.guestVisibleItems}</span> · Hidden when purchased: <span className="font-semibold text-text-primary">{props.guestVisibilityStats.hiddenPurchasedItems}</span>
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Ready for guests: <span className="font-semibold text-text-primary">{guestReadyCoverageRate}%</span> · Visible to guests: <span className="font-semibold text-text-primary">{guestVisibleCoverageRate}%</span>
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Gifts ready for guests: <span className="font-semibold text-text-primary">{props.guestVisibilityStats.guestReadyItems}</span> · Blocked from guests: <span className="font-semibold text-text-primary">{props.guestVisibilityStats.blockedGuestItems}</span>
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Visible and available now: <span className="font-semibold text-text-primary">{props.guestVisibilityStats.visibleAvailableItems}</span> · Claimed but still visible: <span className="font-semibold text-text-primary">{props.guestVisibilityStats.visibleClaimedItems}</span>
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Thank-yous sent: <span className="font-semibold text-text-primary">{props.registryThankYouStats.completedCount}</span> · Still pending: <span className="font-semibold text-text-primary">{props.registryThankYouStats.pendingCount}</span>
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  {props.registryThankYouStats.readyToSendCount === 0 && props.registryThankYouStats.blockedByMissingPurchaserCount === 0 ? (
                    <>No gifts are waiting on send or a missing purchaser name right now</>
                  ) : (
                    <>
                      Ready to send: <span className="font-semibold text-text-primary">{props.registryThankYouStats.readyToSendCount}</span> · Missing purchaser names: <span className="font-semibold text-text-primary">{props.registryThankYouStats.blockedByMissingPurchaserCount}</span>
                    </>
                  )}
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Purchasers named: <span className="font-semibold text-text-primary">{props.registryThankYouStats.attributionCoverageRate}%</span> · Thank-yous sent: <span className="font-semibold text-text-primary">{props.registryThankYouStats.completionRate}%</span>
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Cash funds received: <span className="font-semibold text-text-primary">${props.fundStats.received.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  {props.fundStats.readyToShare === 0 && props.fundStats.needsSetup === 0 ? (
                    <>No fund links are waiting on a share path right now</>
                  ) : (
                    <>
                      Ready to share now: <span className="font-semibold text-text-primary">{props.fundStats.readyToShare}</span> · Missing share path: <span className="font-semibold text-text-primary">{props.fundStats.needsSetup}</span>
                    </>
                  )}
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Ready to share: <span className="font-semibold text-text-primary">{fundShareReadyRate}%</span> · Funds with a goal: <span className="font-semibold text-text-primary">{fundGoalCoverageRate}%</span>
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  {props.fundStats.withProgress === 0 ? (
                    <>No funds are already receiving gifts yet</>
                  ) : (
                    <>
                      Receiving gifts: <span className="font-semibold text-text-primary">{fundReceivingCoverageRate}%</span> · Already receiving gifts: <span className="font-semibold text-text-primary">{props.fundStats.withProgress}</span>
                    </>
                  )}
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Ready funds receiving gifts: <span className="font-semibold text-text-primary">{props.fundStats.readyWithProgress}</span> · Waiting on a first gift: <span className="font-semibold text-text-primary">{props.fundStats.readyAwaitingFirstGift}</span>
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  {props.fundStats.withGoal === 0 && props.fundStats.missingGoal === 0 ? (
                    <>No fund goals still need setup right now</>
                  ) : (
                    <>
                      Funds with a goal: <span className="font-semibold text-text-primary">{props.fundStats.withGoal}</span> · Missing a goal: <span className="font-semibold text-text-primary">{props.fundStats.missingGoal}</span>
                    </>
                  )}
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  {props.fundStats.flexibleWithProgress === 0 && props.fundStats.withProgress === 0 ? (
                    <>No flexible or goal-based funds are already receiving gifts yet</>
                  ) : (
                    <>
                      Flexible funds receiving gifts: <span className="font-semibold text-text-primary">{props.fundStats.flexibleWithProgress}</span> · Goal-based funds receiving gifts: <span className="font-semibold text-text-primary">{props.fundStats.withProgress}</span>
                    </>
                  )}
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Multi-quantity gifts in progress: <span className="font-semibold text-text-primary">{props.claimStats.multiQuantityInProgress}</span> · Fully claimed gifts: <span className="font-semibold text-text-primary">{props.claimStats.fullyClaimedItems}</span>
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  Purchasers named: <span className="font-semibold text-text-primary">{props.registryThankYouPlan.namedPurchaserCount}</span> · Missing purchaser names: <span className="font-semibold text-text-primary">{props.registryThankYouPlan.missingPurchaserCount}</span>
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  {props.alertCounts.imageIssues === 0 && props.duplicateGroups.length === 0 ? (
                    <>No image issues or duplicate groups</>
                  ) : (
                    <>
                      Image issues: <span className="font-semibold text-text-primary">{props.alertCounts.imageIssues}</span> · Duplicate groups: <span className="font-semibold text-text-primary">{props.duplicateGroups.length}</span>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card variant="bordered" padding="lg">
              <p className="text-sm font-semibold text-text-primary">Top registry progress</p>
              <p className="mt-1 text-sm text-text-secondary">{topRegistryProgressSummary}</p>
              <div className="mt-3 space-y-2.5">
                {props.topRegistryItems.length === 0 ? (
                  <p className="text-sm text-text-secondary">No top registry gifts to track yet.</p>
                ) : props.topRegistryItems.map((item) => {
                  const quantityNeeded = Math.max(item.quantity_needed ?? 1, 1);
                  const quantityPurchased = item.quantity_purchased ?? 0;
                  const progress = Math.min(100, Math.round((quantityPurchased / quantityNeeded) * 100));
                  const remainingQuantity = Math.max(quantityNeeded - quantityPurchased, 0);
                  return (
                    <div key={item.id} className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-text-primary">{getOwnerRegistryDisplayTitle(item.item_name)}</p>
                        <span className="text-xs text-text-tertiary">{quantityPurchased}/{quantityNeeded}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-xl bg-surface-subtle">
                        <div className="h-full rounded-xl bg-primary" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-text-secondary">
                        {quantityPurchased === 0
                          ? 'Still fully open'
                          : remainingQuantity === 0
                            ? 'Fully claimed'
                            : `${remainingQuantity} still open`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card variant="bordered" padding="lg">
              <p className="text-sm font-semibold text-text-primary">Recent registry activity</p>
              <p className="mt-1 text-sm text-text-secondary">{recentActivitySummary}</p>
              <div className="mt-3 space-y-2.5">
                {props.recentActivity.length === 0 ? (
                  <p className="text-sm text-text-secondary">No recent registry changes yet.</p>
                ) : props.recentActivity.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-text-primary">{getOwnerRegistryDisplayTitle(item.item_name)}</p>
                      <span className="text-xs text-text-tertiary">{formatRegistryPurchaseStatusLabel(item.purchase_status)}</span>
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">{formatRegistryActivityDetail(item)} · Updated {formatRegistryItemDate(item.updated_at ?? item.created_at)}</p>
                  </div>
                ))}
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
                {props.registryThankYouSyncing ? 'Saving…' : 'Save thank-you updates'}
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-xl border border-border px-2 py-1 text-text-tertiary">
                Purchased gifts: {props.registryThankYouPlan.purchasedCount}
              </span>
              <span className="rounded-xl border border-border px-2 py-1 text-text-tertiary">
                Purchasers named: {props.registryThankYouPlan.namedPurchaserCount}
              </span>
              <span className="rounded-xl border border-border px-2 py-1 text-text-tertiary">
                Missing purchaser names: {props.registryThankYouPlan.missingPurchaserCount}
              </span>
              <span className="rounded-xl border border-border px-2 py-1 text-text-tertiary">
                Thank-yous sent: {props.registryThankYouPlan.completedCount}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {props.registryThankYouPlan.items.length === 0 ? (
                <p className="text-sm text-text-secondary">No purchased gifts need a thank-you yet.</p>
              ) : props.registryThankYouPlan.items.map((item) => (
                <div key={item.id} className="rounded-xl border border-border-subtle bg-surface-subtle/20 p-4">
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
                          Open gift
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

      <section className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Deeper registry work</p>
            <h2 className="mt-3 font-serif text-2xl font-normal text-text-primary">Clean up, review, and keep the guest view trustworthy.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">This is where the heavier registry operations live: imported-link cleanup, duplicate review, image refresh, thank-you follow-up, and the detailed item list.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-text-tertiary">
            <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">Cleanup queue {props.repairQueue.length}</span>
            <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">Duplicate groups {props.duplicateGroups.length}</span>
            <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">Image issues {props.alertCounts.imageIssues}</span>
          </div>
        </div>
      </section>

      <Card variant="bordered" padding="lg" className="border-border-subtle bg-white">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Registry workspace</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Search gifts, narrow the view, and open the maintenance lanes only when you need them.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="search"
              value={props.search}
              onChange={(event) => props.setSearch(event.target.value)}
              placeholder="Search by name or store…"
              className="w-full pl-9 pr-4 py-2.5 bg-surface-subtle border border-border rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-1 bg-surface-subtle rounded-xl p-1 border border-border">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => props.setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
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
            className={`rounded-xl border px-2.5 py-1 text-xs font-medium ${props.showAlertsOnly ? 'border-border-subtle bg-primary-light text-primary' : 'border-border text-text-tertiary'}`}
          >
            {props.showAlertsOnly ? 'Review items on' : 'Focus review items'}
          </button>
          <button
            onClick={() => props.setShowImageIssuesOnly((value) => !value)}
            className={`rounded-xl border px-2.5 py-1 text-xs font-medium ${props.showImageIssuesOnly ? 'border-border-subtle bg-primary-light text-primary' : 'border-border text-text-tertiary'}`}
          >
            {props.showImageIssuesOnly ? 'Photo issues on' : 'Focus image issues'}
          </button>
          {props.showImageIssuesOnly && (
            <>
              <button
                onClick={() => void props.handleRefreshImageIssues()}
                disabled={props.imageRefreshBusy}
                className="rounded-xl border border-border-subtle bg-primary-light px-2 py-1 text-xs font-medium text-primary disabled:opacity-60"
              >
                {props.imageRefreshBusy ? 'Refreshing…' : 'Fix image issues now'}
              </button>
              <button
                onClick={() => props.setShowImageIssuesOnly(false)}
                className="rounded-xl border border-border px-2 py-1 text-text-tertiary"
              >
                Clear
              </button>
            </>
          )}
          <span className="rounded-xl border border-border px-2 py-1 text-xs font-medium text-text-tertiary">
            Review items: {props.alertCounts.stale + props.alertCounts.priceChanged + props.alertCounts.outOfStock}
          </span>
          <span className="rounded-xl border border-border px-2 py-1 text-xs font-medium text-text-tertiary">
            Photo issues: {props.alertCounts.imageIssues}
          </span>
          <span className="rounded-xl border border-border px-2 py-1 text-xs font-medium text-text-tertiary">
            Cleanup queue: {props.repairQueue.length}
          </span>
          <span className="rounded-xl border border-border px-2 py-1 text-xs font-medium text-text-tertiary">
            Gifts needing detail touchup: {props.normalizedItems.filter((item) => getRegistryRepairStates(item).length > 0).length}
          </span>
          <span className="rounded-xl border border-border px-2 py-1 text-xs font-medium text-text-tertiary">
            Duplicate groups: {props.duplicateGroups.length}
          </span>
          {props.actionableBadImportCount > 0 && (
            <button
              onClick={() => void props.handleRepairBadImports()}
              disabled={props.repairingBadImports}
              className="rounded-xl border border-border-subtle bg-primary-light px-2 py-1 text-xs font-medium text-primary disabled:opacity-60"
            >
              {props.repairingBadImports ? 'Cleaning up…' : 'Clean up imported gifts'}
            </button>
          )}
          <span className={`rounded-xl border px-2 py-1 ${props.nearBudgetCap ? 'border-border-subtle bg-primary-light text-primary' : 'border-border text-text-tertiary'}`}>
            Monthly refresh budget used: {Math.round(props.budgetUtilization * 100)}%
          </span>
        </div>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 p-4">
            <p className="text-xs text-text-tertiary">Detail touchups</p>
            <p className="mt-1 text-lg font-semibold text-text-primary">{props.bulkReviewCounts.repair}</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 p-4">
            <p className="text-xs text-text-tertiary">Duplicate checks</p>
            <p className="mt-1 text-lg font-semibold text-text-primary">{props.bulkReviewCounts.duplicates}</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 p-4">
            <p className="text-xs text-text-tertiary">Photo refresh</p>
            <p className="mt-1 text-lg font-semibold text-text-primary">{props.bulkReviewCounts.imageIssues}</p>
          </div>
        </div>

        <div className="mb-3 rounded-2xl border border-border-subtle bg-surface-subtle/20 p-4 text-sm text-text-secondary">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Cleanup tools</p>
          <p className="mt-3 leading-6">{cleanupToolsLeadSummary}</p>
          <p className="mt-2 leading-6">These tools help tidy imported links, repeated gifts, and product photos without merging or deleting anything unless you choose it.</p>
          {cleanupToolsAllClearLabel ? <p className="mt-2">{cleanupToolsAllClearLabel}</p> : null}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {props.bulkReviewCounts.repair > 0 && <button onClick={() => void props.handleRepairBadImports()} disabled={props.repairingBadImports} className="rounded-xl border border-border-subtle bg-primary-light px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-60" title="Refresh weaker gift details without deleting items">{props.repairingBadImports ? 'Cleaning up…' : 'Refresh details'}</button>}
          {props.bulkReviewCounts.imageIssues > 0 && <button onClick={() => void props.handleRefreshImageIssues()} disabled={props.imageRefreshBusy} className="rounded-xl border border-border-subtle bg-primary-light px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-60">{props.imageRefreshBusy ? 'Refreshing…' : 'Refresh image issues'}</button>}
          {props.duplicateGroups.length > 0 && (
            <button
              onClick={() => { void handleCopyDuplicateReviewList(); }}
              disabled={copyingDuplicateReviewList}
              className="px-3 py-1.5 rounded-xl border border-border text-text-secondary text-xs font-medium disabled:opacity-60"
              title="Compare duplicates before removing anything"
            >
              {copyingDuplicateReviewList
                ? 'Copying duplicate list...'
                : duplicateReviewCopyNotice === 'downloaded'
                  ? 'Downloaded duplicate list'
                  : duplicateReviewCopyNotice === 'copied'
                    ? 'Copied duplicate list'
                    : 'Copy duplicate list'}
            </button>
          )}
        </div>

        {props.repairQueue.length > 0 && (
          <div className="mb-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Cleanup queue</p>
                <p className="mt-3 text-sm font-semibold text-text-primary">The items that still need a hands-on pass.</p>
                <p className="mt-2 text-sm text-text-secondary">{cleanupQueueLeadSummary}</p>
                <p className="mt-1 text-xs text-text-tertiary">{cleanupQueueSummary}</p>
              </div>
              <span className="rounded-xl border border-border px-2 py-1 text-xs font-medium text-text-tertiary">
                {props.repairQueue.length} waiting
              </span>
            </div>
            {props.repairQueue.slice(0, 6).map((queueItem) => (
              <div key={queueItem.id} className="rounded-xl border border-border-subtle bg-surface-subtle/20 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">{getOwnerRegistryDisplayTitle(queueItem.item.item_name)}</p>
                      <span className={`rounded-xl border px-2 py-1 text-[11px] ${
                        queueItem.severity === 'high'
                          ? 'border-border-subtle bg-primary-light text-primary'
                          : queueItem.severity === 'medium'
                          ? 'border-border bg-white text-text-secondary'
                          : 'border-border bg-white text-text-tertiary'
                      }`}>
                        {queueItem.severity === 'high' ? 'Fix now' : queueItem.severity === 'medium' ? 'Look soon' : 'Keep fresh'}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary">{queueItem.summary}</p>
                    <p className="text-xs text-text-secondary">{queueItem.detail}</p>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {queueItem.states.map((state) => (
                        <span key={`${queueItem.id}-${state}`} className="rounded-xl border border-border bg-white px-2 py-1 text-text-tertiary">
                          {state.replace(/-/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:max-w-[250px] lg:justify-end">
                    <button
                      type="button"
                      onClick={() => void props.handleRunRepairQueueAction(queueItem, queueItem.secondaryAction)}
                      className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-text-secondary"
                    >
                      {queueItem.secondaryActionLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => void props.handleRunRepairQueueAction(queueItem, queueItem.primaryAction)}
                      className="rounded-xl border border-border-subtle bg-primary-light px-3 py-1.5 text-xs font-medium text-primary"
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
        {props.repairQueue.length === 0 && (
          <div className="mb-4 rounded-xl border border-border-subtle bg-surface-subtle/20 p-4">
            <p className="text-sm font-semibold text-text-primary">Cleanup queue</p>
            <p className="mt-1 text-sm text-text-secondary">{cleanupQueueSummary}</p>
          </div>
        )}

        {props.duplicateGroups.length > 0 && (
          <div className="mb-4 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Duplicate checks</p>
              <p className="mt-3 text-sm font-semibold text-text-primary">Compare repeated gifts before you merge anything.</p>
              <p className="mt-2 text-sm text-text-secondary">{duplicateQueueSummary}</p>
              {duplicateQueueDetail ? <p className="mt-1 text-xs text-text-tertiary">{duplicateQueueDetail}</p> : null}
            </div>
            {props.duplicateGroups.slice(0, 4).map((group) => (
              <div key={group.id} className="rounded-xl border border-border-subtle bg-surface-subtle/20 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Possible repeat group</p>
                      <p className="mt-1 text-xs text-text-secondary">
                        Keep <span className="font-medium text-text-primary">{getOwnerRegistryDisplayTitle(group.primaryItem.item_name)}</span> and merge {group.secondaryItems.length} repeat{group.secondaryItems.length === 1 ? '' : 's'} into it.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {group.signals.map((signal) => (
                        <span key={`${signal.kind}-${signal.value ?? signal.label}`} className="rounded-xl border border-border bg-white px-2 py-1 text-text-tertiary">
                          {signal.label}
                        </span>
                      ))}
                      <span className="rounded-xl border border-border bg-white px-2 py-1 text-text-tertiary">
                        Merged quantity: {group.mergedQuantityPurchased}/{group.mergedQuantityNeeded}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-text-secondary">
                      {group.items.map((item) => (
                        <p key={item.id}>
                          • {getOwnerRegistryDisplayTitle(item.item_name)}
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
                      className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-text-secondary"
                    >
                      Open keep item
                    </button>
                    <button
                      onClick={() => void props.handleMergeDuplicateGroup(group)}
                      disabled={props.mergingDuplicateGroupId === group.id}
                      className="rounded-xl border border-border-subtle bg-primary-light px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-60"
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

        {props.loading && props.items.length === 0 ? (
          <DashboardStateBlock title="Loading registry…" description="Pulling your latest items and settings." />
        ) : props.error && props.items.length === 0 ? (
          <DashboardStateBlock title="Couldn’t open registry right now" description={props.error} tone="error" />
        ) : !props.weddingSiteId ? (
          <DashboardStateBlock title="No wedding site found" description="Complete onboarding first to set up your registry." />
        ) : props.filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-subtle">
              <Gift className="w-8 h-8 text-text-tertiary" />
            </div>
            <div>
              <p className="text-text-primary font-semibold mb-1">
                {props.items.length === 0 ? 'No registry gifts added yet.' : 'No registry gifts match this filter right now.'}
              </p>
              <p className="text-sm text-text-secondary max-w-xs mx-auto">
                {props.items.length === 0
                  ? 'Add your first gift or fund when you want guests to have registry options.'
                  : 'Try a broader search or switch filters to bring those gifts back into view.'}
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
          <section className="space-y-4">
            <div className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Gift workspace</p>
                  <h2 className="mt-3 text-lg font-semibold text-text-primary">Review the items guests can browse, claim, and fund.</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                    Search, filter, and maintain the list here. The deeper cleanup queue stays above, while this grid is the day-to-day view of what guests will actually encounter.
                  </p>
                </div>
                <div className="inline-flex flex-wrap gap-2 text-xs text-text-tertiary">
                  <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">Search by gift or store</span>
                  <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">Track purchase state</span>
                  <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">Open details when needed</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
          </section>
        )}
      </Card>
    </div>
  );
}
