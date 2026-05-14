import { buildRegistryInsights } from '../../../lib/invisibleIntelligence';
import { buildRegistryLaunchReadiness, buildRegistryThankYouPlanWithLedger, type RegistryThankYouLedger } from '../../../lib/registryLaunchReadiness';
import { getSafePublicWebUrl } from '../../../sections/publicLinks';
import { ageExceedsMs, getRegistryItemTimestamp } from '../registryItemTime';
import { buildRegistryDuplicateGroups } from './duplicateRegistryItems';
import { getRegistryItemMetadataState } from './registryTypes';
import type { RegistryFilter, RegistryItem } from './registryTypes';
import { buildRegistryRepairQueue } from './repairState';

const WEEKLY_REFRESH_MS = 1000 * 60 * 60 * 24 * 7;

function hasImageIssue(item: RegistryItem) {
  const src = (item.image_url || '').toLowerCase();
  return !item.image_url || src.includes('thum.io') || src.includes('weserv.nl') || src.includes('ui-avatars');
}

function countSafeFundMethods(item: RegistryItem) {
  let count = 0;
  if (getSafePublicWebUrl(item.fund_venmo_url)) count += 1;
  if (getSafePublicWebUrl(item.fund_paypal_url)) count += 1;
  if (getSafePublicWebUrl(item.fund_custom_url)) count += 1;
  if (String(item.fund_zelle_handle ?? '').trim()) count += 1;
  return count;
}

interface BuildRegistryDashboardDerivedStateArgs {
  autoRefreshEnabled: boolean;
  items: RegistryItem[];
  monthlyRefreshCap: number;
  monthlyRefreshCount: number;
  registryThankYouLedger: RegistryThankYouLedger;
  refreshEnabledUntil: Date | null;
  refreshIncludePurchased: boolean;
  search: string;
  filter: RegistryFilter;
  showAlertsOnly: boolean;
  showImageIssuesOnly: boolean;
}

