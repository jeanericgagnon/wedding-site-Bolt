import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import type { RegistryThankYouLedger } from '../../../lib/registryLaunchReadiness';
import { getCurrentMonthKey, resolveRegistryRefreshBudgetState } from './refreshBudget';
import { readDemoRegistryState, writeDemoRegistryState } from './registryDemoStorage';
import { loadRegistryThankYouLedger } from './registryThankYouLedger';
import { toDateInputValueOrEmpty } from '../registryRefreshWindow';
import { fetchRegistryItems, loadRegistryDashboardSite } from './registryService';
import type { RegistryItem } from './registryTypes';
import { demoWeddingSite } from '../../../lib/demoData';

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

interface UseRegistryDashboardDataArgs {
  isDemoMode: boolean;
  userId: string | undefined;
  toast: (message: string, type?: 'success' | 'error') => void;
}

export function useRegistryDashboardData(args: UseRegistryDashboardDataArgs) {
  const { isDemoMode, userId, toast } = args;
  const [itemsState, setItemsState] = useState<RegistryItem[]>([]);
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
  const [registryThankYouLedgerState, setRegistryThankYouLedgerState] = useState<RegistryThankYouLedger>({});

  const setItems: Dispatch<SetStateAction<RegistryItem[]>> = useCallback((value) => {
    setItemsState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      if (isDemoMode) {
        writeDemoRegistryState({
          items: next.map(normalizeOwnerDashboardRegistryItem),
          thankYouLedger: registryThankYouLedgerState,
        });
      }
      return next;
    });
  }, [isDemoMode, registryThankYouLedgerState]);

  const setRegistryThankYouLedger: Dispatch<SetStateAction<RegistryThankYouLedger>> = useCallback((value) => {
    setRegistryThankYouLedgerState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      if (isDemoMode) {
        writeDemoRegistryState({
          items: itemsState.map(normalizeOwnerDashboardRegistryItem),
          thankYouLedger: next,
        });
      }
      return next;
    });
  }, [isDemoMode, itemsState]);

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
          const demoState = readDemoRegistryState();
          setWeddingSiteId(demoWeddingSite.id);
          setItemsState(demoState.items.map(normalizeOwnerDashboardRegistryItem));
          setRegistryThankYouLedgerState(demoState.thankYouLedger);
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
    items: itemsState,
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
    registryThankYouLedger: registryThankYouLedgerState,
  };
}
