import { useEffect, useMemo, useRef, useState } from 'react';

import { copyTextOrDownload } from '../../../lib/copyText';
import { ageExceedsMs, isRegistryItemDue } from '../registryItemTime';
import { createRegistryItem, fetchUrlPreview, findDuplicateItem, mergeDuplicateRegistryItems, saveRegistryImportBatch, type RegistryImportBatchRecord, updateRegistryItem, updateRegistryRefreshBudget } from './registryService';
import { buildRegistryDuplicateMergePatch } from './duplicateRegistryItems';
import type { RegistryDuplicateGroup } from './duplicateRegistryItems';
import type { RegistryItem } from './registryTypes';
import { buildRegistryHiddenReviewPatch, buildRegistryLinkOnlyRepairPatch, buildRegistrySafetyRevalidationPatch, getOwnerRegistryDisplayTitle, getRegistryItemMetadataState } from './registryTypes';
import { buildRegistryRefreshFields, getRegistryRefreshSourceUrl } from './registryRefreshFields';
import { buildDemoRegistryRepairPatch } from './registryDemoRepair';
import { buildRegistryRepairRunSummary, buildRegistryRepairRunToast, type RegistryRepairRunSummary } from './registryRepairSummary';
import { buildRegistryTruthSweepPrediction } from './registryTruthSweep';

const WEEKLY_REFRESH_MS = 1000 * 60 * 60 * 24 * 7;
const getBackoffMs = (failCount: number) => Math.min(WEEKLY_REFRESH_MS * 4, Math.max(6 * 60 * 60 * 1000, (2 ** Math.min(5, failCount)) * 60 * 60 * 1000));
type CopyActionResult = 'copied' | 'downloaded';
export type RegistryBulkImportResult = 'clean' | 'link_only' | 'needs_review' | 'duplicate' | 'failed';

export interface RegistryBulkImportSummaryItem {
  url: string;
  result: RegistryBulkImportResult;
  displayTitle: string;
  storeName: string | null;
  reason: string | null;
  registryItemId?: string | null;
}

export interface RegistryBulkImportSummary {
  totalCount: number;
  cleanCount: number;
  linkOnlyCount: number;
  needsReviewCount: number;
  duplicateCount: number;
  failedCount: number;
  items: RegistryBulkImportSummaryItem[];
}

interface UseRegistryMaintenanceActionsArgs {
  duplicateGroups: RegistryDuplicateGroup[];
  ensureMonthlyBudgetState: () => Promise<{ monthKey: string; count: number }>;
  isDemoMode: boolean;
  items: RegistryItem[];
  monthlyRefreshCap: number;
  normalizeOwnerDashboardRegistryItem: (item: RegistryItem) => RegistryItem;
  refreshIncludePurchased: boolean;
  refreshWindowOpen: boolean;
  setBulkImportOpen: (open: boolean) => void;
  setBulkUrls: (value: string) => void;
  setLatestImportBatchSummary: (value: RegistryImportBatchRecord | null) => void;
  setRecentImportBatchesSummary: (value: RegistryImportBatchRecord[] | null) => void;
  setItems: React.Dispatch<React.SetStateAction<RegistryItem[]>>;
  setMonthlyRefreshCount: React.Dispatch<React.SetStateAction<number>>;
  setMonthlyRefreshMonth: React.Dispatch<React.SetStateAction<string | null>>;
  toast: (message: string, type?: 'success' | 'error') => void;
  logRegistryAction: (type: string, summary: string, metadata?: Record<string, unknown>, targetId?: string | null, targetLabel?: string | null) => void;
  weddingSiteId: string | null;
}

