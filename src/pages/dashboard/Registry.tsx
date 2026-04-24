import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { DashboardStateBlock } from '../../components/dashboard/DashboardStateBlock';
import { Card, Button, ActionsMenu } from '../../components/ui';
import { Gift, Plus, CheckCircle2, DollarSign, Search, Package, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchRegistryItems,
  createRegistryItem,
  updateRegistryItem,
  deleteRegistryItem,
  ownerMarkPurchased,
  fetchUrlPreview,
} from './registry/registryService';
import { RegistryItemCard } from './registry/RegistryItemCard';
import { RegistryItemForm } from './registry/RegistryItemForm';
import type { RegistryItem, RegistryFilter, RegistryItemDraft } from './registry/registryTypes';
import { getRegistryItemMetadataState, itemNeedsAttention, sanitizeRegistryQuantityState } from './registry/registryTypes';
import { demoWeddingSite, demoRegistryItems } from '../../lib/demoData';
import { getRegistryRepairStates } from './registry/repairState';
import { findDuplicateRegistryGroups } from './registry/duplicateRegistryItems';
import { getCurrentMonthKey, resolveRegistryRefreshBudgetState } from './registry/refreshBudget';
import { getWeddingRefreshWindowDate, parseRefreshWindowEndIso, toDateInputValueOrEmpty, toValidDateOrNull } from './registryRefreshWindow';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

function normalizeOwnerDashboardRegistryItem(item: RegistryItem): RegistryItem {
  const quantityState = sanitizeRegistryQuantityState(item.quantity_purchased ?? 0, item.quantity_needed ?? 1);
  return {
    ...item,
    quantity_needed: quantityState.quantityNeeded,
    quantity_purchased: quantityState.quantityPurchased,
    purchase_status: quantityState.purchaseStatus,
    purchaser_name: quantityState.purchaseStatus === 'available' ? null : item.purchaser_name,
  };
}

