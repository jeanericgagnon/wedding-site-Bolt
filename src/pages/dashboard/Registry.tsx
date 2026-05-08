import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { DashboardPageHero } from '../../components/dashboard/DashboardPageHero';
import { DashboardStateBlock } from '../../components/dashboard/DashboardStateBlock';
import { Card, Button, ActionsMenu } from '../../components/ui';
import { Gift, Plus, CheckCircle2, DollarSign, Search, Package, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  saveRegistryRefreshPolicy,
  updateRegistryRefreshBudget,
} from './registry/registryService';
import { RegistryItemCard } from './registry/RegistryItemCard';
import { RegistryItemForm } from './registry/RegistryItemForm';
import type { RegistryItem, RegistryFilter, RegistryItemDraft } from './registry/registryTypes';
import { getRegistryRepairStates } from './registry/repairState';
import { getCurrentMonthKey, resolveRegistryRefreshBudgetState } from './registry/refreshBudget';
import { ageExceedsMs, formatRegistryItemDate } from './registryItemTime';
import { getWeddingRefreshWindowDate, toValidDateOrNull } from './registryRefreshWindow';
import { logAppAction } from '../../lib/actionAudit';
import { customerSafeErrorMessage } from '../../lib/customerSafeError';
import { normalizeOwnerDashboardRegistryItem, useRegistryDashboardData } from './registry/useRegistryDashboardData';
import { buildRegistryDashboardDerivedState } from './registry/buildRegistryDashboardDerivedState';
import { useRegistryItemActions } from './registry/useRegistryItemActions';
import { useRegistryMaintenanceActions } from './registry/useRegistryMaintenanceActions';
import { useRegistryRefreshPolicyActions } from './registry/useRegistryRefreshPolicyActions';

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

const FILTER_TABS: { key: RegistryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'purchased', label: 'Purchased' },
];

export const DashboardRegistry: React.FC = () => {
  const { isDemoMode, user } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RegistryFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<RegistryItem | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);
  const [showImageIssuesOnly, setShowImageIssuesOnly] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkUrls, setBulkUrls] = useState('');
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

  const {
    applyRefreshPreset,
    handleResetMonthlyBudgetCounter,
    handleSaveRefreshPolicy,
    setDefaultRefreshWindowFromWedding,
  } = useRegistryRefreshPolicyActions({
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
    userId: user?.id,
    weddingDate,
    weddingSiteId,
  });

  const {
    handleDelete,
    handleMarkPurchased,
    handleSave,
  } = useRegistryItemActions({
    editItem,
    isDemoMode,
    items,
    normalizeOwnerDashboardRegistryItem,
    setEditItem,
    setItems,
    setShowForm,
    toast,
    logRegistryAction,
    weddingSiteId,
  });

  const {
    autoRefreshing,
    bulkImportBusy,
    handleAutoRefreshStale,
    handleBulkImport,
    handleCopyDuplicateReviewList,
    handleRefetchMetadata,
    handleRefreshImageIssues,
    handleRepairBadImports,
    imageRefreshBusy,
    repairingBadImports,
  } = useRegistryMaintenanceActions({
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
              <Button variant="primary" size="sm" onClick={() => void handleBulkImport(bulkUrls)} disabled={bulkImportBusy}>
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
