import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui';
import { X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getArchiveModeDescriptor } from '../../lib/archiveMode';
import { customerSafeErrorMessage } from '../../lib/customerSafeError';
import { useVaultDashboardActions } from './useVaultDashboardActions';
import {
  resolveVaultEntryLink as resolveVaultEntryLinkFromService,
  type VaultConfig,
} from './vaultService';
import { EditVaultModal } from './VaultEditModal';
import { VaultCard } from './VaultCard';
import { VaultDashboardRouteView } from './VaultDashboardRouteView';
import { VaultDashboardLiveContent } from './VaultDashboardLiveContent';
import { useVaultDashboardData } from './useVaultDashboardData';

function safeVaultDashboardError(err: unknown, fallback: string): string {
  return customerSafeErrorMessage(err, fallback);
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

const ToastList: React.FC<{ toasts: Toast[] }> = ({ toasts }) => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] space-y-2 pointer-events-none w-[min(92vw,680px)]">
    {toasts.map(t => (
      <div
        key={t.id}
        className={`rounded-[20px] border px-4 py-3.5 text-sm font-semibold shadow-none sm:text-[15px] ${
          t.type === 'error'
            ? 'bg-surface text-text-primary border-border-subtle'
            : 'bg-surface text-text-primary border-border-subtle'
        }`}
      >
        {t.message}
      </div>
    ))}
  </div>
);