const ToastList: React.FC<{ toasts: Toast[] }> = ({ toasts }) => (
  <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
    {toasts.map(t => (
      <div
        key={t.id}
        className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
          t.type === 'error'
            ? 'bg-error-light text-error border-error/20'
            : 'bg-success-light text-success border-success/20'
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
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [weddingDate, setWeddingDate] = useState<string | null>(null);
  const [refreshEnabledUntil, setRefreshEnabledUntil] = useState<string | null>(null);
  const [monthlyRefreshCap, setMonthlyRefreshCap] = useState(100);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [monthlyRefreshCount, setMonthlyRefreshCount] = useState(0);
  const [monthlyRefreshMonth, setMonthlyRefreshMonth] = useState<string | null>(null);
  const [refreshCapDraft, setRefreshCapDraft] = useState(100);
  const [refreshWindowDraft, setRefreshWindowDraft] = useState('');
  const [savingRefreshPolicy, setSavingRefreshPolicy] = useState(false);
  const [refreshPreset, setRefreshPreset] = useState<'lean' | 'balanced' | 'aggressive'>('balanced');
  const [refreshIncludePurchased, setRefreshIncludePurchased] = useState(false);
  const [policyUpdatedAt, setPolicyUpdatedAt] = useState<string | null>(null);
  const [policyUpdatedBy, setPolicyUpdatedBy] = useState<string | null>(null);
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
  const normalizedItems = items.map(normalizeOwnerDashboardRegistryItem);
  const duplicateGroups = findDuplicateRegistryGroups(normalizedItems);
  const actionableBadImportCount = normalizedItems.filter((item) => getRegistryItemMetadataState(item).hasBadImportTitle && !!(item.item_url || item.canonical_url)).length;
  const bulkReviewCounts = {
    repair: actionableBadImportCount,
    duplicates: duplicateGroups.reduce((sum, group) => sum + group.length, 0),
    imageIssues: normalizedItems.filter((item) => !item.image_url || item.image_url.includes('thum.io') || item.image_url.includes('weserv.nl')).length,
  };
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

  function toDemoRegistryItem(item: typeof demoRegistryItems[number], index: number): RegistryItem {
    const quantityState = sanitizeRegistryQuantityState(item.quantity_purchased ?? 0, item.quantity_needed ?? 1);

    return {
      id: item.id,
      wedding_site_id: demoWeddingSite.id,
      item_name: item.item_name,
      price_label: null,
      price_amount: item.price ?? null,
      store_name: item.store_name ?? null,
      merchant: item.store_name ?? null,
      item_url: null,
      canonical_url: null,
      image_url: null,
      description: null,
      notes: null,
      quantity_needed: quantityState.quantityNeeded,
      quantity_purchased: quantityState.quantityPurchased,
      purchaser_name: null,
      purchase_status: quantityState.purchaseStatus,
      hide_when_purchased: false,
      sort_order: index,
      priority: item.priority,
      availability: null,
      metadata_last_checked_at: null,
      metadata_fetch_status: null,
      metadata_confidence_score: null,
      metadata_source_method: null,
      metadata_retailer: null,
      previous_price_amount: null,
      price_last_changed_at: null,
      next_refresh_at: null,
      last_auto_refreshed_at: null,
      refresh_fail_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const loadItems = useCallback(async (siteId: string) => {
    try {
      const data = await fetchRegistryItems(siteId);
      setItems(data.map(normalizeOwnerDashboardRegistryItem));
    } catch {
      toast('Couldn’t load registry items right now. Please try again.', 'error');
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        if (isDemoMode) {
          setWeddingSiteId(demoWeddingSite.id);
          setItems(demoRegistryItems.map(toDemoRegistryItem));
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: site } = await supabase
          .from('wedding_sites')
          .select('id, wedding_date, registry_refresh_enabled_until, registry_monthly_refresh_cap, registry_monthly_refresh_count, registry_monthly_refresh_month, registry_auto_refresh_enabled, registry_refresh_include_purchased, registry_refresh_policy_updated_at, registry_refresh_policy_updated_by')
          .eq('id', (await resolveActiveSiteForUser(user.id))?.id ?? '')
          .maybeSingle();
        if (site?.id) {
          setWeddingSiteId(site.id);
          setWeddingDate((site as { wedding_date?: string | null }).wedding_date ?? null);
          const typedSite = site as { registry_refresh_enabled_until?: string | null; registry_monthly_refresh_cap?: number | null; registry_monthly_refresh_count?: number | null; registry_monthly_refresh_month?: string | null; registry_auto_refresh_enabled?: boolean | null; registry_refresh_include_purchased?: boolean | null; registry_refresh_policy_updated_at?: string | null; registry_refresh_policy_updated_by?: string | null; wedding_date?: string | null };
          const budgetState = resolveRegistryRefreshBudgetState({
            storedMonthKey: typedSite.registry_monthly_refresh_month ?? null,
            storedCount: typedSite.registry_monthly_refresh_count ?? 0,
          });
          setMonthlyRefreshMonth(budgetState.monthKey);
          setRefreshEnabledUntil(typedSite.registry_refresh_enabled_until ?? null);
          setAutoRefreshEnabled(typedSite.registry_auto_refresh_enabled ?? true);
          setRefreshIncludePurchased(typedSite.registry_refresh_include_purchased ?? false);
          setPolicyUpdatedAt(typedSite.registry_refresh_policy_updated_at ?? null);
          setPolicyUpdatedBy(typedSite.registry_refresh_policy_updated_by ?? null);
          setRefreshWindowDraft(toDateInputValueOrEmpty(typedSite.registry_refresh_enabled_until));
          const loadedCap = typedSite.registry_monthly_refresh_cap ?? 100;
          setMonthlyRefreshCap(loadedCap);
          setRefreshCapDraft(loadedCap);
          setRefreshPreset(loadedCap <= 60 ? 'lean' : loadedCap <= 160 ? 'balanced' : 'aggressive');
          setMonthlyRefreshCount(budgetState.count);
          await loadItems(site.id);
        }
      } catch {
        toast('Couldn’t finish setup right now. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [isDemoMode, loadItems]);

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
      toast('Item updated');
    } else {
      const created = await createRegistryItem(weddingSiteId, fields);
      setItems(prev => [...prev, normalizeOwnerDashboardRegistryItem(created)]);
      toast('Item added to registry');
    }

    setShowForm(false);
    setEditItem(null);
  }

  async function handleDelete(id: string) {
    try {
      if (!isDemoMode) {
        await deleteRegistryItem(id);
      }
      setItems(prev => prev.filter(i => i.id !== id));
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
      if (!silent) toast(replaceExisting ? 'Demo: sample product details are already fully re-imported' : 'Demo: sample product details are already populated', 'success');
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
        if (!silent) toast(replaceExisting ? 'Item re-imported from source link' : 'Product details refreshed');
      } else if (!silent) {
        toast('No new details found — details are up to date');
      }
      return true;
    } catch {
      if (!silent) toast(replaceExisting ? 'Couldn’t re-import this item right now. Try Edit if the source page is weak.' : 'Couldn’t refresh product details right now. Please try again.', 'error');
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
      // eslint-disable-next-line no-await-in-loop
      const refreshed = await handleRefetchMetadata(item, true);
      if (refreshed) ok += 1;
    }
    setImageRefreshBusy(false);
    toast(`Refreshed ${ok}/${candidates.length} image-issue item${candidates.length === 1 ? '' : 's'}.`, ok > 0 ? 'success' : 'error');
  }


  async function handleCopyDuplicateReviewList() {
    const lines = duplicateGroups.flatMap((group, index) => [`Group ${index + 1}: ${group.map((item) => item.item_name).join(' / ')}`]);
    if (lines.length === 0) {
      toast('No duplicate groups to review.', 'error');
      return;
    }
    const payload = lines.join('\n');
    try {
      await navigator.clipboard.writeText(payload);
      toast('Copied duplicate review list');
    } catch {
      window.prompt('Copy duplicate review list:', payload);
    }
  }

  async function handleRepairBadImports() {
    if (isDemoMode || repairingBadImports) return;
    const candidates = items
      .filter((i) => getRegistryItemMetadataState(i).hasBadImportTitle)
      .filter((i) => !!(i.item_url || i.canonical_url))
      .slice(0, 20);

    if (candidates.length === 0) {
      toast('No repairable bad imports found.');
      return;
    }

    setRepairingBadImports(true);
    let repaired = 0;
    for (const item of candidates) {
      // eslint-disable-next-line no-await-in-loop
      const refreshed = await handleRefetchMetadata(item, true);
      if (refreshed) repaired += 1;
    }
    setRepairingBadImports(false);
    toast(`Repaired ${repaired}/${candidates.length} bad import${candidates.length === 1 ? '' : 's'}.`, repaired > 0 ? 'success' : 'error');
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
      if (!silent) toast('Monthly refresh budget reached for this registry.');
      return;
    }

    const staleCandidates = items
      .filter((item) => !!(item.item_url || item.canonical_url))
      .filter((item) => refreshIncludePurchased || (item.purchase_status !== 'purchased' && !item.hide_when_purchased))
      .filter((item) => {
        const dueBySchedule = !item.next_refresh_at || new Date(item.next_refresh_at).getTime() <= Date.now();
        const failCount = item.refresh_fail_count ?? 0;
        const backoffDue = !item.last_auto_refreshed_at || (Date.now() - new Date(item.last_auto_refreshed_at).getTime()) >= getBackoffMs(failCount);
        const stale = !item.metadata_last_checked_at || (Date.now() - new Date(item.metadata_last_checked_at).getTime()) > WEEKLY_REFRESH_MS;
        const outOfStock = (item.availability || '').toLowerCase().includes('out');
        const priceChanged = item.previous_price_amount != null && item.price_amount != null && item.previous_price_amount !== item.price_amount;
        return alertsOnly ? ((dueBySchedule || stale || outOfStock || priceChanged) && backoffDue) : ((dueBySchedule || stale) && backoffDue);
      })
      .slice(0, Math.min(12, remaining));

    if (staleCandidates.length === 0) {
      if (!silent) toast('Registry metadata is already fresh.');
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
        await supabase
          .from('wedding_sites')
          .update({ registry_monthly_refresh_count: nextCount, registry_monthly_refresh_month: budgetState.monthKey })
          .eq('id', weddingSiteId);
      }
    }
    if (!silent) toast(`Refreshed ${updatedCount} ${alertsOnly ? 'alert ' : ''}item${updatedCount === 1 ? '' : 's'}.`);
  }

  async function handleBulkImport() {
    if (!weddingSiteId) return;
    const urls = Array.from(new Set(bulkUrls.split('\n').map((u) => u.trim()).filter(Boolean)));
    if (urls.length === 0) {
      toast('Paste at least one URL to import.', 'error');
      return;
    }

    setBulkImportBusy(true);
    let createdCount = 0;
    let failedCount = 0;
    let invalidUrlCount = 0;
    const skippedExamples: string[] = [];
    for (const url of urls.slice(0, 30)) {
      try {
        let hostname = '';
        try {
          hostname = new URL(url).hostname;
        } catch {
          invalidUrlCount += 1;
          failedCount += 1;
          if (skippedExamples.length < 3) skippedExamples.push(`${url} (invalid URL)`);
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
        if (skippedExamples.length < 3) skippedExamples.push(`${url} (fetch failed)`);
      }
    }

    setBulkImportBusy(false);
    setBulkImportOpen(false);
    setBulkUrls('');
    if (failedCount > 0) {
      toast(`Imported ${createdCount} item${createdCount === 1 ? '' : 's'} (${failedCount} skipped).`, createdCount > 0 ? 'success' : 'error');
      const details = [
        invalidUrlCount > 0 ? `${invalidUrlCount} invalid URL${invalidUrlCount === 1 ? '' : 's'}` : null,
        skippedExamples.length > 0 ? `Examples: ${skippedExamples.join(' • ')}` : null,
      ].filter(Boolean).join(' — ');
      if (details) toast(details, 'error');
    } else {
      toast(`Imported ${createdCount} item${createdCount === 1 ? '' : 's'} from URLs.`);
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
      const { error } = await supabase
        .from('wedding_sites')
        .update({
          registry_monthly_refresh_cap: cap,
          registry_refresh_enabled_until: untilIso,
          registry_auto_refresh_enabled: autoRefreshEnabled,
          registry_refresh_include_purchased: refreshIncludePurchased,
          registry_refresh_policy_updated_at: new Date().toISOString(),
          registry_refresh_policy_updated_by: user?.id ?? null,
        })
        .eq('id', weddingSiteId);
      if (error) throw error;

      setMonthlyRefreshCap(cap);
      setRefreshEnabledUntil(untilIso);
      setPolicyUpdatedAt(new Date().toISOString());
      setPolicyUpdatedBy(user?.id ?? null);
      toast('Refresh policy saved.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Couldn’t save refresh settings right now. Please try again.', 'error');
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
    await supabase
      .from('wedding_sites')
      .update({ registry_monthly_refresh_count: 0, registry_monthly_refresh_month: monthKey, registry_refresh_policy_updated_at: new Date().toISOString(), registry_refresh_policy_updated_by: user?.id ?? null })
      .eq('id', weddingSiteId);
    setMonthlyRefreshCount(0);
    setMonthlyRefreshMonth(monthKey);
    setPolicyUpdatedAt(new Date().toISOString());
    setPolicyUpdatedBy(user?.id ?? null);
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

  const filtered = normalizedItems.filter(item => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      item.item_name.toLowerCase().includes(q) ||
      (item.merchant ?? '').toLowerCase().includes(q) ||
      (item.store_name ?? '').toLowerCase().includes(q);
    const matchesFilter = filter === 'all' || item.purchase_status === filter;
    const hasAlert =
      !item.metadata_last_checked_at ||
      (Date.now() - new Date(item.metadata_last_checked_at).getTime()) > WEEKLY_REFRESH_MS ||
      ((item.availability || '').toLowerCase().includes('out')) ||
      (item.previous_price_amount != null && item.price_amount != null && item.previous_price_amount !== item.price_amount);
    const hasImageIssue = !item.image_url || item.image_url.includes('thum.io') || item.image_url.includes('weserv.nl');
    const matchesAlerts = !showAlertsOnly || hasAlert;
    const matchesImageIssues = !showImageIssuesOnly || hasImageIssue;
    return matchesSearch && matchesFilter && matchesAlerts && matchesImageIssues;
  });


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
  const refreshWindowOpen = autoRefreshEnabled && (!refreshWindowUntil || refreshWindowUntil.getTime() >= Date.now());
  const refreshBudgetRemaining = Math.max(0, monthlyRefreshCap - monthlyRefreshCount);
  const budgetUtilization = monthlyRefreshCap > 0 ? monthlyRefreshCount / monthlyRefreshCap : 0;
  const nearBudgetCap = budgetUtilization >= 0.8;
  const eligibleItemCount = normalizedItems.filter((item) => refreshIncludePurchased || (item.purchase_status !== 'purchased' && !item.hide_when_purchased)).length;
  const projectedMonthlyCalls = Math.min(eligibleItemCount, monthlyRefreshCap);
  const projectedRefreshCoverage = eligibleItemCount > 0 ? Math.round((projectedMonthlyCalls / eligibleItemCount) * 100) : 100;
  const daysUntilRefreshWindowEnd = refreshWindowUntil ? Math.ceil((refreshWindowUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
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
    await supabase
      .from('wedding_sites')
      .update({ registry_monthly_refresh_count: 0, registry_monthly_refresh_month: budgetState.monthKey })
      .eq('id', weddingSiteId);
    return { monthKey: budgetState.monthKey, count: 0 };
  }

  const baseRecommendedPreset: 'lean' | 'balanced' | 'aggressive' = items.length <= 40 ? 'lean' : items.length <= 120 ? 'balanced' : 'aggressive';
  const recommendedPreset: 'lean' | 'balanced' | 'aggressive' = (daysUntilRefreshWindowEnd != null && daysUntilRefreshWindowEnd <= 14) ? 'lean' : baseRecommendedPreset;

  const counts = {
    total: normalizedItems.length,
    purchased: normalizedItems.filter(i => i.purchase_status === 'purchased').length,
    partial: normalizedItems.filter(i => i.purchase_status === 'partial').length,
    available: normalizedItems.filter(i => i.purchase_status === 'available').length,
    totalValue: normalizedItems.reduce((s, i) => s + (i.price_amount ?? 0), 0),
  };

  const fundStats = normalizedItems.reduce((acc, item) => {
    if (item.item_type !== 'cash_fund') return acc;
    acc.count += 1;
    acc.goal += item.fund_goal_amount ?? 0;
    acc.received += item.fund_received_amount ?? 0;
    return acc;
  }, { count: 0, goal: 0, received: 0 });

  const fulfillmentRate = counts.total > 0 ? Math.round((counts.purchased / counts.total) * 100) : 0;
  const recentActivity = [...normalizedItems]
    .filter((item) => item.updated_at || item.created_at)
    .sort((a, b) => new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime())
    .slice(0, 6);
  const topRegistryItems = [...normalizedItems]
    .sort((a, b) => {
      const aProgress = (a.quantity_purchased ?? 0) / Math.max(a.quantity_needed ?? 1, 1);
      const bProgress = (b.quantity_purchased ?? 0) / Math.max(b.quantity_needed ?? 1, 1);
      return bProgress - aProgress;
    })
    .slice(0, 5);

  const alertCounts = {
    stale: normalizedItems.filter((i) => !i.metadata_last_checked_at || (Date.now() - new Date(i.metadata_last_checked_at).getTime()) > 1000 * 60 * 60 * 24).length,
    priceChanged: normalizedItems.filter((i) => i.previous_price_amount != null && i.price_amount != null && i.previous_price_amount !== i.price_amount).length,
    outOfStock: normalizedItems.filter((i) => (i.availability || '').toLowerCase().includes('out')).length,
    imageIssues: normalizedItems.filter((i) => !i.image_url || i.image_url.includes('thum.io') || i.image_url.includes('weserv.nl')).length,
    badImports: normalizedItems.filter((i) => getRegistryItemMetadataState(i).hasBadImportTitle).length,
  };

  const tabCount = (key: RegistryFilter) => {
    if (key === 'all') return counts.total;
    if (key === 'available') return counts.available;
    if (key === 'partial') return counts.partial;
    if (key === 'purchased') return counts.purchased;
    return 0;
  };

  return (
    <DashboardLayout currentPage="registry">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-1">Gift Registry</h1>
            <p className="text-sm text-text-secondary">
              Paste any product URL to import items from any store · prices auto-refresh weekly
            </p>
            <div className="mt-2 inline-flex items-center gap-2 text-[11px] text-text-tertiary">
              <span className="px-2 py-0.5 rounded-full border border-border-subtle bg-surface-subtle">
                {autoRefreshEnabled ? (refreshWindowOpen ? 'Auto-refresh on' : 'Refresh window closed') : 'Auto-refresh paused'}
              </span>
              <span>Budget {monthlyRefreshCount}/{monthlyRefreshCap}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
Import a list of links
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { void handleRepairBadImports(); setRegistryActionsOpen(false); }} disabled={repairingBadImports}>
                {repairingBadImports ? 'Cleaning up imported gifts…' : 'Clean up imported gifts'}
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { void handleAutoRefreshStale(false); setRegistryActionsOpen(false); }} disabled={!weddingSiteId || autoRefreshing || !refreshWindowOpen || refreshBudgetRemaining <= 0}>
                {autoRefreshing ? 'Refreshing…' : 'Refresh weekly stale metadata'}
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { void handleAutoRefreshStale(false, true); setRegistryActionsOpen(false); }} disabled={!weddingSiteId || autoRefreshing || !refreshWindowOpen || refreshBudgetRemaining <= 0}>
                {autoRefreshing ? 'Refreshing…' : 'Refresh alert items'}
              </Button>
            </ActionsMenu>
            <Button variant="primary" size="md" onClick={handleAddNew} disabled={!weddingSiteId}>
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Gift, bg: 'bg-primary-light', color: 'text-primary', val: counts.total, label: 'Total Items' },
            { icon: CheckCircle2, bg: 'bg-success-light', color: 'text-success', val: counts.purchased, label: 'Purchased' },
            { icon: Package, bg: 'bg-surface-subtle', color: 'text-text-secondary', val: counts.available + counts.partial, label: 'Remaining' },
            { icon: DollarSign, bg: 'bg-primary-light', color: 'text-primary', val: `$${counts.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, label: 'Est. Value' },
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
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Fulfillment rate</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{fulfillmentRate}%</p>
            <p className="mt-1 text-xs text-text-secondary">Purchased items out of total registry items</p>
          </Card>
          <Card variant="bordered" padding="md">
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Cash funds</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{fundStats.count}</p>
            <p className="mt-1 text-xs text-text-secondary">Fund-based registry entries live</p>
          </Card>
          <Card variant="bordered" padding="md">
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Fund progress</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">${fundStats.received.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
            <p className="mt-1 text-xs text-text-secondary">Received toward ${fundStats.goal.toLocaleString('en-US', { maximumFractionDigits: 0 })} goal</p>
          </Card>
          <Card variant="bordered" padding="md">
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Alert load</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{alertCounts.stale + alertCounts.priceChanged + alertCounts.outOfStock}</p>
            <p className="mt-1 text-xs text-text-secondary">Items needing freshness or availability review</p>
          </Card>
        </div>

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
                    <div className="mt-2 h-2 rounded-full bg-surface-subtle overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
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
                  <p className="mt-1 text-xs text-text-secondary">Updated {new Date(item.updated_at ?? item.created_at ?? Date.now()).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="bordered" padding="lg">
            <p className="text-sm font-semibold text-text-primary">Registry analytics notes</p>
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
                      ? 'bg-surface text-text-primary shadow-sm'
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
              className={`px-2.5 py-1 rounded-full border text-xs font-medium ${showAlertsOnly ? 'border-warning/40 bg-warning/10 text-warning' : 'border-border text-text-tertiary'}`}
            >
              {showAlertsOnly ? 'Showing alerts only' : 'Show alerts only'}
            </button>
            <button
              onClick={() => setShowImageIssuesOnly((v) => !v)}
              className={`px-2.5 py-1 rounded-full border text-xs font-medium ${showImageIssuesOnly ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-border text-text-tertiary'}`}
            >
              {showImageIssuesOnly ? 'Showing image issues' : 'Show image issues'}
            </button>
            {showImageIssuesOnly && (
              <>
                <button
                  onClick={() => void handleRefreshImageIssues()}
                  disabled={imageRefreshBusy}
                  className="px-2 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-700 text-xs font-medium disabled:opacity-60"
                >
                  {imageRefreshBusy ? 'Refreshing…' : 'Fix image issues now'}
                </button>
                <button
                  onClick={() => setShowImageIssuesOnly(false)}
                  className="px-2 py-1 rounded-full border border-border text-text-tertiary"
                >
                  Clear
                </button>
              </>
            )}
            <span className="px-2 py-1 rounded-full border border-border text-text-tertiary text-xs font-medium">
              Alerts: {alertCounts.stale + alertCounts.priceChanged + alertCounts.outOfStock}
            </span>
            <span className="px-2 py-1 rounded-full border border-border text-text-tertiary text-xs font-medium">
              Image issues: {alertCounts.imageIssues}
            </span>
            <span className="px-2 py-1 rounded-full border border-border text-text-tertiary text-xs font-medium">
              Imported gifts to fix: {actionableBadImportCount}
            </span>
            <span className="px-2 py-1 rounded-full border border-border text-text-tertiary text-xs font-medium">
              Repair states: {normalizedItems.filter((item) => getRegistryRepairStates(item).length > 0).length}
            </span>
            <span className="px-2 py-1 rounded-full border border-border text-text-tertiary text-xs font-medium">
              Duplicate groups: {duplicateGroups.length}
            </span>
            {actionableBadImportCount > 0 && (
              <button
                onClick={() => void handleRepairBadImports()}
                disabled={repairingBadImports}
                className="px-2 py-1 rounded-full border border-warning/30 bg-warning/10 text-warning text-xs font-medium disabled:opacity-60"
              >
                {repairingBadImports ? 'Cleaning up…' : 'Clean up imported gifts'}
              </button>
            )}
            <span className={`px-2 py-1 rounded-full border ${nearBudgetCap ? 'border-warning/40 text-warning bg-warning/10' : 'border-border text-text-tertiary'}`}>
              Budget used: {Math.round(budgetUtilization * 100)}%
            </span>
          </div>

          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 p-4">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Bulk review · repair</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">{bulkReviewCounts.repair}</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 p-4">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Bulk review · duplicates</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">{bulkReviewCounts.duplicates}</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 p-4">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Bulk review · image issues</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">{bulkReviewCounts.imageIssues}</p>
            </div>
          </div>

          <div className="mb-3 rounded-xl border border-border-subtle bg-surface-subtle/20 p-4 text-xs text-text-secondary">
            Cleanup tools help repair weak imports and spot duplicates, but they do not silently merge or delete items for you. Review anything important before making public changes.
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {bulkReviewCounts.repair > 0 && <button onClick={() => void handleRepairBadImports()} disabled={repairingBadImports} className="px-3 py-1.5 rounded-lg border border-warning/30 bg-warning/10 text-warning text-xs font-medium disabled:opacity-60" title="Re-fetch weak imports without deleting items">{repairingBadImports ? 'Cleaning up…' : 'Run repair cleanup'}</button>}
            {bulkReviewCounts.imageIssues > 0 && <button onClick={() => void handleRefreshImageIssues()} disabled={imageRefreshBusy} className="px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 text-xs font-medium disabled:opacity-60">{imageRefreshBusy ? 'Refreshing…' : 'Refresh image issues'}</button>}
            {duplicateGroups.length > 0 && <button onClick={() => void handleCopyDuplicateReviewList()} className="px-3 py-1.5 rounded-lg border border-border text-text-secondary text-xs font-medium" title="Review duplicates manually before removing anything">Copy duplicate review list</button>}
          </div>

          {duplicateGroups.length > 0 && (
            <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning space-y-2">
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
              <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center">
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
          <div className="w-full max-w-2xl bg-surface rounded-2xl border border-border shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">Bulk import registry URLs</h3>
              <button className="text-text-tertiary hover:text-text-primary" onClick={() => setBulkImportOpen(false)}>Close</button>
            </div>
            <p className="text-sm text-text-secondary">Paste one URL per line (up to 30). We'll auto-fetch metadata and add items.</p>
            <p className="text-xs text-text-tertiary">If some URLs are skipped, you'll see invalid/fetch-failed examples so you can quickly fix and retry.</p>
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
                {bulkImportBusy ? 'Importing…' : 'Import URLs'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ToastList toasts={toasts} />
    </DashboardLayout>
  );
};
