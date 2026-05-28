import { getWeddingRefreshWindowDate, parseRefreshWindowEndIso } from '../registryRefreshWindow';
import { saveRegistryRefreshPolicy } from './registryService';
import { REGISTRY_REFRESH_POLICY_SAVE_RETRY_ERROR } from './registryDashboardErrorCopy';

interface UseRegistryRefreshPolicyActionsArgs {
  autoRefreshEnabled: boolean;
  isDemoMode: boolean;
  refreshCapDraft: number;
  refreshIncludePurchased: boolean;
  refreshWindowDraft: string;
  setMonthlyRefreshCap: React.Dispatch<React.SetStateAction<number>>;
  setMonthlyRefreshCount: React.Dispatch<React.SetStateAction<number>>;
  setMonthlyRefreshMonth: React.Dispatch<React.SetStateAction<string | null>>;
  setPolicyUpdatedAt: React.Dispatch<React.SetStateAction<string | null>>;
  setPolicyUpdatedBy: React.Dispatch<React.SetStateAction<string | null>>;
  setRefreshCapDraft: React.Dispatch<React.SetStateAction<number>>;
  setRefreshEnabledUntil: React.Dispatch<React.SetStateAction<string | null>>;
  setRefreshPreset: React.Dispatch<React.SetStateAction<'lean' | 'balanced' | 'aggressive'>>;
  setRefreshWindowDraft: React.Dispatch<React.SetStateAction<string>>;
  setSavingRefreshPolicy: React.Dispatch<React.SetStateAction<boolean>>;
  toast: (message: string, type?: 'success' | 'error') => void;
  safeRegistryDashboardError: (err: unknown, fallback: string) => string;
  logRegistryAction: (type: string, summary: string, metadata?: Record<string, unknown>, targetId?: string | null, targetLabel?: string | null) => void;
  userId: string | undefined;
  weddingDate: string | null;
  weddingSiteId: string | null;
}

export function useRegistryRefreshPolicyActions(args: UseRegistryRefreshPolicyActionsArgs) {
  const {
    autoRefreshEnabled,
    isDemoMode,
    refreshCapDraft,
    refreshIncludePurchased,
    refreshWindowDraft,
    setMonthlyRefreshCap,
    setMonthlyRefreshCount,
    setMonthlyRefreshMonth,
    setPolicyUpdatedAt,
    setPolicyUpdatedBy,
    setRefreshCapDraft,
    setRefreshEnabledUntil,
    setRefreshPreset,
    setRefreshWindowDraft,
    setSavingRefreshPolicy,
    toast,
    safeRegistryDashboardError,
    logRegistryAction,
    userId,
    weddingDate,
    weddingSiteId,
  } = args;

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
        registry_refresh_policy_updated_by: userId ?? null,
      });

      setMonthlyRefreshCap(cap);
      setRefreshEnabledUntil(untilIso);
      setPolicyUpdatedAt(updatedAt);
      setPolicyUpdatedBy(userId ?? null);
      logRegistryAction('registry_refresh_policy_saved', 'Registry refresh policy was updated.', {
        monthlyRefreshCap: cap,
        refreshEnabledUntil: untilIso,
        autoRefreshEnabled,
        refreshIncludePurchased,
      }, weddingSiteId, 'Registry refresh policy');
      toast('Refresh policy saved.');
    } catch (err) {
      toast(safeRegistryDashboardError(err, REGISTRY_REFRESH_POLICY_SAVE_RETRY_ERROR), 'error');
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
      registry_refresh_policy_updated_by: userId ?? null,
    });
    setMonthlyRefreshCount(0);
    setMonthlyRefreshMonth(monthKey);
    setPolicyUpdatedAt(updatedAt);
    setPolicyUpdatedBy(userId ?? null);
    logRegistryAction('registry_refresh_counter_reset', 'Registry monthly refresh counter was reset.', { monthKey }, weddingSiteId, 'Registry refresh policy');
    toast('Monthly refresh counter reset.');
  }

  return {
    applyRefreshPreset,
    handleResetMonthlyBudgetCounter,
    handleSaveRefreshPolicy,
    setDefaultRefreshWindowFromWedding,
  };
}