export function buildRegistryDashboardDerivedState(args: BuildRegistryDashboardDerivedStateArgs) {
  const {
    autoRefreshEnabled,
    items,
    monthlyRefreshCap,
    monthlyRefreshCount,
    registryThankYouLedger,
    refreshEnabledUntil,
    refreshIncludePurchased,
    search,
    filter,
    showAlertsOnly,
    showImageIssuesOnly,
  } = args;

  const duplicateGroups = buildRegistryDuplicateGroups(items);
  const actionableBadImportCount = items.filter((item) => getRegistryItemMetadataState(item).hasBadImportTitle && !!(item.item_url || item.canonical_url)).length;
  const repairQueue = buildRegistryRepairQueue(items);
  const bulkReviewCounts = {
    repair: repairQueue.length,
    duplicates: duplicateGroups.reduce((sum, group) => sum + group.items.length, 0),
    imageIssues: items.filter((item) => hasImageIssue(item)).length,
  };

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      item.item_name.toLowerCase().includes(q) ||
      (item.merchant ?? '').toLowerCase().includes(q) ||
      (item.store_name ?? '').toLowerCase().includes(q);
    const matchesFilter = filter === 'all' || item.purchase_status === filter;
    const hasAlert =
      !item.metadata_last_checked_at ||
      ageExceedsMs(item.metadata_last_checked_at, WEEKLY_REFRESH_MS) ||
      (item.availability || '').toLowerCase().includes('out') ||
      (item.previous_price_amount != null && item.price_amount != null && item.previous_price_amount !== item.price_amount);
    const imageIssue = hasImageIssue(item);
    const matchesAlerts = !showAlertsOnly || hasAlert;
    const matchesImageIssues = !showImageIssuesOnly || imageIssue;
    return matchesSearch && matchesFilter && matchesAlerts && matchesImageIssues;
  });

  const refreshWindowOpen = autoRefreshEnabled && (!refreshEnabledUntil || refreshEnabledUntil.getTime() >= Date.now());
  const refreshBudgetRemaining = Math.max(0, monthlyRefreshCap - monthlyRefreshCount);
  const budgetUtilization = monthlyRefreshCap > 0 ? monthlyRefreshCount / monthlyRefreshCap : 0;
  const nearBudgetCap = budgetUtilization >= 0.8;
  const eligibleItemCount = items.filter((item) => refreshIncludePurchased || (item.purchase_status !== 'purchased' && !item.hide_when_purchased)).length;
  const projectedMonthlyCalls = Math.min(eligibleItemCount, monthlyRefreshCap);
  const projectedRefreshCoverage = eligibleItemCount > 0 ? Math.round((projectedMonthlyCalls / eligibleItemCount) * 100) : 100;
  const daysUntilRefreshWindowEnd = refreshEnabledUntil ? Math.ceil((refreshEnabledUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const baseRecommendedPreset: 'lean' | 'balanced' | 'aggressive' = items.length <= 40 ? 'lean' : items.length <= 120 ? 'balanced' : 'aggressive';
  const recommendedPreset: 'lean' | 'balanced' | 'aggressive' = (daysUntilRefreshWindowEnd != null && daysUntilRefreshWindowEnd <= 14) ? 'lean' : baseRecommendedPreset;

  const counts = {
    total: items.length,
    purchased: items.filter((item) => item.purchase_status === 'purchased').length,
    partial: items.filter((item) => item.purchase_status === 'partial').length,
    available: items.filter((item) => item.purchase_status === 'available').length,
    totalValue: items.reduce((sum, item) => sum + (item.price_amount ?? 0), 0),
  };

  const claimStats = items.reduce((acc, item) => {
    const quantityNeeded = Math.max(item.quantity_needed ?? 1, 1);
    const quantityPurchased = Math.max(item.quantity_purchased ?? 0, 0);
    const isClaimed = item.purchase_status === 'purchased' || item.purchase_status === 'partial' || quantityPurchased > 0;

    if (!isClaimed) {
      acc.remainingQuantity += quantityNeeded;
      return acc;
    }

    acc.claimedItems += 1;
    acc.claimedQuantity += quantityPurchased;
    acc.remainingQuantity += Math.max(quantityNeeded - quantityPurchased, 0);

    if (item.purchase_status === 'purchased') acc.fullyClaimedItems += 1;
    if (item.purchase_status === 'partial') acc.partiallyClaimedItems += 1;
    if (String(item.purchaser_name ?? '').trim()) acc.namedPurchaserItems += 1;
    else acc.missingPurchaserItems += 1;
    if (quantityNeeded > 1 && quantityPurchased > 0 && quantityPurchased < quantityNeeded) {
      acc.multiQuantityInProgress += 1;
    }

    return acc;
  }, {
    claimedItems: 0,
    claimedQuantity: 0,
    fullyClaimedItems: 0,
    partiallyClaimedItems: 0,
    namedPurchaserItems: 0,
    missingPurchaserItems: 0,
    multiQuantityInProgress: 0,
    remainingQuantity: 0,
  });

  const fundStats = items.reduce((acc, item) => {
    if (item.item_type !== 'cash_fund') return acc;
    const safeMethodCount = countSafeFundMethods(item);
    const goalAmount = item.fund_goal_amount ?? 0;
    const receivedAmount = item.fund_received_amount ?? 0;
    const hasProgress = receivedAmount > 0;
    acc.count += 1;
    acc.goal += goalAmount;
    acc.received += receivedAmount;
    if (safeMethodCount > 0) {
      acc.readyToShare += 1;
      if (hasProgress) acc.readyWithProgress += 1;
      else acc.readyAwaitingFirstGift += 1;
    } else {
      acc.needsSetup += 1;
    }
    if (goalAmount > 0) {
      acc.withGoal += 1;
      if (hasProgress) acc.withProgress += 1;
      else acc.awaitingFirstGift += 1;
    } else {
      acc.missingGoal += 1;
      if (hasProgress) acc.flexibleWithProgress += 1;
    }
    return acc;
  }, {
    count: 0,
    goal: 0,
    received: 0,
    readyToShare: 0,
    needsSetup: 0,
    readyWithProgress: 0,
    readyAwaitingFirstGift: 0,
    withGoal: 0,
    missingGoal: 0,
    withProgress: 0,
    awaitingFirstGift: 0,
    flexibleWithProgress: 0,
  });

  const fulfillmentRate = counts.total > 0 ? Math.round((counts.purchased / counts.total) * 100) : 0;
  const recentActivity = [...items]
    .filter((item) => item.updated_at || item.created_at)
    .sort((a, b) => getRegistryItemTimestamp(b.updated_at ?? b.created_at) - getRegistryItemTimestamp(a.updated_at ?? a.created_at))
    .slice(0, 6);
  const topRegistryItems = [...items]
    .sort((a, b) => {
      const aProgress = (a.quantity_purchased ?? 0) / Math.max(a.quantity_needed ?? 1, 1);
      const bProgress = (b.quantity_purchased ?? 0) / Math.max(b.quantity_needed ?? 1, 1);
      return bProgress - aProgress;
    })
    .slice(0, 5);
  const registryInsights = buildRegistryInsights(items.map((item) => ({
    category: item.item_type === 'cash_fund' ? 'cash funds' : null,
    store_name: item.store_name ?? item.merchant,
    item_name: item.item_name,
    image_url: item.image_url,
    price: item.price_amount,
    contributionMethodCount: item.item_type === 'cash_fund' ? countSafeFundMethods(item) : 0,
    goalAmount: item.item_type === 'cash_fund' ? item.fund_goal_amount ?? 0 : 0,
    receivedAmount: item.item_type === 'cash_fund' ? item.fund_received_amount ?? 0 : 0,
    purchaseStatus: item.purchase_status,
    purchaserName: item.purchaser_name,
    quantityPurchased: item.quantity_purchased,
  }))).slice(0, 3);
  const registryLaunchReadiness = buildRegistryLaunchReadiness(items, registryThankYouLedger);
  const registryThankYouPlan = buildRegistryThankYouPlanWithLedger(items, registryThankYouLedger);

  const alertCounts = {
    stale: items.filter((item) => ageExceedsMs(item.metadata_last_checked_at, 1000 * 60 * 60 * 24)).length,
    priceChanged: items.filter((item) => item.previous_price_amount != null && item.price_amount != null && item.previous_price_amount !== item.price_amount).length,
    outOfStock: items.filter((item) => (item.availability || '').toLowerCase().includes('out')).length,
    imageIssues: items.filter((item) => hasImageIssue(item)).length,
    badImports: items.filter((item) => getRegistryItemMetadataState(item).hasBadImportTitle).length,
  };

  return {
    actionableBadImportCount,
    alertCounts,
    baseRecommendedPreset,
    budgetUtilization,
    bulkReviewCounts,
    claimStats,
    counts,
    daysUntilRefreshWindowEnd,
    duplicateGroups,
    eligibleItemCount,
    filtered,
    fulfillmentRate,
    fundStats,
    nearBudgetCap,
    projectedMonthlyCalls,
    projectedRefreshCoverage,
    recentActivity,
    recommendedPreset,
    repairQueue,
    refreshBudgetRemaining,
    refreshWindowOpen,
    registryInsights,
    registryLaunchReadiness,
    registryThankYouPlan,
    topRegistryItems,
  };
}
