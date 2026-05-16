import React, { useState } from 'react';
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
        className={`px-4 py-3.5 rounded-lg text-sm sm:text-[15px] font-semibold border ${
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
  const [activeFormConfigId, setActiveFormConfigId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<VaultConfig | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  function toast(message: string, type: Toast['type'] = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

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
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-lg bg-surface border border-border-subtle text-text-secondary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-subtle"
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
