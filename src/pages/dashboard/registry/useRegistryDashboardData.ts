import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import type { RegistryThankYouLedger } from '../../../lib/registryLaunchReadiness';
import { getCurrentMonthKey, resolveRegistryRefreshBudgetState } from './refreshBudget';
import { readDemoRegistryState, writeDemoRegistryState } from './registryDemoStorage';
import { loadRegistryThankYouLedger } from './registryThankYouLedger';
import { toDateInputValueOrEmpty } from '../registryRefreshWindow';
import { fetchLatestRegistryImportBatch, fetchRecentRegistryImportBatches, fetchRegistryItems, loadRegistryDashboardSite, type RegistryImportBatchRecord } from './registryService';
import type { RegistryItem } from './registryTypes';
import { demoWeddingSite } from '../../../lib/demoData';

const REGISTRY_DASHBOARD_LOAD_TIMEOUT_MS = 12000;

async function runRegistryDashboardTimed<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: number | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error('Registry dashboard load timed out.')), timeoutMs);
  });

  try {
    return await Promise.race([task, timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [siteSlug, setSiteSlug] = useState<string | null>(null);
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
  const [latestImportBatch, setLatestImportBatch] = useState<RegistryImportBatchRecord | null>(null);
  const [recentImportBatches, setRecentImportBatches] = useState<RegistryImportBatchRecord[]>([]);
  const initRequestIdRef = useRef(0);

  const resetRegistryDashboardState = useCallback(() => {
    setWeddingSiteId(null);
    setSiteSlug(null);
    setWeddingDate(null);
    setRefreshEnabledUntil(null);
    setMonthlyRefreshCap(100);
    setAutoRefreshEnabled(true);
    setMonthlyRefreshCount(0);
    setMonthlyRefreshMonth(null);
    setRefreshCapDraft(100);
    setRefreshWindowDraft('');
    setRefreshPreset('balanced');
    setRefreshIncludePurchased(false);
    setPolicyUpdatedAt(null);
    setPolicyUpdatedBy(null);
    setItemsState([]);
    setRegistryThankYouLedgerState({});
    setLatestImportBatch(null);
    setRecentImportBatches([]);
  }, []);

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

  const loadItems = useCallback(async (siteId: string, shouldCancel?: () => boolean) => {
    try {
      const data = await fetchRegistryItems(siteId);
      if (shouldCancel?.()) return;
      setItems(data.map(normalizeOwnerDashboardRegistryItem));
    } catch {
      if (shouldCancel?.()) return;
      toast('Couldn’t load registry items right now. Please try again.', 'error');
      throw new Error('Registry items failed to load.');
    }
  }, [toast]);

  useEffect(() => {
    async function init() {
      const requestId = ++initRequestIdRef.current;
      const isCurrentInit = () => requestId === initRequestIdRef.current;
      setLoading(true);
      setLoadError(null);
      try {
        if (isDemoMode) {
          const demoState = readDemoRegistryState();
          setWeddingSiteId(demoWeddingSite.id);
          setSiteSlug(('site_slug' in demoWeddingSite
            ? (demoWeddingSite as { site_slug?: string | null }).site_slug
            : null) ?? null);
          setWeddingDate(demoWeddingSite.wedding_date);
          setRefreshEnabledUntil(null);
          setMonthlyRefreshCap(100);
          setAutoRefreshEnabled(true);
          setMonthlyRefreshCount(0);
          setMonthlyRefreshMonth(getCurrentMonthKey());
          setRefreshCapDraft(100);
          setRefreshWindowDraft('');
          setRefreshPreset('balanced');
          setRefreshIncludePurchased(false);
          setPolicyUpdatedAt(null);
          setPolicyUpdatedBy(null);
          setItemsState(demoState.items.map(normalizeOwnerDashboardRegistryItem));
          setRegistryThankYouLedgerState(demoState.thankYouLedger);
          setLatestImportBatch(null);
          setRecentImportBatches([]);
          return;
        }

        if (!userId) {
          resetRegistryDashboardState();
          return;
        }
        const site = await runRegistryDashboardTimed(
          loadRegistryDashboardSite(userId),
          REGISTRY_DASHBOARD_LOAD_TIMEOUT_MS,
        );
        if (!isCurrentInit()) return;
        if (!site?.id) {
          resetRegistryDashboardState();
          return;
        }

        setWeddingSiteId(site.id);
        setSiteSlug(site.site_slug ?? null);
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
        const [_, ledger, importBatch, importBatches] = await runRegistryDashboardTimed(
          Promise.all([
            loadItems(site.id, () => !isCurrentInit()),
            loadRegistryThankYouLedger(site.id),
            fetchLatestRegistryImportBatch(site.id),
            fetchRecentRegistryImportBatches(site.id),
          ]),
          REGISTRY_DASHBOARD_LOAD_TIMEOUT_MS,
        );
        if (!isCurrentInit()) return;
        setRegistryThankYouLedger(ledger);
        setLatestImportBatch(importBatch);
        setRecentImportBatches(importBatches);
      } catch {
        if (requestId !== initRequestIdRef.current) return;
        resetRegistryDashboardState();
        setLoadError('Couldn’t load registry right now. Try again in a moment.');
        toast('Couldn’t finish setup right now. Please try again.', 'error');
      } finally {
        if (requestId === initRequestIdRef.current) setLoading(false);
      }
    }

    void init();
  }, [isDemoMode, loadItems, resetRegistryDashboardState, toast, userId]);

  return {
    autoRefreshEnabled,
    items: itemsState,
    loadError,
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
    setLatestImportBatch,
    setRecentImportBatches,
    setRefreshWindowDraft,
    weddingDate,
    siteSlug,
    weddingSiteId,
    loadItems,
    registryThankYouLedger: registryThankYouLedgerState,
    latestImportBatch,
    recentImportBatches,
  };
}
