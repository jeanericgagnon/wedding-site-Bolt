import { buildRegistryInsights } from '../../../lib/invisibleIntelligence';
import { buildRegistryLaunchReadiness, buildRegistryThankYouPlan } from '../../../lib/registryLaunchReadiness';
import { ageExceedsMs, getRegistryItemTimestamp } from '../registryItemTime';
import { findDuplicateRegistryGroups } from './duplicateRegistryItems';
import { getRegistryItemMetadataState } from './registryTypes';
import type { RegistryFilter, RegistryItem } from './registryTypes';

const WEEKLY_REFRESH_MS = 1000 * 60 * 60 * 24 * 7;

interface BuildRegistryDashboardDerivedStateArgs {
  autoRefreshEnabled: boolean;
  items: RegistryItem[];
  monthlyRefreshCap: number;
  monthlyRefreshCount: number;
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
    refreshEnabledUntil,
    refreshIncludePurchased,
    search,
    filter,
    showAlertsOnly,
    showImageIssuesOnly,
  } = args;

  const duplicateGroups = findDuplicateRegistryGroups(items);
  const actionableBadImportCount = items.filter((item) => getRegistryItemMetadataState(item).hasBadImportTitle && !!(item.item_url || item.canonical_url)).length;
  const bulkReviewCounts = {
    repair: actionableBadImportCount,
    duplicates: duplicateGroups.reduce((sum, group) => sum + group.length, 0),
    imageIssues: items.filter((item) => !item.image_url || item.image_url.includes('thum.io') || item.image_url.includes('weserv.nl')).length,
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
    const hasImageIssue = !item.image_url || item.image_url.includes('thum.io') || item.image_url.includes('weserv.nl');
    const matchesAlerts = !showAlertsOnly || hasAlert;
    const matchesImageIssues = !showImageIssuesOnly || hasImageIssue;
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

  const fundStats = items.reduce((acc, item) => {
    if (item.item_type !== 'cash_fund') return acc;
    acc.count += 1;
    acc.goal += item.fund_goal_amount ?? 0;
    acc.received += item.fund_received_amount ?? 0;
    return acc;
  }, { count: 0, goal: 0, received: 0 });

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
  }))).slice(0, 3);
  const registryLaunchReadiness = buildRegistryLaunchReadiness(items);
  const registryThankYouPlan = buildRegistryThankYouPlan(items);

  const alertCounts = {
    stale: items.filter((item) => ageExceedsMs(item.metadata_last_checked_at, 1000 * 60 * 60 * 24)).length,
    priceChanged: items.filter((item) => item.previous_price_amount != null && item.price_amount != null && item.previous_price_amount !== item.price_amount).length,
    outOfStock: items.filter((item) => (item.availability || '').toLowerCase().includes('out')).length,
    imageIssues: items.filter((item) => !item.image_url || item.image_url.includes('thum.io') || item.image_url.includes('weserv.nl')).length,
    badImports: items.filter((item) => getRegistryItemMetadataState(item).hasBadImportTitle).length,
  };

  return {
    actionableBadImportCount,
    alertCounts,
    baseRecommendedPreset,
    budgetUtilization,
    bulkReviewCounts,
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
    refreshBudgetRemaining,
    refreshWindowOpen,
    registryInsights,
    registryLaunchReadiness,
    registryThankYouPlan,
    topRegistryItems,
  };
}
