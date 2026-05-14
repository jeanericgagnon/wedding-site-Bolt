import { useCallback, useEffect, useState } from 'react';

import { demoRegistryItems, demoWeddingSite } from '../../../lib/demoData';
import type { RegistryThankYouLedger } from '../../../lib/registryLaunchReadiness';
import { getCurrentMonthKey, resolveRegistryRefreshBudgetState } from './refreshBudget';
import { loadRegistryThankYouLedger } from './registryThankYouLedger';
import { toDateInputValueOrEmpty } from '../registryRefreshWindow';
import { fetchRegistryItems, loadRegistryDashboardSite } from './registryService';
import type { RegistryItem } from './registryTypes';

function sanitizeRegistryQuantityState(quantityPurchased = 0, quantityNeeded = 1) {
  const safeNeeded = Math.max(1, Number.isFinite(quantityNeeded) ? quantityNeeded : 1);
  const safePurchased = Math.max(0, Number.isFinite(quantityPurchased) ? quantityPurchased : 0);
  const purchaseStatus = safePurchased >= safeNeeded ? 'purchased' : safePurchased > 0 ? 'partial' : 'available';
  return {
    quantityNeeded: safeNeeded,
    quantityPurchased: safePurchased,
    purchaseStatus,
  } as const;
}

export function normalizeOwnerDashboardRegistryItem(item: RegistryItem): RegistryItem {
  const quantityState = sanitizeRegistryQuantityState(item.quantity_purchased ?? 0, item.quantity_needed ?? 1);
  return {
    ...item,
    quantity_needed: quantityState.quantityNeeded,
    quantity_purchased: quantityState.quantityPurchased,
    purchase_status: quantityState.purchaseStatus,
    purchaser_name: quantityState.purchaseStatus === 'available' ? null : item.purchaser_name,
  };
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

interface UseRegistryDashboardDataArgs {
  isDemoMode: boolean;
  userId: string | undefined;
  toast: (message: string, type?: 'success' | 'error') => void;
}

export function useRegistryDashboardData(args: UseRegistryDashboardDataArgs) {
  const { isDemoMode, userId, toast } = args;
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
  const [refreshPreset, setRefreshPreset] = useState<'lean' | 'balanced' | 'aggressive'>('balanced');
  const [refreshIncludePurchased, setRefreshIncludePurchased] = useState(false);
  const [policyUpdatedAt, setPolicyUpdatedAt] = useState<string | null>(null);
  const [policyUpdatedBy, setPolicyUpdatedBy] = useState<string | null>(null);
  const [registryThankYouLedger, setRegistryThankYouLedger] = useState<RegistryThankYouLedger>({});

  const loadItems = useCallback(async (siteId: string) => {
    try {
      const data = await fetchRegistryItems(siteId);
      setItems(data.map(normalizeOwnerDashboardRegistryItem));
    } catch {
      toast('Couldn’t load registry items right now. Please try again.', 'error');
    }
  }, [toast]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        if (isDemoMode) {
          setWeddingSiteId(demoWeddingSite.id);
          setItems(demoRegistryItems.map(toDemoRegistryItem));
          setRegistryThankYouLedger({});
          return;
        }

        if (!userId) return;
        const site = await loadRegistryDashboardSite(userId);
        if (!site?.id) return;

        setWeddingSiteId(site.id);
        const budgetState = resolveRegistryRefreshBudgetState({
          storedMonthKey: site.registry_monthly_refresh_month ?? null,
          storedCount: site.registry_monthly_refresh_count ?? 0,
          currentMonthKey: getCurrentMonthKey(),
        });
        setMonthlyRefreshMonth(budgetState.monthKey);
        setWeddingDate(site.wedding_date ?? null);
        setRefreshEnabledUntil(site.registry_refresh_enabled_until ?? null);
        setAutoRefreshEnabled(site.registry_auto_refresh_enabled ?? true);
        setRefreshIncludePurchased(site.registry_refresh_include_purchased ?? false);
        setPolicyUpdatedAt(site.registry_refresh_policy_updated_at ?? null);
        setPolicyUpdatedBy(site.registry_refresh_policy_updated_by ?? null);
        setRefreshWindowDraft(toDateInputValueOrEmpty(site.registry_refresh_enabled_until));
        const loadedCap = site.registry_monthly_refresh_cap ?? 100;
        setMonthlyRefreshCap(loadedCap);
        setRefreshCapDraft(loadedCap);
        setRefreshPreset(loadedCap <= 60 ? 'lean' : loadedCap <= 160 ? 'balanced' : 'aggressive');
        setMonthlyRefreshCount(budgetState.count);
        const [_, ledger] = await Promise.all([
          loadItems(site.id),
          loadRegistryThankYouLedger(site.id),
        ]);
        setRegistryThankYouLedger(ledger);
      } catch {
        toast('Couldn’t finish setup right now. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, [isDemoMode, loadItems, toast, userId]);

  return {
    autoRefreshEnabled,
    items,
    loading,
    monthlyRefreshCap,
    monthlyRefreshCount,
    monthlyRefreshMonth,
    policyUpdatedAt,
    policyUpdatedBy,
    refreshCapDraft,
    refreshEnabledUntil,
    refreshIncludePurchased,
    refreshPreset,
    refreshWindowDraft,
    setAutoRefreshEnabled,
    setItems,
    setLoading,
    setMonthlyRefreshCap,
    setMonthlyRefreshCount,
    setMonthlyRefreshMonth,
    setPolicyUpdatedAt,
    setPolicyUpdatedBy,
    setRefreshCapDraft,
    setRefreshEnabledUntil,
    setRefreshIncludePurchased,
    setRefreshPreset,
    setRegistryThankYouLedger,
    setRefreshWindowDraft,
    weddingDate,
    weddingSiteId,
    loadItems,
    registryThankYouLedger,
  };
}