export const DashboardVault: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeFormConfigId, setActiveFormConfigId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<VaultConfig | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimeoutsRef = useRef<number[]>([]);
  const previousWeddingSiteIdRef = useRef<string | null>(null);

  useEffect(() => () => {
    toastTimeoutsRef.current.forEach((timer) => window.clearTimeout(timer));
    toastTimeoutsRef.current = [];
  }, []);

  function toast(message: string, type: Toast['type'] = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    const timer = window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      toastTimeoutsRef.current = toastTimeoutsRef.current.filter((entry) => entry !== timer);
    }, 4000);
    toastTimeoutsRef.current.push(timer);
  }

  const resetVaultDashboardInteractionState = useCallback(() => {
    setActiveFormConfigId(null);
    setEditingConfig(null);
  }, []);

  const {
    connectingDrive,
    coupleEmail,
    coupleName1,
    coupleName2,
    createSeedDemoState,
    driveHealthMessage,
    driveNeedsReconnect,
    entries,
    loadError,
    googleDriveConnected,
    handleConnectGoogleDrive,
    loadData,
    loading,
    saveDemoState,
    setEntries,
    setVaultConfigs,
    siteSlug,
    vaultConfigs,
    weddingDate,
    weddingSiteId,
  } = useVaultDashboardData({
    isDemoMode,
    toast,
    user,
  });

  const {
    addingVault,
    handleAddVault,
    handleDeleteEntry,
    handleDeleteVault,
    handleEditSave,
    handleSaveEntry,
    handleSeedStarterVaults,
    handleSendAnniversaryReminder,
    handleToggleEnabled,
    sendingReminderFor,
  } = useVaultDashboardActions({
    coupleEmail,
    coupleName1,
    coupleName2,
    createSeedDemoState,
    entries,
    isDemoMode,
    loadData,
    safeVaultDashboardError,
    saveDemoState,
    setActiveFormConfigId,
    setEntries,
    setVaultConfigs,
    siteSlug,
    toast,
    vaultConfigs,
    weddingDate,
    weddingSiteId,
  });

  const totalEntries = entries.length;
  const orderedVaultConfigs = [...vaultConfigs].sort((a, b) => a.duration_years - b.duration_years);
  const archiveMode = getArchiveModeDescriptor({ weddingDate: weddingDate ? weddingDate.toISOString() : null });
  const driveConnectedHealthy = googleDriveConnected && !driveNeedsReconnect;
  const showReconnectButton = !googleDriveConnected || driveNeedsReconnect;

  useEffect(() => {
    if (
      previousWeddingSiteIdRef.current &&
      weddingSiteId &&
      previousWeddingSiteIdRef.current !== weddingSiteId
    ) {
      resetVaultDashboardInteractionState();
    }
    previousWeddingSiteIdRef.current = weddingSiteId;
  }, [resetVaultDashboardInteractionState, weddingSiteId]);

  useEffect(() => {
    if (!weddingSiteId && !isDemoMode) {
      resetVaultDashboardInteractionState();
    }
  }, [isDemoMode, resetVaultDashboardInteractionState, weddingSiteId]);

  useEffect(() => {
    if (searchParams.get('tool') !== 'anniversary-capsules') return;

    const consumeToolParam = () => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('tool');
      const nextSearch = nextParams.toString();
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch ? `?${nextSearch}` : '',
          hash: location.hash,
        },
        { replace: true },
      );
    };

    const scrollToTarget = () => {
      const target = document.getElementById('vault-anniversary-capsules');
      if (!target) return false;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      consumeToolParam();
      return true;
    };

    if (scrollToTarget()) return;
    const timeout = window.setTimeout(scrollToTarget, 50);
    return () => window.clearTimeout(timeout);
  }, [location.hash, location.pathname, navigate, searchParams]);

  return (
    <VaultDashboardRouteView error={loadError} loading={loading}>
      <VaultDashboardLiveContent
        addingVault={addingVault}
        archiveModeIsArchiveLike={archiveMode.isArchiveLike}
        connectingDrive={connectingDrive}
        driveConnectedHealthy={driveConnectedHealthy}
        driveHealthMessage={driveHealthMessage}
        googleDriveConnected={googleDriveConnected}
        handleAddVault={handleAddVault}
        handleConnectGoogleDrive={handleConnectGoogleDrive}
        handleSeedStarterVaults={handleSeedStarterVaults}
        isDemoMode={isDemoMode}
        listContent={vaultConfigs.length > 0 ? (
          <div className="space-y-5">
            {orderedVaultConfigs.map(config => (
              <div key={config.id} className="group relative">
                <VaultCard
                  config={config}
                  entries={entries.filter(e => e.vault_config_id === config.id)}
                  weddingDate={weddingDate}
                  siteSlug={siteSlug}
                  showForm={activeFormConfigId === config.id}
                  onAddEntry={id => setActiveFormConfigId(id)}
                  onDeleteEntry={handleDeleteEntry}
                  onSaveEntry={handleSaveEntry}
                  onCancelForm={() => setActiveFormConfigId(null)}
                  onToggleEnabled={handleToggleEnabled}
                  onEdit={c => setEditingConfig(c)}
                  onError={(message) => toast(message, 'error')}
                  resolveVaultEntryLink={resolveVaultEntryLinkFromService}
                  safeVaultDashboardError={safeVaultDashboardError}
                />
                <div className="mt-2 flex flex-wrap gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleSendAnniversaryReminder(config, 'upcoming')}
                    disabled={sendingReminderFor === config.id}
                  >
                    {sendingReminderFor === config.id ? 'Sending…' : 'Send upcoming reminder'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleSendAnniversaryReminder(config, 'unlock')}
                    disabled={sendingReminderFor === config.id}
                  >
                    Send unlock email
                  </Button>
                </div>
                <button
                  onClick={() => handleDeleteVault(config.id)}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-xl border border-border-subtle bg-surface text-text-secondary opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-subtle"
                  title="Remove this vault"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        showReconnectButton={showReconnectButton}
        totalEntries={totalEntries}
        vaultConfigsLength={vaultConfigs.length}
        weddingDate={weddingDate}
      />

      {editingConfig && (
        <EditVaultModal
          config={editingConfig}
          hasEntries={entries.some(e => e.vault_config_id === editingConfig.id)}
          onSave={handleEditSave}
          onClose={() => setEditingConfig(null)}
        />
      )}

      <ToastList toasts={toasts} />
    </VaultDashboardRouteView>
  );
};
