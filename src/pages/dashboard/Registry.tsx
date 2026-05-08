import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { DashboardPageHero } from '../../components/dashboard/DashboardPageHero';
import { DashboardStateBlock } from '../../components/dashboard/DashboardStateBlock';
import { Card, Button, ActionsMenu } from '../../components/ui';
import { Gift, Plus, CheckCircle2, DollarSign, Search, Package, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  createRegistryItem,
  updateRegistryItem,
  deleteRegistryItem,
  ownerMarkPurchased,
  fetchUrlPreview,
  saveRegistryRefreshPolicy,
  updateRegistryRefreshBudget,
} from './registry/registryService';
import { RegistryItemCard } from './registry/RegistryItemCard';
import { RegistryItemForm } from './registry/RegistryItemForm';
import type { RegistryItem, RegistryFilter, RegistryItemDraft } from './registry/registryTypes';
import { getRegistryItemMetadataState, sanitizeRegistryQuantityState } from './registry/registryTypes';
import { getRegistryRepairStates } from './registry/repairState';
import { getCurrentMonthKey, resolveRegistryRefreshBudgetState } from './registry/refreshBudget';
import { ageExceedsMs, formatRegistryItemDate, getRegistryItemTimestamp, isRegistryItemDue } from './registryItemTime';
import { getWeddingRefreshWindowDate, parseRefreshWindowEndIso, toValidDateOrNull } from './registryRefreshWindow';
import { copyTextOrDownload } from '../../lib/copyText';
import { logAppAction } from '../../lib/actionAudit';
import { customerSafeErrorMessage } from '../../lib/customerSafeError';
import { normalizeOwnerDashboardRegistryItem, useRegistryDashboardData } from './registry/useRegistryDashboardData';
import { buildRegistryDashboardDerivedState } from './registry/buildRegistryDashboardDerivedState';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

function safeRegistryDashboardError(err: unknown, fallback: string): string {
  return customerSafeErrorMessage(err, fallback);
}

const ToastList: React.FC<{ toasts: Toast[] }> = ({ toasts }) => (
  <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
    {toasts.map(t => (
      <div
        key={t.id}
        className={`rounded-lg border bg-white px-4 py-3 text-sm font-medium text-text-primary ${
          t.type === 'error'
            ? 'border-border-subtle'
            : 'border-success/20'
        }`}
      >
        {t.message}
      </div>
    ))}
  </div>
);

const WEEKLY_REFRESH_MS = 1000 * 60 * 60 * 24 * 7;
const getBackoffMs = (failCount: number) => Math.min(WEEKLY_REFRESH_MS * 4, Math.max(6 * 60 * 60 * 1000, (2 ** Math.min(5, failCount)) * 60 * 60 * 1000));

const FILTER_TABS: { key: RegistryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'purchased', label: 'Purchased' },
];

const DIRECT_IMAGE_HOST_HINTS = ['images-na.ssl-images-amazon.com', 'm.media-amazon.com', 'cdn', 'images'];
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|avif|heic)(\?.*)?$/i;

function normalizeRegistryImageUrl(raw: string): string | null {
  const v = (raw || '').trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();
    if (IMAGE_EXT_RE.test(path)) return u.toString();
    if (DIRECT_IMAGE_HOST_HINTS.some((h) => host.includes(h)) && !path.includes('/dp/')) return u.toString();
    return null;
  } catch {
    return null;
  }
}

