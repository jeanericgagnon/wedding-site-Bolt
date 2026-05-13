import React, { useEffect, useRef, useState } from 'react';
import { Gift } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Button } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { logAppAction } from '../../lib/actionAudit';
import { customerSafeErrorMessage } from '../../lib/customerSafeError';
import { ageExceedsMs } from './registryItemTime';
import { getWeddingRefreshWindowDate, toValidDateOrNull } from './registryRefreshWindow';
import { RegistryDashboardRouteContent } from './registry/RegistryDashboardRouteContent';
import { RegistryItemForm } from './registry/RegistryItemForm';
import { buildRegistryDashboardDerivedState } from './registry/buildRegistryDashboardDerivedState';
import type { RegistryRepairActionKind, RegistryRepairQueueItem } from './registry/repairState';
import { getCurrentMonthKey, resolveRegistryRefreshBudgetState } from './registry/refreshBudget';
import { normalizeOwnerDashboardRegistryItem, useRegistryDashboardData } from './registry/useRegistryDashboardData';
import { useRegistryItemActions } from './registry/useRegistryItemActions';
import { useRegistryMaintenanceActions } from './registry/useRegistryMaintenanceActions';
import { useRegistryRefreshPolicyActions } from './registry/useRegistryRefreshPolicyActions';
import {
  updateRegistryRefreshBudget,
} from './registry/registryService';
import type { RegistryFilter, RegistryItem } from './registry/registryTypes';

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
    {toasts.map((toast) => (
      <div
        key={toast.id}
        className={`rounded-lg border bg-white px-4 py-3 text-sm font-medium text-text-primary ${
          toast.type === 'error' ? 'border-border-subtle' : 'border-success/20'
        }`}
      >
        {toast.message}
      </div>
    ))}
  </div>
);

const WEEKLY_REFRESH_MS = 1000 * 60 * 60 * 24 * 7;

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
  const [, setSavingRefreshPolicy] = useState(false);

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
    refreshWindowDraft,
    setItems,
    setMonthlyRefreshCap,
    setMonthlyRefreshCount,
    setMonthlyRefreshMonth,
    setPolicyUpdatedAt,
    setPolicyUpdatedBy,
    setRefreshCapDraft,
    setRefreshEnabledUntil,
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
  const registryActionsRef = useRef<HTMLDivElement>(null);

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
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 4000);
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
    const hasStale = normalizedItems.some((item) => !item.metadata_last_checked_at || ageExceedsMs(item.metadata_last_checked_at, WEEKLY_REFRESH_MS));
    if (!hasStale) return;
    void handleAutoRefreshStale(true);
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
    repairQueue,
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

  useRegistryRefreshPolicyActions({
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

  const handleDeleteById = async (id: string) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    await handleDelete(item.id);
  };

  const {
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

  async function handleRunRepairQueueAction(queueItem: RegistryRepairQueueItem, action: RegistryRepairActionKind) {
    if (action === 'refresh-details') {
      await handleRefetchMetadata(queueItem.item);
      return;
    }

    if (action === 'reimport-source') {
      await handleRefetchMetadata(queueItem.item, false, true);
      return;
    }

    handleEdit(queueItem.item);
  }

  return (
    <DashboardLayout currentPage="registry">
      <RegistryDashboardRouteContent
        actionableBadImportCount={actionableBadImportCount}
        alertCounts={alertCounts}
        autoRefreshEnabled={autoRefreshEnabled}
        autoRefreshing={autoRefreshing}
        bulkImportBusy={bulkImportBusy}
        bulkReviewCounts={bulkReviewCounts}
        budgetUtilization={budgetUtilization}
        counts={counts}
        duplicateGroups={duplicateGroups}
        editItem={editItem}
        filter={filter}
        filtered={filtered}
        fulfillmentRate={fulfillmentRate}
        fundStats={fundStats}
        handleAddNew={handleAddNew}
        handleAutoRefreshStale={handleAutoRefreshStale}
        handleBulkImport={handleBulkImport}
        handleCopyDuplicateReviewList={handleCopyDuplicateReviewList}
        handleDelete={handleDeleteById}
        handleEdit={handleEdit}
        handleMergeDuplicateGroup={handleMergeDuplicateGroup}
        handleMarkPurchased={handleMarkPurchased}
        handleRefetchMetadata={handleRefetchMetadata}
        handleRefreshImageIssues={handleRefreshImageIssues}
        handleRepairBadImports={handleRepairBadImports}
        imageRefreshBusy={imageRefreshBusy}
        items={items}
        loading={loading}
        monthlyRefreshCap={monthlyRefreshCap}
        monthlyRefreshCount={monthlyRefreshCount}
        mergingDuplicateGroupId={mergingDuplicateGroupId}
        nearBudgetCap={nearBudgetCap}
        normalizedItems={normalizedItems}
        recentActivity={recentActivity}
        repairQueue={repairQueue}
        refreshBudgetRemaining={refreshBudgetRemaining}
        refreshWindowOpen={refreshWindowOpen}
        registryActionsOpen={registryActionsOpen}
        registryActionsRef={registryActionsRef}
        registryInsights={registryInsights}
        registryLaunchReadiness={registryLaunchReadiness}
        registryThankYouPlan={registryThankYouPlan}
        repairingBadImports={repairingBadImports}
        handleRunRepairQueueAction={handleRunRepairQueueAction}
        search={search}
        setBulkImportOpen={setBulkImportOpen}
        setFilter={setFilter}
        setRegistryActionsOpen={setRegistryActionsOpen}
        setSearch={setSearch}
        setShowAlertsOnly={setShowAlertsOnly}
        setShowImageIssuesOnly={setShowImageIssuesOnly}
        showAlertsOnly={showAlertsOnly}
        showImageIssuesOnly={showImageIssuesOnly}
        topRegistryItems={topRegistryItems}
        weddingSiteId={weddingSiteId}
      />

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
              onChange={(event) => setBulkUrls(event.target.value)}
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