export function useRegistryMaintenanceActions(args: UseRegistryMaintenanceActionsArgs) {
  const {
    duplicateGroups,
    ensureMonthlyBudgetState,
    isDemoMode,
    items,
    monthlyRefreshCap,
    normalizeOwnerDashboardRegistryItem,
    refreshIncludePurchased,
    refreshWindowOpen,
    setBulkImportOpen,
    setBulkUrls,
    setLatestImportBatchSummary,
    setRecentImportBatchesSummary,
    setItems,
    setMonthlyRefreshCount,
    setMonthlyRefreshMonth,
    toast,
    logRegistryAction,
    weddingSiteId,
  } = args;

  const [autoRefreshing, setAutoRefreshing] = useState(false);
  const [bulkImportBusy, setBulkImportBusy] = useState(false);
  const [bulkImportSummary, setBulkImportSummary] = useState<RegistryBulkImportSummary | null>(null);
  const [imageRefreshBusy, setImageRefreshBusy] = useState(false);
  const [lastRepairRunSummary, setLastRepairRunSummary] = useState<RegistryRepairRunSummary | null>(null);
  const [mergingDuplicateGroupId, setMergingDuplicateGroupId] = useState<string | null>(null);
  const [revalidatingRegistryTruth, setRevalidatingRegistryTruth] = useState(false);
  const [repairingBadImports, setRepairingBadImports] = useState(false);
  const duplicateReviewCopyRequestIdRef = useRef(0);
  const duplicateMergeRequestIdRef = useRef(0);
  const bulkImportRequestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const weddingSiteIdRef = useRef(weddingSiteId);
  weddingSiteIdRef.current = weddingSiteId;
  const duplicateReviewContextKey = useMemo(() => JSON.stringify(duplicateGroups.map((group) => [
    group.id,
    group.primaryItem.id,
    group.primaryItem.item_name,
    group.items.map((item) => [item.id, item.item_name]),
    group.signals.map((signal) => [signal.kind, signal.label, signal.value]),
  ])), [duplicateGroups]);
  const duplicateReviewContextKeyRef = useRef(duplicateReviewContextKey);
  duplicateReviewContextKeyRef.current = duplicateReviewContextKey;

  useEffect(() => () => {
    mountedRef.current = false;
    duplicateReviewCopyRequestIdRef.current += 1;
    duplicateMergeRequestIdRef.current += 1;
    bulkImportRequestIdRef.current += 1;
  }, []);

  useEffect(() => {
    duplicateReviewCopyRequestIdRef.current += 1;
    duplicateMergeRequestIdRef.current += 1;
  }, [duplicateReviewContextKey]);

  useEffect(() => {
    bulkImportRequestIdRef.current += 1;
    setBulkImportBusy(false);
    setBulkImportSummary(null);
    setLastRepairRunSummary(null);
  }, [weddingSiteId, isDemoMode]);

  function resetBulkImportSummary() {
    setBulkImportSummary(null);
  }

  async function handleRefetchMetadata(item: RegistryItem, silent = false, replaceExisting = false) {
    const url = getRegistryRefreshSourceUrl(item);
    if (!url) return false;
    if (isDemoMode) {
      const patch = buildDemoRegistryRepairPatch(item, { replaceExisting });
      const updated = normalizeOwnerDashboardRegistryItem({
        ...item,
        ...patch,
        id: item.id,
        wedding_site_id: item.wedding_site_id,
        created_at: item.created_at,
      } as RegistryItem);
      setItems((prev) => prev.map((candidate) => (candidate.id === item.id ? updated : candidate)));
      logRegistryAction(
        replaceExisting ? 'registry_metadata_reimported' : 'registry_metadata_refreshed',
        replaceExisting ? 'Registry item details were refreshed from the source.' : 'Registry item details were refreshed.',
        {
          fetchStatus: updated.metadata_fetch_status,
          hasImage: Boolean(updated.image_url),
          hasPrice: updated.price_amount != null || Boolean(updated.price_label),
          replaceExisting,
          demoMode: true,
        },
        updated.id,
        updated.item_name,
      );
      if (!silent) toast(replaceExisting ? 'Gift details refreshed from the link' : 'Gift details refreshed');
      return true;
    }

    try {
      const preview = await fetchUrlPreview(url, true);
      const fields = buildRegistryRefreshFields(item, preview, { replaceExisting });
      const refreshSkipped = fields.product_metadata && !Array.isArray(fields.product_metadata)
        && fields.product_metadata.registryLastRefreshSkippedReason === 'new_result_worse';
      if (Object.keys(fields).length > 0) {
        const updated = await updateRegistryItem(item.id, fields);
        setItems((prev) => prev.map((candidate) => (candidate.id === updated.id ? normalizeOwnerDashboardRegistryItem(updated) : candidate)));
        logRegistryAction(
          replaceExisting ? 'registry_metadata_reimported' : 'registry_metadata_refreshed',
          refreshSkipped
            ? 'Registry refresh skipped because the new source result was worse than the saved item.'
            : replaceExisting ? 'Registry item details were refreshed from the source.' : 'Registry item details were refreshed.',
          {
            fetchStatus: fields.metadata_fetch_status,
            hasImage: Boolean(updated.image_url),
            hasPrice: updated.price_amount != null || Boolean(updated.price_label),
            replaceExisting,
            refreshSkipped,
          },
          updated.id,
          updated.item_name,
        );
        if (!silent) toast(refreshSkipped ? 'Refresh skipped because the new result was worse' : replaceExisting ? 'Gift details refreshed from the link' : 'Gift details refreshed');
      } else if (!silent) {
        toast('No new details found — details are up to date');
      }
      return true;
    } catch {
      if (!silent) toast(replaceExisting ? 'Couldn’t refresh this gift right now. Try Edit if the store page is light on details.' : 'Couldn’t refresh gift details right now. Please try again.', 'error');
      return false;
    }
  }

  async function handleRefreshImageIssues() {
    if (isDemoMode || imageRefreshBusy) return;
    const candidates = items
      .filter((item) => {
        const src = (item.image_url || '').toLowerCase();
        return !item.image_url || src.includes('thum.io') || src.includes('weserv.nl') || src.includes('ui-avatars');
      })
      .filter((item) => !!(item.item_url || item.canonical_url))
      .slice(0, 12);

    if (candidates.length === 0) {
      toast('No image issues with refreshable URLs found.');
      return;
    }

    setImageRefreshBusy(true);
    let ok = 0;
    for (const item of candidates) {
      const refreshed = await handleRefetchMetadata(item, true);
      if (refreshed) ok += 1;
    }
    setImageRefreshBusy(false);
    logRegistryAction('registry_image_issues_refreshed', 'Registry image-issue items were refreshed.', {
      candidateCount: candidates.length,
      refreshedCount: ok,
    });
    toast(`Refreshed photos for ${ok}/${candidates.length} gift${candidates.length === 1 ? '' : 's'}.`, ok > 0 ? 'success' : 'error');
  }

  async function handleCopyDuplicateReviewList(): Promise<CopyActionResult | null> {
    const requestId = duplicateReviewCopyRequestIdRef.current + 1;
    duplicateReviewCopyRequestIdRef.current = requestId;
    const requestContextKey = duplicateReviewContextKeyRef.current;
    const isCurrentDuplicateReviewCopy = () => (
      mountedRef.current &&
      requestId === duplicateReviewCopyRequestIdRef.current &&
      requestContextKey === duplicateReviewContextKeyRef.current
    );
    const lines = duplicateGroups.flatMap((group, index) => [
      `Group ${index + 1}: ${group.items.map((item) => getOwnerRegistryDisplayTitle(item.item_name, item)).join(' / ')}`,
      `Why it matches: ${group.signals.map((signal) => signal.label).join(', ')}`,
      `Suggested keep: ${getOwnerRegistryDisplayTitle(group.primaryItem.item_name, group.primaryItem)}`,
    ]);
    if (lines.length === 0) {
      toast('No duplicate groups to review.', 'error');
      return null;
    }
    const payload = lines.join('\n');
    try {
      const result = await copyTextOrDownload(payload, 'dayof-registry-duplicate-review.txt');
      if (!isCurrentDuplicateReviewCopy()) return null;
      if (result === 'copied') {
        toast('Copied duplicate review list');
      } else {
        toast('Clipboard was blocked, so the duplicate review list downloaded.');
      }
      return result;
    } catch {
      if (!isCurrentDuplicateReviewCopy()) return null;
      toast('Couldn’t copy the duplicate review list right now.', 'error');
      return null;
    }
  }

  async function handleMergeDuplicateGroup(group: RegistryDuplicateGroup) {
    if (group.secondaryItems.length === 0 || mergingDuplicateGroupId === group.id) return;

    const requestId = ++duplicateMergeRequestIdRef.current;
    const requestContextKey = duplicateReviewContextKeyRef.current;
    const isCurrentDuplicateMerge = () => (
      mountedRef.current &&
      requestId === duplicateMergeRequestIdRef.current &&
      requestContextKey === duplicateReviewContextKeyRef.current
    );
    const mergedPatch = buildRegistryDuplicateMergePatch(group.primaryItem, group.secondaryItems);
    const secondaryIds = group.secondaryItems.map((item) => item.id);
    setMergingDuplicateGroupId(group.id);

    try {
      if (isDemoMode) {
        if (!isCurrentDuplicateMerge()) return;
        const merged = normalizeOwnerDashboardRegistryItem({
          ...group.primaryItem,
          ...mergedPatch,
          id: group.primaryItem.id,
          wedding_site_id: group.primaryItem.wedding_site_id,
          created_at: group.primaryItem.created_at,
          updated_at: new Date().toISOString(),
        } as RegistryItem);

        setItems((prev) =>
          prev
            .filter((item) => !secondaryIds.includes(item.id))
            .map((item) => (item.id === merged.id ? merged : item))
        );
      } else {
        const updated = await mergeDuplicateRegistryItems(group.primaryItem.id, secondaryIds, mergedPatch);
        if (!isCurrentDuplicateMerge()) return;
        setItems((prev) =>
          prev
            .filter((item) => !secondaryIds.includes(item.id))
            .map((item) => (item.id === updated.id ? normalizeOwnerDashboardRegistryItem(updated) : item))
        );
      }

      if (!isCurrentDuplicateMerge()) return;
      logRegistryAction(
        'registry_duplicates_merged',
        'Registry duplicate items were merged into one owner-approved entry.',
        {
          primaryItemId: group.primaryItem.id,
          secondaryItemIds: secondaryIds,
          mergedQuantityNeeded: mergedPatch.quantity_needed ?? group.primaryItem.quantity_needed,
          mergedQuantityPurchased: mergedPatch.quantity_purchased ?? group.primaryItem.quantity_purchased,
          duplicateSignalKinds: group.signals.map((signal) => signal.kind),
        },
        group.primaryItem.id,
        getOwnerRegistryDisplayTitle(group.primaryItem.item_name, group.primaryItem),
      );
      toast(`Merged ${group.secondaryItems.length + 1} duplicate gifts into "${getOwnerRegistryDisplayTitle(group.primaryItem.item_name, group.primaryItem)}".`);
    } catch {
      if (!isCurrentDuplicateMerge()) return;
      toast('Couldn’t merge those duplicate gifts right now. Please try again.', 'error');
    } finally {
      if (isCurrentDuplicateMerge()) setMergingDuplicateGroupId(null);
    }
  }

  async function handleRepairBadImports() {
    if (repairingBadImports) return;
    const badImportCandidates = items
      .filter((item) => getRegistryItemMetadataState(item).hasBadImportTitle);
    const candidates = items
      .map((item) => ({
        item,
        safetyPatch: buildRegistrySafetyRevalidationPatch(item),
        hasBadImportTitle: badImportCandidates.some((candidate) => candidate.id === item.id),
      }))
      .filter((candidate) => candidate.hasBadImportTitle || Boolean(candidate.safetyPatch))
      .slice(0, 20);

    if (candidates.length === 0) {
      toast('No gift links need cleanup.');
      return;
    }

    setRepairingBadImports(true);
    let repaired = 0;
    let revalidatedCount = 0;
    let revalidatedProductCount = 0;
    let revalidatedLinkOnlyCount = 0;
    let revalidatedReviewOnlyCount = 0;
    let converted = 0;
    let hiddenForReview = 0;
    let refreshedCount = 0;
    for (const candidate of candidates) {
      const { item, safetyPatch } = candidate;
      if (safetyPatch) {
        try {
          const updated = isDemoMode
            ? normalizeOwnerDashboardRegistryItem({
              ...item,
              ...safetyPatch,
              product_metadata: safetyPatch.product_metadata ?? item.product_metadata ?? null,
              updated_at: new Date().toISOString(),
            } as RegistryItem)
            : normalizeOwnerDashboardRegistryItem(await updateRegistryItem(item.id, safetyPatch));

          setItems((prev) => prev.map((existing) => (existing.id === updated.id ? updated : existing)));
          repaired += 1;
          revalidatedCount += 1;
          if (updated.display_mode === 'link_card') revalidatedLinkOnlyCount += 1;
          else if (updated.display_mode === 'review_only' || updated.display_mode === 'hidden') revalidatedReviewOnlyCount += 1;
          else revalidatedProductCount += 1;
          continue;
        } catch {
          // Fall through to deeper cleanup paths if local truth revalidation fails.
        }
      }

      const linkOnlyPatch = buildRegistryLinkOnlyRepairPatch(item);
      if (linkOnlyPatch) {
        try {
          const updated = isDemoMode
            ? normalizeOwnerDashboardRegistryItem({
              ...item,
              ...linkOnlyPatch,
              product_metadata: linkOnlyPatch.product_metadata ?? item.product_metadata ?? null,
              updated_at: new Date().toISOString(),
            } as RegistryItem)
            : normalizeOwnerDashboardRegistryItem(await updateRegistryItem(item.id, linkOnlyPatch));

          setItems((prev) => prev.map((candidate) => (candidate.id === updated.id ? updated : candidate)));
          repaired += 1;
          converted += 1;
          continue;
        } catch {
          // If direct normalization fails, try a refresh instead.
        }
      }

      const hiddenReviewPatch = buildRegistryHiddenReviewPatch(item);
      if (hiddenReviewPatch) {
        try {
          const updated = isDemoMode
            ? normalizeOwnerDashboardRegistryItem({
              ...item,
              ...hiddenReviewPatch,
              product_metadata: hiddenReviewPatch.product_metadata ?? item.product_metadata ?? null,
              updated_at: new Date().toISOString(),
            } as RegistryItem)
            : normalizeOwnerDashboardRegistryItem(await updateRegistryItem(item.id, hiddenReviewPatch));

          setItems((prev) => prev.map((candidate) => (candidate.id === updated.id ? updated : candidate)));
          repaired += 1;
          hiddenForReview += 1;
          continue;
        } catch {
          // Fall through to a source refresh if a review-only hide patch fails.
        }
      }

      const refreshed = await handleRefetchMetadata(item, true);
      if (refreshed) {
        repaired += 1;
        refreshedCount += 1;
      }
    }
    setRepairingBadImports(false);
    const runSummary = buildRegistryRepairRunSummary({
      candidateCount: candidates.length,
      repairedCount: repaired,
      revalidatedCount,
      revalidatedProductCount,
      revalidatedLinkOnlyCount,
      revalidatedReviewOnlyCount,
      convertedCount: converted,
      hiddenForReviewCount: hiddenForReview,
      refreshedCount,
      completedAt: new Date().toISOString(),
    });
    setLastRepairRunSummary(runSummary);
    logRegistryAction('registry_bad_imports_repaired', 'Registry gift cleanup was run.', {
      ...runSummary,
    });
    toast(
      buildRegistryRepairRunToast(runSummary),
      repaired > 0 ? 'success' : 'error',
    );
  }

  async function handleRevalidateRegistryTruth() {
    if (revalidatingRegistryTruth) return;
    const candidates = buildRegistryTruthSweepPrediction(items, 50).candidates;

    if (candidates.length === 0) {
      toast('Saved registry truth is already aligned.');
      return;
    }

    setRevalidatingRegistryTruth(true);
    let revalidatedCount = 0;
    let revalidatedProductCount = 0;
    let revalidatedLinkOnlyCount = 0;
    let revalidatedReviewOnlyCount = 0;
    for (const candidate of candidates) {
      const { item, safetyPatch } = candidate;
      if (!safetyPatch) continue;
      try {
        const updated = isDemoMode
          ? normalizeOwnerDashboardRegistryItem({
            ...item,
            ...safetyPatch,
            product_metadata: safetyPatch.product_metadata ?? item.product_metadata ?? null,
            updated_at: new Date().toISOString(),
          } as RegistryItem)
          : normalizeOwnerDashboardRegistryItem(await updateRegistryItem(item.id, safetyPatch));

        setItems((prev) => prev.map((existing) => (existing.id === updated.id ? updated : existing)));
        revalidatedCount += 1;
        if (updated.display_mode === 'link_card') revalidatedLinkOnlyCount += 1;
        else if (updated.display_mode === 'review_only' || updated.display_mode === 'hidden') revalidatedReviewOnlyCount += 1;
        else revalidatedProductCount += 1;
      } catch {
        // Keep going so one failed row does not block the whole sweep.
      }
    }
    setRevalidatingRegistryTruth(false);

    const runSummary = buildRegistryRepairRunSummary({
      candidateCount: candidates.length,
      repairedCount: revalidatedCount,
      revalidatedCount,
      revalidatedProductCount,
      revalidatedLinkOnlyCount,
      revalidatedReviewOnlyCount,
      convertedCount: 0,
      hiddenForReviewCount: 0,
      refreshedCount: 0,
      completedAt: new Date().toISOString(),
    });
    setLastRepairRunSummary(runSummary);
    logRegistryAction('registry_truth_revalidated', 'Registry saved truth was revalidated against current safety rules.', {
      ...runSummary,
    });
    toast(
      revalidatedCount > 0
        ? `Revalidated ${revalidatedCount}/${candidates.length} saved gift${candidates.length === 1 ? '' : 's'}.`
        : 'No saved gifts were revalidated this pass.',
      revalidatedCount > 0 ? 'success' : 'error',
    );
  }

  async function handleAutoRefreshStale(silent = false, alertsOnly = false) {
    if (isDemoMode || autoRefreshing) return;
    if (!refreshWindowOpen) {
      if (!silent) toast('Auto-refresh window is closed (post-wedding).');
      return;
    }

    const budgetState = await ensureMonthlyBudgetState();
    const remaining = Math.max(0, monthlyRefreshCap - budgetState.count);
    if (remaining <= 0) {
      if (!silent) toast('Monthly gift refresh limit reached for this registry.');
      return;
    }

    const staleCandidates = items
      .filter((item) => !!getRegistryRefreshSourceUrl(item))
      .filter((item) => refreshIncludePurchased || (item.purchase_status !== 'purchased' && !item.hide_when_purchased))
      .filter((item) => {
        const dueBySchedule = isRegistryItemDue(item.next_refresh_at);
        const failCount = item.refresh_fail_count ?? 0;
        const backoffDue = ageExceedsMs(item.last_auto_refreshed_at, getBackoffMs(failCount));
        const stale = ageExceedsMs(item.metadata_last_checked_at, WEEKLY_REFRESH_MS);
        const outOfStock = (item.availability || '').toLowerCase().includes('out');
        const priceChanged = item.previous_price_amount != null && item.price_amount != null && item.previous_price_amount !== item.price_amount;
        return alertsOnly ? ((dueBySchedule || stale || outOfStock || priceChanged) && backoffDue) : ((dueBySchedule || stale) && backoffDue);
      })
      .slice(0, Math.min(12, remaining));

    if (staleCandidates.length === 0) {
      if (!silent) toast('Gift details are already fresh.');
      return;
    }

    setAutoRefreshing(true);
    let updatedCount = 0;
    for (const item of staleCandidates) {
      const url = getRegistryRefreshSourceUrl(item);
      if (!url) continue;

      try {
        const preview = await fetchUrlPreview(url, true);
        const fields = buildRegistryRefreshFields(item, preview, { autoRefresh: true });
        const updated = await updateRegistryItem(item.id, fields);
        setItems((prev) => prev.map((candidate) => (candidate.id === updated.id ? normalizeOwnerDashboardRegistryItem(updated) : candidate)));
        const refreshSkipped = fields.product_metadata && !Array.isArray(fields.product_metadata)
          && fields.product_metadata.registryLastRefreshSkippedReason === 'new_result_worse';
        if (!refreshSkipped) updatedCount += 1;
      } catch {
        const nextFail = (item.refresh_fail_count ?? 0) + 1;
        const retryAt = new Date(Date.now() + getBackoffMs(nextFail)).toISOString();
        try {
          const updated = await updateRegistryItem(item.id, {
            refresh_fail_count: nextFail,
            metadata_fetch_status: 'error',
            metadata_source_method: null,
            last_auto_refreshed_at: new Date().toISOString(),
            next_refresh_at: retryAt,
          });
          setItems((prev) => prev.map((candidate) => (candidate.id === updated.id ? normalizeOwnerDashboardRegistryItem(updated) : candidate)));
        } catch {
          // ignore secondary update errors
        }
      }
    }
    setAutoRefreshing(false);

    if (updatedCount > 0) {
      const nextCount = budgetState.count + updatedCount;
      setMonthlyRefreshCount(nextCount);
      setMonthlyRefreshMonth(budgetState.monthKey);
      if (weddingSiteId && !isDemoMode) {
        await updateRegistryRefreshBudget(weddingSiteId, {
          registry_monthly_refresh_count: nextCount,
          registry_monthly_refresh_month: budgetState.monthKey,
        });
      }
      logRegistryAction(alertsOnly ? 'registry_alert_items_refreshed' : 'registry_stale_items_refreshed', 'Registry items were refreshed in bulk.', {
        updatedCount,
        candidateCount: staleCandidates.length,
        alertsOnly,
        remainingMonthlyBudget: Math.max(0, monthlyRefreshCap - (budgetState.count + updatedCount)),
      });
    }

    if (!silent) toast(`Refreshed ${updatedCount} ${alertsOnly ? 'alert ' : ''}item${updatedCount === 1 ? '' : 's'}.`);
  }

  async function handleBulkImport(bulkUrls: string) {
    if (!weddingSiteId) return;
    const urls = Array.from(new Set(bulkUrls.split('\n').map((value) => value.trim()).filter(Boolean)));
    if (urls.length === 0) {
      toast('Paste at least one gift link.', 'error');
      return;
    }

    const requestId = ++bulkImportRequestIdRef.current;
    const requestSiteId = weddingSiteId;
    const isCurrentBulkImport = () => (
      mountedRef.current &&
      requestId === bulkImportRequestIdRef.current &&
      weddingSiteIdRef.current === requestSiteId
    );
    setBulkImportBusy(true);
    let knownItems = [...items];
    const summaryItems: RegistryBulkImportSummaryItem[] = [];
    let cleanCount = 0;
    let linkOnlyCount = 0;
    let needsReviewCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;
    try {
      for (const url of urls.slice(0, 30)) {
        if (!isCurrentBulkImport()) return;
        try {
          let hostname = '';
          try {
            hostname = new URL(url).hostname;
          } catch {
            failedCount += 1;
            summaryItems.push({
              url,
              result: 'failed',
              displayTitle: 'Could not open link',
              storeName: null,
              reason: 'Check the URL or add the gift manually.',
            });
            continue;
          }

          const preview = await fetchUrlPreview(url, false);
          if (!isCurrentBulkImport()) return;
          const duplicate = findDuplicateItem(preview.canonical_url ?? url, preview.title ?? null, knownItems);
          if (duplicate) {
            duplicateCount += 1;
            summaryItems.push({
              url,
              result: 'duplicate',
              displayTitle: getOwnerRegistryDisplayTitle(duplicate.item_name, duplicate),
              storeName: duplicate.store_name ?? duplicate.merchant ?? preview.store_name ?? preview.merchant ?? hostname,
              reason: 'Skipped duplicate.',
              registryItemId: duplicate.id,
            });
            continue;
          }

          const itemName = preview.title?.trim() || hostname;
          const storeName = (preview.merchant ?? preview.store_name ?? preview.brand) ?? hostname;
          const isLinkOnly = preview.display_mode === 'link_card' || preview.source_method === 'link_only';
          const needsReview = !isLinkOnly && Boolean(preview.review_status && preview.review_status !== 'clean');
          const fields: Partial<RegistryItem> = {
            item_name: itemName,
            price_label: isLinkOnly ? null : (preview.price_label ?? null),
            price_amount: isLinkOnly ? null : (preview.price_amount ?? null),
            merchant: storeName,
            store_name: storeName,
            item_url: preview.canonical_url ?? url,
            canonical_url: preview.canonical_url ?? null,
            image_url: isLinkOnly ? null : (preview.image_url ?? null),
            notes: preview.description ?? null,
            quantity_needed: 1,
            quantity_purchased: 0,
            purchase_status: 'available',
            hide_when_purchased: false,
            metadata_last_checked_at: new Date().toISOString(),
            next_refresh_at: new Date(Date.now() + WEEKLY_REFRESH_MS).toISOString(),
            metadata_fetch_status: preview.fetch_status ?? 'success',
            metadata_confidence_score: preview.confidence_score ?? null,
            metadata_source_method: preview.source_method ?? null,
            metadata_retailer: preview.retailer ?? storeName,
            availability: preview.availability ?? null,
            product_metadata: {
              registryDisplayMode: preview.display_mode ?? (isLinkOnly ? 'link_card' : 'product_card'),
              registryGuestSafe: preview.guest_safe ?? true,
              registryReviewStatus: preview.review_status ?? (isLinkOnly ? 'blocked_source' : needsReview ? 'needs_review' : 'clean'),
              registrySourceStatus: preview.source_status ?? (isLinkOnly ? 'blocked' : 'clean'),
              registryImportReason: preview.import_reason ?? preview.owner_message ?? null,
              registryImportSourceMethod: preview.source_method ?? null,
            },
          };
          const created = await createRegistryItem(requestSiteId, fields);
          if (!isCurrentBulkImport()) return;
          setItems((prev) => [...prev, normalizeOwnerDashboardRegistryItem(created)]);
          knownItems = [...knownItems, created];
          const result: RegistryBulkImportResult = isLinkOnly ? 'link_only' : needsReview ? 'needs_review' : 'clean';
          if (result === 'clean') cleanCount += 1;
          if (result === 'link_only') linkOnlyCount += 1;
          if (result === 'needs_review') needsReviewCount += 1;
          summaryItems.push({
            url,
            result,
            displayTitle: itemName,
            storeName,
            reason: preview.owner_message ?? preview.import_reason ?? (
              result === 'clean'
                ? 'Imported cleanly.'
                : result === 'link_only'
                  ? 'Added as a clean link-only gift.'
                  : 'Added, but this item still needs a quick review.'
            ),
            registryItemId: created.id,
          });
        } catch {
          if (!isCurrentBulkImport()) return;
          failedCount += 1;
          summaryItems.push({
            url,
            result: 'failed',
            displayTitle: 'Could not import',
            storeName: null,
            reason: 'Could not open this link. Add it manually or try again later.',
            registryItemId: null,
          });
        }
      }

      if (!isCurrentBulkImport()) return;
      const summary: RegistryBulkImportSummary = {
        totalCount: urls.slice(0, 30).length,
        cleanCount,
        linkOnlyCount,
        needsReviewCount,
        duplicateCount,
        failedCount,
        items: summaryItems,
      };
      if (!isDemoMode) {
        try {
          const persistedBatch = await saveRegistryImportBatch(requestSiteId, summary);
          if (isCurrentBulkImport()) {
            setLatestImportBatchSummary(persistedBatch);
            setRecentImportBatchesSummary((persistedBatch ? [persistedBatch] : []).filter(Boolean) as RegistryImportBatchRecord[]);
          }
        } catch {
          if (isCurrentBulkImport()) {
            setLatestImportBatchSummary(null);
            setRecentImportBatchesSummary(null);
          }
        }
      } else {
        setLatestImportBatchSummary(null);
        setRecentImportBatchesSummary(null);
      }
      setBulkImportSummary(summary);
      setBulkUrls('');
      const addedCount = cleanCount + linkOnlyCount + needsReviewCount;
      if (addedCount > 0 || failedCount > 0 || duplicateCount > 0) {
        if (failedCount > 0 || needsReviewCount > 0) {
          toast(`Processed ${summary.totalCount} links: ${addedCount} added, ${needsReviewCount} need review, ${duplicateCount} duplicates, ${failedCount} failed.`, addedCount > 0 ? 'success' : 'error');
        } else {
          toast(`Processed ${summary.totalCount} links: ${cleanCount} clean, ${linkOnlyCount} link-only, ${duplicateCount} duplicates skipped.`);
        }
        logRegistryAction('registry_bulk_import_completed', 'Registry bulk URL import completed.', {
          urlCount: urls.slice(0, 30).length,
          createdCount: addedCount,
          cleanCount,
          linkOnlyCount,
          needsReviewCount,
          duplicateCount,
          failedCount,
        });
      }
    } finally {
      if (isCurrentBulkImport()) setBulkImportBusy(false);
    }
  }

  return {
    autoRefreshing,
    bulkImportBusy,
    bulkImportSummary,
    handleAutoRefreshStale,
    handleBulkImport,
    handleCopyDuplicateReviewList,
    handleMergeDuplicateGroup,
    handleRevalidateRegistryTruth,
    handleRefetchMetadata,
    handleRefreshImageIssues,
    handleRepairBadImports,
    resetBulkImportSummary,
    imageRefreshBusy,
    lastRepairRunSummary,
    mergingDuplicateGroupId,
    revalidatingRegistryTruth,
    repairingBadImports,
  };
}
