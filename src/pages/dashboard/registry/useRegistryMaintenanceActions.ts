import { useState } from 'react';

import { copyTextOrDownload } from '../../../lib/copyText';
import { ageExceedsMs, isRegistryItemDue } from '../registryItemTime';
import { createRegistryItem, fetchUrlPreview, mergeDuplicateRegistryItems, updateRegistryItem, updateRegistryRefreshBudget } from './registryService';
import { buildRegistryDuplicateMergePatch } from './duplicateRegistryItems';
import type { RegistryDuplicateGroup } from './duplicateRegistryItems';
import type { RegistryItem } from './registryTypes';
import { getRegistryItemMetadataState } from './registryTypes';

const WEEKLY_REFRESH_MS = 1000 * 60 * 60 * 24 * 7;
const getBackoffMs = (failCount: number) => Math.min(WEEKLY_REFRESH_MS * 4, Math.max(6 * 60 * 60 * 1000, (2 ** Math.min(5, failCount)) * 60 * 60 * 1000));

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
    setItems,
    setMonthlyRefreshCount,
    setMonthlyRefreshMonth,
    toast,
    logRegistryAction,
    weddingSiteId,
  } = args;

  const [autoRefreshing, setAutoRefreshing] = useState(false);
  const [bulkImportBusy, setBulkImportBusy] = useState(false);
  const [imageRefreshBusy, setImageRefreshBusy] = useState(false);
  const [mergingDuplicateGroupId, setMergingDuplicateGroupId] = useState<string | null>(null);
  const [repairingBadImports, setRepairingBadImports] = useState(false);

  async function handleRefetchMetadata(item: RegistryItem, silent = false, replaceExisting = false) {
    const url = item.item_url ?? item.canonical_url;
    if (!url) return false;
    if (isDemoMode) {
      if (!silent) toast(replaceExisting ? 'Demo: sample gift details are already refreshed' : 'Demo: sample gift details are already filled in', 'success');
      return true;
    }

    try {
      const preview = await fetchUrlPreview(url, true);
      const fields: Partial<RegistryItem> = {
        metadata_last_checked_at: new Date().toISOString(),
        next_refresh_at: new Date(Date.now() + WEEKLY_REFRESH_MS).toISOString(),
        metadata_fetch_status: preview.fetch_status ?? 'success',
        metadata_confidence_score: preview.confidence_score ?? null,
        metadata_source_method: preview.source_method ?? null,
        metadata_retailer: preview.retailer ?? null,
        availability: preview.availability ?? null,
      };
      if (preview.title && (replaceExisting || !item.item_name)) fields.item_name = preview.title;
      if (preview.price_label && (replaceExisting || !item.price_label)) fields.price_label = preview.price_label;
      if (preview.price_amount != null) {
        if (item.price_amount != null && item.price_amount !== preview.price_amount) {
          fields.previous_price_amount = item.price_amount;
          fields.price_last_changed_at = new Date().toISOString();
        }
        fields.price_amount = preview.price_amount;
      }
      if (preview.image_url && (replaceExisting || !item.image_url)) fields.image_url = preview.image_url;
      if ((preview.merchant ?? preview.brand) && (replaceExisting || !item.merchant)) {
        fields.merchant = (preview.merchant ?? preview.brand)!;
        fields.store_name = (preview.merchant ?? preview.brand)!;
      }
      if (preview.canonical_url) fields.canonical_url = preview.canonical_url;
      if (Object.keys(fields).length > 0) {
        const updated = await updateRegistryItem(item.id, fields);
        setItems((prev) => prev.map((candidate) => (candidate.id === updated.id ? normalizeOwnerDashboardRegistryItem(updated) : candidate)));
        logRegistryAction(
          replaceExisting ? 'registry_metadata_reimported' : 'registry_metadata_refreshed',
          replaceExisting ? 'Registry item details were refreshed from the source.' : 'Registry item details were refreshed.',
          {
            fetchStatus: fields.metadata_fetch_status,
            hasImage: Boolean(updated.image_url),
            hasPrice: updated.price_amount != null || Boolean(updated.price_label),
            replaceExisting,
          },
          updated.id,
          updated.item_name,
        );
        if (!silent) toast(replaceExisting ? 'Gift details refreshed from the link' : 'Gift details refreshed');
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
      .filter((item) => (!item.image_url || item.image_url.includes('thum.io') || item.image_url.includes('weserv.nl')))
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

  async function handleCopyDuplicateReviewList() {
    const lines = duplicateGroups.flatMap((group, index) => [
      `Group ${index + 1}: ${group.items.map((item) => item.item_name).join(' / ')}`,
      `Why it matches: ${group.signals.map((signal) => signal.label).join(', ')}`,
      `Suggested keep: ${group.primaryItem.item_name}`,
    ]);
    if (lines.length === 0) {
      toast('No duplicate groups to review.', 'error');
      return;
    }
    const payload = lines.join('\n');
    const result = await copyTextOrDownload(payload, 'dayof-registry-duplicate-review.txt');
    if (result === 'copied') {
      toast('Copied duplicate review list');
    } else {
      toast('Clipboard was blocked, so the duplicate review list downloaded.');
    }
  }

  async function handleMergeDuplicateGroup(group: RegistryDuplicateGroup) {
    if (group.secondaryItems.length === 0 || mergingDuplicateGroupId === group.id) return;

    const mergedPatch = buildRegistryDuplicateMergePatch(group.primaryItem, group.secondaryItems);
    const secondaryIds = group.secondaryItems.map((item) => item.id);
    setMergingDuplicateGroupId(group.id);

    try {
      if (isDemoMode) {
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
        setItems((prev) =>
          prev
            .filter((item) => !secondaryIds.includes(item.id))
            .map((item) => (item.id === updated.id ? normalizeOwnerDashboardRegistryItem(updated) : item))
        );
      }

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
        group.primaryItem.item_name,
      );
      toast(`Merged ${group.secondaryItems.length + 1} duplicate gifts into "${group.primaryItem.item_name}".`);
    } catch {
      toast('Couldn’t merge those duplicate gifts right now. Please try again.', 'error');
    } finally {
      setMergingDuplicateGroupId(null);
    }
  }

  async function handleRepairBadImports() {
    if (isDemoMode || repairingBadImports) return;
    const candidates = items
      .filter((item) => getRegistryItemMetadataState(item).hasBadImportTitle)
      .filter((item) => !!(item.item_url || item.canonical_url))
      .slice(0, 20);

    if (candidates.length === 0) {
      toast('No gift links need cleanup.');
      return;
    }

    setRepairingBadImports(true);
    let repaired = 0;
    for (const item of candidates) {
      const refreshed = await handleRefetchMetadata(item, true);
      if (refreshed) repaired += 1;
    }
    setRepairingBadImports(false);
    logRegistryAction('registry_bad_imports_repaired', 'Registry gift cleanup was run.', {
      candidateCount: candidates.length,
      repairedCount: repaired,
    });
    toast(`Refreshed ${repaired}/${candidates.length} gift detail${candidates.length === 1 ? '' : 's'}.`, repaired > 0 ? 'success' : 'error');
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
      .filter((item) => !!(item.item_url || item.canonical_url))
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
      const url = item.item_url ?? item.canonical_url;
      if (!url) continue;

      try {
        const preview = await fetchUrlPreview(url, true);
        const fields: Partial<RegistryItem> = {
          metadata_last_checked_at: new Date().toISOString(),
          next_refresh_at: new Date(Date.now() + WEEKLY_REFRESH_MS).toISOString(),
          metadata_fetch_status: preview.fetch_status ?? 'success',
          metadata_confidence_score: preview.confidence_score ?? null,
          availability: preview.availability ?? null,
        };
        if (preview.price_label) fields.price_label = preview.price_label;
        if (preview.price_amount != null) {
          if (item.price_amount != null && item.price_amount !== preview.price_amount) {
            fields.previous_price_amount = item.price_amount;
            fields.price_last_changed_at = new Date().toISOString();
          }
          fields.price_amount = preview.price_amount;
        }
        if (preview.image_url) fields.image_url = preview.image_url;
        if (preview.canonical_url) fields.canonical_url = preview.canonical_url;
        if (preview.merchant ?? preview.brand) {
          fields.merchant = (preview.merchant ?? preview.brand)!;
          fields.store_name = (preview.merchant ?? preview.brand)!;
        }

        const updated = await updateRegistryItem(item.id, fields);
        setItems((prev) => prev.map((candidate) => (candidate.id === updated.id ? normalizeOwnerDashboardRegistryItem(updated) : candidate)));
        updatedCount += 1;
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

    setBulkImportBusy(true);
    let createdCount = 0;
    let failedCount = 0;
    let invalidUrlCount = 0;
    const reviewExamples: string[] = [];
    for (const url of urls.slice(0, 30)) {
      try {
        let hostname = '';
        try {
          hostname = new URL(url).hostname;
        } catch {
          invalidUrlCount += 1;
          failedCount += 1;
          if (reviewExamples.length < 3) reviewExamples.push(`${url} (check the link)`);
          continue;
        }

        const preview = await fetchUrlPreview(url, false);
        const itemName = preview.title?.trim() || hostname;
        const fields: Partial<RegistryItem> = {
          item_name: itemName,
          price_label: preview.price_label ?? null,
          price_amount: preview.price_amount ?? null,
          merchant: (preview.merchant ?? preview.store_name ?? preview.brand) ?? null,
          store_name: (preview.merchant ?? preview.store_name ?? preview.brand) ?? null,
          item_url: preview.canonical_url ?? url,
          canonical_url: preview.canonical_url ?? null,
          image_url: preview.image_url ?? null,
          notes: preview.description ?? null,
          quantity_needed: 1,
          quantity_purchased: 0,
          purchase_status: 'available',
          hide_when_purchased: false,
          metadata_last_checked_at: new Date().toISOString(),
          next_refresh_at: new Date(Date.now() + WEEKLY_REFRESH_MS).toISOString(),
          metadata_fetch_status: preview.fetch_status ?? 'success',
          metadata_confidence_score: preview.confidence_score ?? null,
          availability: preview.availability ?? null,
        };
        const created = await createRegistryItem(weddingSiteId, fields);
        setItems((prev) => [...prev, normalizeOwnerDashboardRegistryItem(created)]);
        createdCount += 1;
      } catch {
        failedCount += 1;
        if (reviewExamples.length < 3) reviewExamples.push(`${url} (add details by hand)`);
      }
    }

    setBulkImportBusy(false);
    setBulkImportOpen(false);
    setBulkUrls('');
    if (failedCount > 0) {
      toast(`Added ${createdCount} gift${createdCount === 1 ? '' : 's'} (${failedCount} need review).`, createdCount > 0 ? 'success' : 'error');
      const details = [
        invalidUrlCount > 0 ? `${invalidUrlCount} link${invalidUrlCount === 1 ? '' : 's'} need a quick fix` : null,
        reviewExamples.length > 0 ? `Examples: ${reviewExamples.join(' • ')}` : null,
      ].filter(Boolean).join(' — ');
      if (details) toast(details, 'error');
    } else {
      toast(`Added ${createdCount} gift${createdCount === 1 ? '' : 's'} from links.`);
    }
    if (createdCount > 0 || failedCount > 0) {
      logRegistryAction('registry_bulk_import_completed', 'Registry bulk URL import completed.', {
        urlCount: urls.slice(0, 30).length,
        createdCount,
        failedCount,
        invalidUrlCount,
      });
    }
  }

  return {
    autoRefreshing,
    bulkImportBusy,
    handleAutoRefreshStale,
    handleBulkImport,
    handleCopyDuplicateReviewList,
    handleMergeDuplicateGroup,
    handleRefetchMetadata,
    handleRefreshImageIssues,
    handleRepairBadImports,
    imageRefreshBusy,
    mergingDuplicateGroupId,
    repairingBadImports,
  };
}