export const DashboardRegistry: React.FC = () => {
  const { isDemoMode, user } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RegistryFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<RegistryItem | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);
  const [showImageIssuesOnly, setShowImageIssuesOnly] = useState(false);
  const [imageRefreshBusy, setImageRefreshBusy] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkImportBusy, setBulkImportBusy] = useState(false);
  const [repairingBadImports, setRepairingBadImports] = useState(false);
  const [autoRefreshing, setAutoRefreshing] = useState(false);
  const [registryActionsOpen, setRegistryActionsOpen] = useState(false);
  const [savingRefreshPolicy, setSavingRefreshPolicy] = useState(false);

  const {
    autoRefreshEnabled,
    items,
    loading,
    monthlyRefreshCap,
    monthlyRefreshCount,
    monthlyRefreshMonth,
    refreshCapDraft,
    refreshEnabledUntil,
    refreshIncludePurchased,
    refreshPreset,
    refreshWindowDraft,
    setAutoRefreshEnabled,
    setItems,
    setMonthlyRefreshCap,
    setMonthlyRefreshCount,
    setMonthlyRefreshMonth,
    setPolicyUpdatedAt,
    setPolicyUpdatedBy,
    setRefreshCapDraft,
    setRefreshEnabledUntil,
    setRefreshIncludePurchased,
    setRefreshPreset,
    setRefreshWindowDraft,
    weddingDate,
    weddingSiteId,
  } = useRegistryDashboardData({
    isDemoMode,
    userId: user?.id,
    toast,
  });

  const normalizedItems = items.map(normalizeOwnerDashboardRegistryItem);
  const registryActionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!registryActionsOpen) return;
      if (!registryActionsRef.current?.contains(event.target as Node)) setRegistryActionsOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setRegistryActionsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [registryActionsOpen]);

  function toast(message: string, type: 'success' | 'error' = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  function logRegistryAction(type: string, summary: string, metadata?: Record<string, unknown>, targetId?: string | null, targetLabel?: string | null) {
    if (!weddingSiteId) return;
    void logAppAction({
      weddingSiteId,
      area: 'registry',
      type,
      summary,
      targetId,
      targetLabel,
      metadata,
    });
  }

  async function handleSave(draft: RegistryItemDraft) {
    if (!weddingSiteId) throw new Error('No wedding site found');

    const parsedPrice = draft.price_amount ? parseFloat(draft.price_amount) : null;
    const parsedGoal = draft.fund_goal_amount ? parseFloat(draft.fund_goal_amount) : null;
    const parsedReceived = draft.fund_received_amount ? parseFloat(draft.fund_received_amount) : null;
    const isCashFund = draft.item_type === 'cash_fund';

    let normalizedImageUrl = isCashFund ? null : normalizeRegistryImageUrl(draft.image_url || '');
    if (!isCashFund && !normalizedImageUrl && draft.item_url?.trim()) {
      try {
        const preview = await fetchUrlPreview(draft.item_url.trim(), false);
        normalizedImageUrl = normalizeRegistryImageUrl(preview.image_url || '');
      } catch {
        // ignore preview fetch failures
      }
    }

    if (!isCashFund && draft.image_url.trim() && !normalizedImageUrl) {
      toast('Image URL must be a direct image file link (or leave it blank and we’ll auto-pull one).', 'error');
      return;
    }

    const quantityState = sanitizeRegistryQuantityState(
      editItem?.quantity_purchased ?? 0,
      isCashFund ? 1 : (parseInt(draft.desired_quantity) || 1),
    );

    const fields: Partial<RegistryItem> = {
      item_type: isCashFund ? 'cash_fund' : 'product',
      item_name: draft.item_name.trim(),
      price_label: null,
      price_amount: isCashFund ? null : (parsedPrice !== null && !isNaN(parsedPrice) ? parsedPrice : null),
      merchant: isCashFund ? null : (draft.merchant || null),
      store_name: isCashFund ? null : (draft.merchant || null),
      item_url: isCashFund ? null : (draft.item_url || null),
      canonical_url: isCashFund ? null : (draft.canonical_url || draft.item_url || null),
      image_url: normalizedImageUrl,
      description: isCashFund ? null : (draft.description || null),
      notes: draft.notes || draft.description || null,
      quantity_needed: quantityState.quantityNeeded,
      quantity_purchased: quantityState.quantityPurchased,
      purchase_status: quantityState.purchaseStatus,
      hide_when_purchased: isCashFund ? false : draft.hide_when_purchased,
      availability: isCashFund ? null : (draft.availability || null),
      metadata_fetch_status: isCashFund ? 'manual' : (draft.metadata_fetch_status || 'manual'),
      metadata_confidence_score: isCashFund ? null : (draft.metadata_confidence_score ?? null),
      metadata_source_method: isCashFund ? 'manual' : (draft.metadata_source_method ?? 'manual'),
      metadata_retailer: isCashFund ? null : (draft.metadata_retailer || draft.merchant || null),
      fund_goal_amount: parsedGoal !== null && !isNaN(parsedGoal) ? parsedGoal : null,
      fund_received_amount: parsedReceived !== null && !isNaN(parsedReceived) ? parsedReceived : 0,
      fund_venmo_url: draft.fund_venmo_url || null,
      fund_paypal_url: draft.fund_paypal_url || null,
      fund_zelle_handle: draft.fund_zelle_handle || null,
      fund_custom_url: draft.fund_custom_url || null,
      fund_custom_label: draft.fund_custom_label || null,
      metadata_last_checked_at: new Date().toISOString(),
      next_refresh_at: new Date(Date.now() + WEEKLY_REFRESH_MS).toISOString(),
    };

    if (isDemoMode) {
      if (editItem) {
        setItems(prev => prev.map(i => (i.id === editItem.id ? normalizeOwnerDashboardRegistryItem({ ...i, ...fields, updated_at: new Date().toISOString() }) : i)));
        toast('Item updated');
      } else {
        const created: RegistryItem = {
          id: `demo-registry-${Date.now()}`,
          wedding_site_id: weddingSiteId,
          item_type: (fields.item_type as 'product' | 'cash_fund') ?? 'product',
          item_name: fields.item_name || 'Untitled item',
          price_label: fields.price_label ?? null,
          price_amount: fields.price_amount ?? null,
          store_name: fields.store_name ?? null,
          merchant: fields.merchant ?? null,
          item_url: fields.item_url ?? null,
          canonical_url: fields.canonical_url ?? null,
          image_url: fields.image_url ?? null,
          description: fields.description ?? null,
          notes: fields.notes ?? null,
          quantity_needed: fields.quantity_needed ?? 1,
          quantity_purchased: 0,
          purchaser_name: null,
          purchase_status: 'available',
          hide_when_purchased: fields.hide_when_purchased ?? false,
          sort_order: items.length,
          priority: 'medium',
          availability: fields.availability ?? null,
          metadata_last_checked_at: new Date().toISOString(),
          metadata_fetch_status: fields.metadata_fetch_status ?? 'manual',
          metadata_confidence_score: fields.metadata_confidence_score ?? null,
          metadata_source_method: fields.metadata_source_method ?? 'manual',
          metadata_retailer: fields.metadata_retailer ?? null,
          previous_price_amount: null,
          price_last_changed_at: null,
          next_refresh_at: new Date(Date.now() + WEEKLY_REFRESH_MS).toISOString(),
          last_auto_refreshed_at: null,
          refresh_fail_count: 0,
          fund_goal_amount: fields.fund_goal_amount ?? null,
          fund_received_amount: fields.fund_received_amount ?? 0,
          fund_venmo_url: fields.fund_venmo_url ?? null,
          fund_paypal_url: fields.fund_paypal_url ?? null,
          fund_zelle_handle: fields.fund_zelle_handle ?? null,
          fund_custom_url: fields.fund_custom_url ?? null,
          fund_custom_label: fields.fund_custom_label ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setItems(prev => [...prev, normalizeOwnerDashboardRegistryItem(created)]);
        toast('Item added to registry');
      }
      setShowForm(false);
      setEditItem(null);
      return;
    }

    if (editItem) {
      const updated = await updateRegistryItem(editItem.id, fields);
      setItems(prev => prev.map(i => (i.id === updated.id ? normalizeOwnerDashboardRegistryItem(updated) : i)));
      logRegistryAction('registry_item_updated', 'Registry item was updated.', {
        itemType: updated.item_type ?? 'product',
        hideWhenPurchased: updated.hide_when_purchased,
        purchaseStatus: updated.purchase_status,
        quantityNeeded: updated.quantity_needed,
      }, updated.id, updated.item_name);
      toast('Item updated');
    } else {
      const created = await createRegistryItem(weddingSiteId, fields);
      setItems(prev => [...prev, normalizeOwnerDashboardRegistryItem(created)]);
      logRegistryAction('registry_item_created', 'Registry item was created.', {
        itemType: created.item_type ?? 'product',
        hideWhenPurchased: created.hide_when_purchased,
        purchaseStatus: created.purchase_status,
        quantityNeeded: created.quantity_needed,
      }, created.id, created.item_name);
      toast('Item added to registry');
    }

    setShowForm(false);
    setEditItem(null);
  }

  async function handleDelete(id: string) {
    try {
      const item = items.find((candidate) => candidate.id === id);
      if (!isDemoMode) {
        await deleteRegistryItem(id);
      }
      setItems(prev => prev.filter(i => i.id !== id));
      logRegistryAction('registry_item_deleted', 'Registry item was deleted.', {
        purchaseStatus: item?.purchase_status ?? null,
        quantityPurchased: item?.quantity_purchased ?? null,
        quantityNeeded: item?.quantity_needed ?? null,
      }, id, item?.item_name || 'Registry item');
      toast('Item removed');
    } catch {
      toast('Couldn’t remove that item. Please try again.', 'error');
    }
  }

  async function handleMarkPurchased(item: RegistryItem, qty: number) {
    try {
      const updated = isDemoMode
        ? (() => {
            const quantityState = sanitizeRegistryQuantityState(item.quantity_purchased + qty, item.quantity_needed);
            return {
              ...item,
              quantity_needed: quantityState.quantityNeeded,
              quantity_purchased: quantityState.quantityPurchased,
              purchase_status: quantityState.purchaseStatus,
              updated_at: new Date().toISOString(),
            };
          })()
        : await ownerMarkPurchased(item.id, qty);

      setItems(prev => prev.map(i => (i.id === updated.id ? normalizeOwnerDashboardRegistryItem(updated) : i)));
      logRegistryAction('registry_purchase_marked', 'Registry purchase status was updated by the owner.', {
        incrementBy: qty,
        quantityPurchased: updated.quantity_purchased,
        quantityNeeded: updated.quantity_needed,
        purchaseStatus: updated.purchase_status,
      }, updated.id, updated.item_name);
      toast(
        updated.purchase_status === 'purchased'
          ? `"${item.item_name}" marked as fully purchased`
          : `"${item.item_name}" updated — ${updated.quantity_purchased}/${updated.quantity_needed} purchased`
      );
    } catch {
      toast('Couldn’t update purchase status. Please try again.', 'error');
    }
  }

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
        setItems(prev => prev.map(i => (i.id === updated.id ? normalizeOwnerDashboardRegistryItem(updated) : i)));
        logRegistryAction(replaceExisting ? 'registry_metadata_reimported' : 'registry_metadata_refreshed', replaceExisting ? 'Registry item details were refreshed from the source.' : 'Registry item details were refreshed.', {
          fetchStatus: fields.metadata_fetch_status,
          hasImage: Boolean(updated.image_url),
          hasPrice: updated.price_amount != null || Boolean(updated.price_label),
          replaceExisting,
        }, updated.id, updated.item_name);
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
      .filter((i) => (!i.image_url || i.image_url.includes('thum.io') || i.image_url.includes('weserv.nl')))
      .filter((i) => !!(i.item_url || i.canonical_url))
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
    const lines = duplicateGroups.flatMap((group, index) => [`Group ${index + 1}: ${group.map((item) => item.item_name).join(' / ')}`]);
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

  async function handleRepairBadImports() {
    if (isDemoMode || repairingBadImports) return;
    const candidates = items
      .filter((i) => getRegistryItemMetadataState(i).hasBadImportTitle)
      .filter((i) => !!(i.item_url || i.canonical_url))
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
        setItems(prev => prev.map(i => (i.id === updated.id ? normalizeOwnerDashboardRegistryItem(updated) : i)));
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
          setItems(prev => prev.map(i => (i.id === updated.id ? normalizeOwnerDashboardRegistryItem(updated) : i)));
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
    }
    if (updatedCount > 0) {
      logRegistryAction(alertsOnly ? 'registry_alert_items_refreshed' : 'registry_stale_items_refreshed', 'Registry items were refreshed in bulk.', {
        updatedCount,
        candidateCount: staleCandidates.length,
        alertsOnly,
        remainingMonthlyBudget: Math.max(0, monthlyRefreshCap - (budgetState.count + updatedCount)),
      });
    }
    if (!silent) toast(`Refreshed ${updatedCount} ${alertsOnly ? 'alert ' : ''}item${updatedCount === 1 ? '' : 's'}.`);
  }

  async function handleBulkImport() {
    if (!weddingSiteId) return;
    const urls = Array.from(new Set(bulkUrls.split('\n').map((u) => u.trim()).filter(Boolean)));
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
        setItems(prev => [...prev, normalizeOwnerDashboardRegistryItem(created)]);
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


  async function handleSaveRefreshPolicy() {
    if (!weddingSiteId || isDemoMode) return;
    const cap = Math.max(10, Math.min(2000, Number(refreshCapDraft) || 100));
    const untilIso = parseRefreshWindowEndIso(refreshWindowDraft);
    if (untilIso === undefined) {
      toast('Enter a valid refresh end date.', 'error');
      return;
    }

    setSavingRefreshPolicy(true);
    try {
      const updatedAt = new Date().toISOString();
      await saveRegistryRefreshPolicy(weddingSiteId, {
        registry_monthly_refresh_cap: cap,
        registry_refresh_enabled_until: untilIso,
        registry_auto_refresh_enabled: autoRefreshEnabled,
        registry_refresh_include_purchased: refreshIncludePurchased,
        registry_refresh_policy_updated_at: updatedAt,
        registry_refresh_policy_updated_by: user?.id ?? null,
      });

      setMonthlyRefreshCap(cap);
      setRefreshEnabledUntil(untilIso);
      setPolicyUpdatedAt(updatedAt);
      setPolicyUpdatedBy(user?.id ?? null);
      logRegistryAction('registry_refresh_policy_saved', 'Registry refresh policy was updated.', {
        monthlyRefreshCap: cap,
        refreshEnabledUntil: untilIso,
        autoRefreshEnabled,
        refreshIncludePurchased,
      }, weddingSiteId, 'Registry refresh policy');
      toast('Refresh policy saved.');
    } catch (err) {
      toast(safeRegistryDashboardError(err, 'Couldn’t save refresh settings right now. Please try again.'), 'error');
    } finally {
      setSavingRefreshPolicy(false);
    }
  }

  function setDefaultRefreshWindowFromWedding() {
    const date = getWeddingRefreshWindowDate(weddingDate);
    if (!date) return;
    setRefreshWindowDraft(date.toISOString().slice(0, 10));
  }

  function applyRefreshPreset(preset: 'lean' | 'balanced' | 'aggressive') {
    setRefreshPreset(preset);
    const cap = preset === 'lean' ? 60 : preset === 'balanced' ? 120 : 240;
    setRefreshCapDraft(cap);
    const date = getWeddingRefreshWindowDate(weddingDate);
    if (date) setRefreshWindowDraft(date.toISOString().slice(0, 10));
  }

  async function handleResetMonthlyBudgetCounter() {
    if (!weddingSiteId || isDemoMode) return;
    const monthKey = new Date().toISOString().slice(0, 7);
    const updatedAt = new Date().toISOString();
    await saveRegistryRefreshPolicy(weddingSiteId, {
      registry_monthly_refresh_count: 0,
      registry_monthly_refresh_month: monthKey,
      registry_refresh_policy_updated_at: updatedAt,
      registry_refresh_policy_updated_by: user?.id ?? null,
    });
    setMonthlyRefreshCount(0);
    setMonthlyRefreshMonth(monthKey);
    setPolicyUpdatedAt(updatedAt);
    setPolicyUpdatedBy(user?.id ?? null);
    logRegistryAction('registry_refresh_counter_reset', 'Registry monthly refresh counter was reset.', { monthKey }, weddingSiteId, 'Registry refresh policy');
    toast('Monthly refresh counter reset.');
  }

  function handleEdit(item: RegistryItem) {
    setEditItem(item);
    setShowForm(true);
  }

  function handleAddNew() {
    setEditItem(null);
    setShowForm(true);
  }

  useEffect(() => {
    if (loading || isDemoMode || items.length === 0) return;
    const hasStale = normalizedItems.some((item) => !item.metadata_last_checked_at || (Date.now() - new Date(item.metadata_last_checked_at).getTime()) > WEEKLY_REFRESH_MS);
    if (!hasStale) return;
    handleAutoRefreshStale(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isDemoMode, items.length, normalizedItems]);


  const todayMonthKey = getCurrentMonthKey();
  const refreshWindowUntil = refreshEnabledUntil
    ? toValidDateOrNull(refreshEnabledUntil)
    : getWeddingRefreshWindowDate(weddingDate);
  async function ensureMonthlyBudgetState() {
    const budgetState = resolveRegistryRefreshBudgetState({
      storedMonthKey: monthlyRefreshMonth,
      storedCount: monthlyRefreshCount,
      currentMonthKey: todayMonthKey,
    });

    if (!weddingSiteId || isDemoMode) return { monthKey: budgetState.monthKey, count: budgetState.count };
    if (!budgetState.shouldReset) return { monthKey: budgetState.monthKey, count: budgetState.count };

    setMonthlyRefreshCount(0);
    setMonthlyRefreshMonth(budgetState.monthKey);
    await updateRegistryRefreshBudget(weddingSiteId, {
      registry_monthly_refresh_count: 0,
      registry_monthly_refresh_month: budgetState.monthKey,
    });
    return { monthKey: budgetState.monthKey, count: 0 };
  }
  const {
    actionableBadImportCount,
    alertCounts,
    budgetUtilization,
    bulkReviewCounts,
    counts,
    duplicateGroups,
    filtered,
    fulfillmentRate,
    fundStats,
    nearBudgetCap,
    recentActivity,
    refreshBudgetRemaining,
    refreshWindowOpen,
    registryInsights,
    registryLaunchReadiness,
    registryThankYouPlan,
    topRegistryItems,
  } = buildRegistryDashboardDerivedState({
    autoRefreshEnabled,
    items: normalizedItems,
    monthlyRefreshCap,
    monthlyRefreshCount,
    refreshEnabledUntil: refreshWindowUntil,
    refreshIncludePurchased,
    search,
    filter,
    showAlertsOnly,
    showImageIssuesOnly,
  });

  const tabCount = (key: RegistryFilter) => {
    if (key === 'all') return counts.total;
    if (key === 'available') return counts.available;
    if (key === 'partial') return counts.partial;
    if (key === 'purchased') return counts.purchased;
    return 0;
  };

  return (
    <DashboardLayout currentPage="registry">
      <div className="max-w-[1100px] mx-auto space-y-5">

        <DashboardPageHero
          eyebrow="Registry"
          title="Keep gifts helpful, optional, and easy for guests."
          description="Add links from any store, keep images and availability fresh, and show gentle registry ideas without making the page feel pushy."
          stats={[
            { label: 'Gifts', value: counts.total, detail: `${counts.available + counts.partial} still available` },
            { label: 'Purchased', value: counts.purchased, detail: `${fulfillmentRate}% complete` },
            { label: 'Worth checking', value: alertCounts.stale + alertCounts.priceChanged + alertCounts.outOfStock, detail: 'quick review items' },
          ]}
          actions={
            <>
            <ActionsMenu
              label="More"
              open={registryActionsOpen}
              onToggle={() => setRegistryActionsOpen((v) => !v)}
              align="left"
              menuRef={registryActionsRef}
            >
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { setShowImageIssuesOnly(true); setShowAlertsOnly(false); setRegistryActionsOpen(false); }}>
                Focus image issues
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { void handleRefreshImageIssues(); setRegistryActionsOpen(false); }} disabled={imageRefreshBusy}>
                {imageRefreshBusy ? 'Refreshing image issues…' : 'Refresh image issues'}
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { setBulkImportOpen(true); setRegistryActionsOpen(false); }} disabled={!weddingSiteId}>
Add a list of links
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { void handleRepairBadImports(); setRegistryActionsOpen(false); }} disabled={repairingBadImports}>
                {repairingBadImports ? 'Cleaning up imported gifts…' : 'Clean up imported gifts'}
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { void handleAutoRefreshStale(false); setRegistryActionsOpen(false); }} disabled={!weddingSiteId || autoRefreshing || !refreshWindowOpen || refreshBudgetRemaining <= 0}>
                {autoRefreshing ? 'Refreshing…' : 'Refresh stale gift details'}
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { void handleAutoRefreshStale(false, true); setRegistryActionsOpen(false); }} disabled={!weddingSiteId || autoRefreshing || !refreshWindowOpen || refreshBudgetRemaining <= 0}>
                {autoRefreshing ? 'Refreshing…' : 'Refresh gifts worth checking'}
              </Button>
            </ActionsMenu>
            <Button variant="primary" size="md" onClick={handleAddNew} disabled={!weddingSiteId}>
              <Plus className="w-4 h-4" />
              Add gift
            </Button>
            </>
          }
        >
          <div className="inline-flex flex-wrap items-center gap-2 text-[11px] text-text-tertiary">
            <span className="rounded-lg border border-border-subtle bg-white px-2 py-0.5">
              {autoRefreshEnabled ? (refreshWindowOpen ? 'Weekly refresh on' : 'Refresh window closed') : 'Refresh paused'}
            </span>
            <span>Monthly refreshes {monthlyRefreshCount}/{monthlyRefreshCap}</span>
          </div>
        </DashboardPageHero>

        <details className="rounded-lg border border-border-subtle bg-white/80 p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-text-primary">
            Gift snapshot and review details
          </summary>
          <div className="mt-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Gift, bg: 'bg-primary-light', color: 'text-primary', val: counts.total, label: 'Gifts' },
            { icon: CheckCircle2, bg: 'bg-success-light', color: 'text-success', val: counts.purchased, label: 'Purchased' },
            { icon: Package, bg: 'bg-surface-subtle', color: 'text-text-secondary', val: counts.available + counts.partial, label: 'Remaining' },
            { icon: DollarSign, bg: 'bg-primary-light', color: 'text-primary', val: `$${counts.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, label: 'Estimated value' },
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="bordered" padding="md">
            <p className="text-xs font-medium text-text-tertiary">Gift progress</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{fulfillmentRate}%</p>
            <p className="mt-1 text-xs text-text-secondary">Items already marked purchased</p>
          </Card>
          <Card variant="bordered" padding="md">
            <p className="text-xs font-medium text-text-tertiary">Cash funds</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{fundStats.count}</p>
            <p className="mt-1 text-xs text-text-secondary">Funds visible to guests</p>
          </Card>
          <Card variant="bordered" padding="md">
            <p className="text-xs font-medium text-text-tertiary">Fund gifts</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">${fundStats.received.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
            <p className="mt-1 text-xs text-text-secondary">Received toward ${fundStats.goal.toLocaleString('en-US', { maximumFractionDigits: 0 })} goal</p>
          </Card>
          <Card variant="bordered" padding="md">
            <p className="text-xs font-medium text-text-tertiary">Worth checking</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{alertCounts.stale + alertCounts.priceChanged + alertCounts.outOfStock}</p>
            <p className="mt-1 text-xs text-text-secondary">Items that may need a quick review</p>
          </Card>
        </div>

        {registryInsights.length > 0 && (
          <Card variant="bordered" padding="lg">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-base font-semibold text-text-primary">Registry quick check</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {registryInsights.map((insight) => (
                <div key={insight.id} className="rounded-lg border border-border-subtle bg-surface-subtle/20 p-4">
                  <p className="text-sm font-semibold text-text-primary">{insight.title}</p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">{insight.detail}</p>
                  <button
                    type="button"
                    className="mt-3 text-xs font-semibold text-primary hover:underline"
                    onClick={() => {
                      if (insight.id === 'registry-metadata-images') {
                        setShowImageIssuesOnly(true);
                        setShowAlertsOnly(false);
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
              {topRegistryItems.length === 0 ? (
                <p className="text-sm text-text-secondary">No registry items yet.</p>
              ) : topRegistryItems.map((item) => {
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
              {recentActivity.length === 0 ? (
                <p className="text-sm text-text-secondary">No registry activity yet.</p>
              ) : recentActivity.map((item) => (
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
                Purchased: <span className="font-semibold text-text-primary">{counts.purchased}</span> · Remaining: <span className="font-semibold text-text-primary">{counts.available + counts.partial}</span>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                Cash funds received: <span className="font-semibold text-text-primary">${fundStats.received.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                Image issues: <span className="font-semibold text-text-primary">{alertCounts.imageIssues}</span> · Duplicate groups: <span className="font-semibold text-text-primary">{duplicateGroups.length}</span>
              </div>
            </div>
          </Card>
        </div>
          </div>
        </details>

        <Card variant="bordered" padding="lg" className="border-border-subtle bg-white">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-medium text-text-tertiary">Guest-ready registry check</p>
              <h2 className="mt-2 text-xl font-semibold text-text-primary">{registryLaunchReadiness.headline}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{registryLaunchReadiness.summary}</p>
            </div>
            <div className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
              registryLaunchReadiness.status === 'ready'
                ? 'border-success/20 bg-success-light text-success'
                : registryLaunchReadiness.status === 'needs-review'
                  ? 'border-border-subtle bg-primary-light text-primary'
                  : 'border-border-subtle bg-surface-subtle text-text-secondary'
            }`}>
              {registryLaunchReadiness.status === 'ready' ? 'Guest-ready' : registryLaunchReadiness.status === 'needs-review' ? `${registryLaunchReadiness.reviewCount} to review` : 'Empty'}
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {registryLaunchReadiness.items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border-subtle bg-surface-subtle/25 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                  <span className={`rounded-lg border px-2 py-0.5 text-[11px] font-medium ${
                    item.tone === 'review'
                      ? 'border-border-subtle bg-white text-primary'
                      : item.tone === 'planned'
                        ? 'border-border-subtle bg-white text-text-secondary'
                        : 'border-success/20 bg-success-light text-success'
                  }`}>
                    {item.tone === 'review' ? 'Review' : item.tone === 'planned' ? 'Planned' : 'Ready'}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-text-secondary">{item.detail}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card variant="bordered" padding="lg" className="border-border-subtle bg-white">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-medium text-text-tertiary">Thank-you tracking preview</p>
              <h2 className="mt-2 text-xl font-semibold text-text-primary">{registryThankYouPlan.headline}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{registryThankYouPlan.summary}</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-xs font-semibold text-text-secondary">
              {registryThankYouPlan.namedPurchaserCount}/{registryThankYouPlan.purchasedCount} named
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border-subtle bg-surface-subtle/25 px-4 py-3">
              <p className="text-xs font-medium text-text-tertiary">Purchased gifts</p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{registryThankYouPlan.purchasedCount}</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-subtle/25 px-4 py-3">
              <p className="text-xs font-medium text-text-tertiary">Purchaser names</p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{registryThankYouPlan.namedPurchaserCount}</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-subtle/25 px-4 py-3">
              <p className="text-xs font-medium text-text-tertiary">Needs name</p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{registryThankYouPlan.missingPurchaserCount}</p>
            </div>
          </div>
          {registryThankYouPlan.items.length > 0 && (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {registryThankYouPlan.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3">
                  <p className="text-sm font-semibold text-text-primary">{item.giftName}</p>
                  <p className="mt-1 text-xs text-text-secondary">{item.purchaserLabel}</p>
                  <p className="mt-2 text-xs leading-5 text-text-tertiary">{item.detail}</p>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs leading-5 text-text-tertiary">
            This is a review surface only. Thank-you tasks stay planned until task creation and readback are connected.
          </p>
        </Card>

        <Card variant="bordered" padding="lg">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or store…"
                className="w-full pl-9 pr-4 py-2.5 bg-surface-subtle border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-1 bg-surface-subtle rounded-lg p-1 border border-border">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    filter === tab.key
                      ? 'bg-surface text-text-primary ring-1 ring-border-subtle'
                      : 'text-text-secondary hover:text-text-primary'
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
              onClick={() => setShowAlertsOnly((v) => !v)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${showAlertsOnly ? 'border-border-subtle bg-primary-light text-primary' : 'border-border text-text-tertiary'}`}
            >
              {showAlertsOnly ? 'Showing review items' : 'Show review items'}
            </button>
            <button
              onClick={() => setShowImageIssuesOnly((v) => !v)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${showImageIssuesOnly ? 'border-border-subtle bg-primary-light text-primary' : 'border-border text-text-tertiary'}`}
            >
              {showImageIssuesOnly ? 'Showing image issues' : 'Show image issues'}
            </button>
            {showImageIssuesOnly && (
              <>
                <button
                  onClick={() => void handleRefreshImageIssues()}
                  disabled={imageRefreshBusy}
                  className="rounded-lg border border-border-subtle bg-primary-light px-2 py-1 text-xs font-medium text-primary disabled:opacity-60"
                >
                  {imageRefreshBusy ? 'Refreshing…' : 'Fix image issues now'}
                </button>
                <button
                  onClick={() => setShowImageIssuesOnly(false)}
                  className="rounded-lg border border-border px-2 py-1 text-text-tertiary"
                >
                  Clear
                </button>
              </>
            )}
            <span className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-text-tertiary">
              Review: {alertCounts.stale + alertCounts.priceChanged + alertCounts.outOfStock}
            </span>
            <span className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-text-tertiary">
              Image issues: {alertCounts.imageIssues}
            </span>
            <span className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-text-tertiary">
              Gifts to review: {actionableBadImportCount}
            </span>
            <span className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-text-tertiary">
              Needs cleanup: {normalizedItems.filter((item) => getRegistryRepairStates(item).length > 0).length}
            </span>
            <span className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-text-tertiary">
              Duplicate groups: {duplicateGroups.length}
            </span>
            {actionableBadImportCount > 0 && (
              <button
                onClick={() => void handleRepairBadImports()}
                disabled={repairingBadImports}
                className="rounded-lg border border-border-subtle bg-primary-light px-2 py-1 text-xs font-medium text-primary disabled:opacity-60"
              >
                {repairingBadImports ? 'Cleaning up…' : 'Clean up imported gifts'}
              </button>
            )}
            <span className={`rounded-lg border px-2 py-1 ${nearBudgetCap ? 'border-border-subtle bg-primary-light text-primary' : 'border-border text-text-tertiary'}`}>
              Refresh room used: {Math.round(budgetUtilization * 100)}%
            </span>
          </div>

          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 p-4">
              <p className="text-xs text-text-tertiary">Could use details</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">{bulkReviewCounts.repair}</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 p-4">
              <p className="text-xs text-text-tertiary">Possible repeats</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">{bulkReviewCounts.duplicates}</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 p-4">
              <p className="text-xs text-text-tertiary">Needs better image</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">{bulkReviewCounts.imageIssues}</p>
            </div>
          </div>

          <div className="mb-3 rounded-lg border border-border-subtle bg-surface-subtle/20 p-4 text-xs text-text-secondary">
            These tools help tidy imported links and spot repeated gifts. Nothing is merged or deleted unless you choose it.
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {bulkReviewCounts.repair > 0 && <button onClick={() => void handleRepairBadImports()} disabled={repairingBadImports} className="rounded-lg border border-border-subtle bg-primary-light px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-60" title="Refresh weaker gift details without deleting items">{repairingBadImports ? 'Cleaning up…' : 'Review details'}</button>}
            {bulkReviewCounts.imageIssues > 0 && <button onClick={() => void handleRefreshImageIssues()} disabled={imageRefreshBusy} className="rounded-lg border border-border-subtle bg-primary-light px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-60">{imageRefreshBusy ? 'Refreshing…' : 'Refresh image issues'}</button>}
            {duplicateGroups.length > 0 && <button onClick={() => void handleCopyDuplicateReviewList()} className="px-3 py-1.5 rounded-lg border border-border text-text-secondary text-xs font-medium" title="Review duplicates before removing anything">Copy duplicate review list</button>}
          </div>

          {duplicateGroups.length > 0 && (
            <div className="mb-4 rounded-lg border border-border-subtle bg-surface-subtle/20 p-4 text-sm text-text-secondary space-y-2">
              <p className="font-medium">Possible duplicate gifts found</p>
              <div className="space-y-1 text-xs">
                {duplicateGroups.slice(0, 4).map((group, index) => (
                  <p key={index}>• {group.map((item) => item.item_name).join(' / ')}</p>
                ))}
              </div>
              <p className="text-xs">Review these before guests see repeated items.</p>
            </div>
          )}

          {loading ? (
            <DashboardStateBlock title="Loading registry…" description="Pulling your latest items and settings." />
          ) : !weddingSiteId ? (
            <DashboardStateBlock title="No wedding site found" description="Complete onboarding first to set up your registry." />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface-subtle">
                <Gift className="w-8 h-8 text-text-tertiary" />
              </div>
              <div>
                <p className="text-text-primary font-semibold mb-1">
                  {items.length === 0 ? 'Your registry is empty' : 'No items match your filter'}
                </p>
                <p className="text-sm text-text-secondary max-w-xs mx-auto">
                  {items.length === 0
                    ? 'Paste any product URL from any store to get started.'
                    : 'Try adjusting your search or selecting a different filter.'}
                </p>
              </div>
              {items.length === 0 && (
                <Button variant="primary" size="md" onClick={handleAddNew}>
                  <Plus className="w-4 h-4" />
                  Add your first item
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map(item => (
                <RegistryItemCard
                  key={item.id}
                  item={item}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onMarkPurchased={handleMarkPurchased}
                  onRefetchMetadata={handleRefetchMetadata}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {showForm && (
        <RegistryItemForm
          initial={editItem}
          existingItems={items}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditItem(null); }}
        />
      )}

      {bulkImportOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl space-y-4 rounded-lg border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">Add gift links</h3>
              <button className="text-text-tertiary hover:text-text-primary" onClick={() => setBulkImportOpen(false)}>Close</button>
            </div>
            <p className="text-sm text-text-secondary">Paste one link per line (up to 30). We’ll fill what we can and add the gifts to your registry.</p>
            <p className="text-xs text-text-tertiary">If some links need review, you’ll see a short note so you can fix and retry.</p>
            <textarea
              value={bulkUrls}
              onChange={(e) => setBulkUrls(e.target.value)}
              rows={10}
              placeholder="https://www.amazon.com/...\nhttps://www.target.com/..."
              className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setBulkImportOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleBulkImport} disabled={bulkImportBusy}>
                {bulkImportBusy ? 'Adding…' : 'Add links'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ToastList toasts={toasts} />
    </DashboardLayout>
  );
};
