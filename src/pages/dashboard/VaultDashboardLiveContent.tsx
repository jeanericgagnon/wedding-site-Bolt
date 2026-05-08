import React, { type ReactNode } from 'react';
import { AlertCircle, GripVertical, Loader2, Lock, Plus } from 'lucide-react';
import { DashboardPageHero } from '../../components/dashboard/DashboardPageHero';
import { Button, Card } from '../../components/ui';
import { getArchiveModeDescriptor } from '../../lib/archiveMode';

type VaultDashboardLiveContentProps = {
  addingVault: boolean;
  archiveModeIsArchiveLike: boolean;
  connectingDrive: boolean;
  driveConnectedHealthy: boolean;
  driveHealthMessage: string | null;
  googleDriveConnected: boolean;
  handleAddVault: () => Promise<void>;
  handleConnectGoogleDrive: () => Promise<void>;
  handleSeedStarterVaults: () => Promise<void>;
  isDemoMode: boolean;
  listContent: ReactNode;
  showReconnectButton: boolean;
  totalEntries: number;
  vaultConfigsLength: number;
  weddingDate: Date | null;
};

const MAX_VAULTS = 5;

export function VaultDashboardLiveContent({
  addingVault,
  archiveModeIsArchiveLike,
  connectingDrive,
  driveConnectedHealthy,
  driveHealthMessage,
  googleDriveConnected,
  handleAddVault,
  handleConnectGoogleDrive,
  handleSeedStarterVaults,
  isDemoMode,
  listContent,
  showReconnectButton,
  totalEntries,
  vaultConfigsLength,
  weddingDate,
}: VaultDashboardLiveContentProps) {
  const archiveMode = getArchiveModeDescriptor({ weddingDate: weddingDate ? weddingDate.toISOString() : null });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <DashboardPageHero
        eyebrow="Private keepsakes"
        title="Anniversary vaults"
        description={`Seal notes, photos, and messages until future anniversaries. You can keep up to ${MAX_VAULTS} vaults and invite loved ones to contribute without making the page feel public.`}
        stats={[
          { label: 'Vaults', value: vaultConfigsLength, detail: vaultConfigsLength === 1 ? 'One anniversary set up' : 'Anniversary moments set up' },
          { label: 'Entries', value: totalEntries, detail: totalEntries === 1 ? 'One saved note or file' : 'Saved notes and files' },
          { label: 'Storage', value: 'dayof', detail: driveConnectedHealthy ? 'Drive backup connected' : 'Drive backup optional' },
        ]}
        actions={vaultConfigsLength < MAX_VAULTS ? (
          <Button
            variant="primary"
            size="md"
            onClick={handleAddVault}
            disabled={addingVault}
            className="w-full sm:w-auto shrink-0"
          >
            {addingVault ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
            Add vault
          </Button>
        ) : null}
      />

      <div className={`rounded-lg border px-4 py-3 text-sm ${archiveMode.isArchiveLike ? 'border-stone-200 bg-stone-50' : 'border-border-subtle bg-white'}`}>
        <p className="font-medium text-text-primary">{archiveMode.label}</p>
        <p className="mt-1 text-text-secondary">{archiveMode.detail}</p>
        {archiveMode.isArchiveLike && (
          <p className="mt-2 text-xs text-stone-700">The event is behind you, so this should start feeling like the center of gravity for memory, anniversary notes, and what the site becomes next.</p>
        )}
      </div>

      <Card variant="bordered" padding="md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-text-primary">Vault media</p>
              {isDemoMode && <span className="text-[10px] px-2 py-0.5 rounded-lg border border-border-subtle bg-surface-subtle text-text-secondary">Demo mode</span>}
            </div>
            <p className="text-xs text-text-secondary mt-1">dayof hosts vault media. Google Drive is an optional backup connection.</p>
            <div className="mt-3 flex items-center gap-2 text-[11px]">
              <span className="px-2 py-1 rounded-lg border border-border-subtle bg-surface-subtle text-text-secondary">
                Drive backup: {driveConnectedHealthy ? 'Connected' : 'Disconnected'}
              </span>
              <span className="px-2 py-1 rounded-lg border border-border text-text-tertiary">Hosted by dayof</span>
            </div>
            {isDemoMode && (
              <p className="text-xs text-text-secondary mt-2">Drive actions are simulated in demo mode.</p>
            )}
            {driveHealthMessage && (
              <p className="text-xs mt-2 text-text-secondary">
                {driveHealthMessage}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showReconnectButton ? (
              <Button variant="outline" size="sm" onClick={handleConnectGoogleDrive} disabled={connectingDrive}>
                {connectingDrive ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                {googleDriveConnected ? 'Reconnect Drive' : 'Connect Drive'}
              </Button>
            ) : (
              <span className="text-xs text-text-secondary">Drive connection is healthy.</span>
            )}
          </div>
        </div>
      </Card>

      {!weddingDate && (
        <div className="flex items-start gap-3 p-4 bg-surface-subtle border border-border-subtle rounded-lg text-sm text-text-secondary">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">No wedding date set</p>
            <p className="mt-0.5 text-text-secondary">Set your wedding date in Settings. Vault entries stay locked until an unlock date can be calculated.</p>
          </div>
        </div>
      )}

      {archiveModeIsArchiveLike && (
        <Card variant="bordered" padding="md">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">Anniversary note ideas</p>
              <p className="mt-1 text-sm text-text-secondary">Once the wedding is behind you, vaults should feel like a living archive: add a note now, collect a few from guests, and let future anniversaries unlock naturally.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-3 py-3">
                <p className="text-xs font-medium text-text-tertiary">Now</p>
                <p className="mt-1 text-sm text-text-secondary">Write the first note while the day is still fresh.</p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-3 py-3">
                <p className="text-xs font-medium text-text-tertiary">Next</p>
                <p className="mt-1 text-sm text-text-secondary">Share a vault link with the people who matter most, not everyone by default.</p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-3 py-3">
                <p className="text-xs font-medium text-text-tertiary">Later</p>
                <p className="mt-1 text-sm text-text-secondary">Let anniversaries bring these memories back without needing to remember every date yourself.</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {vaultConfigsLength === 0 && (
        <Card variant="bordered" padding="lg">
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-surface-subtle rounded-lg flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-text-tertiary" />
            </div>
            <h3 className="font-semibold text-text-primary mb-2">No anniversary vaults yet</h3>
            <p className="text-sm text-text-secondary mb-5 max-w-sm mx-auto">
              Create up to {MAX_VAULTS} anniversary vaults, each opening at a different milestone. Share the links with guests so they can leave something meaningful.
            </p>
            <Button variant="primary" onClick={handleSeedStarterVaults} disabled={addingVault}>
              {addingVault ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
              Create 1, 5, and 10 year vaults
            </Button>
            <p className="text-[11px] text-text-tertiary mt-2">Adds a simple set you can edit anytime.</p>
          </div>
        </Card>
      )}

      {listContent}

      {vaultConfigsLength > 0 && vaultConfigsLength < MAX_VAULTS && (
        <button
          onClick={() => void handleAddVault()}
          disabled={addingVault}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-text-secondary border-2 border-dashed border-border rounded-lg hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
        >
          {addingVault ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add another vault ({vaultConfigsLength}/{MAX_VAULTS} used)
        </button>
      )}

      {vaultConfigsLength >= MAX_VAULTS && (
        <div className="flex items-center gap-2 p-3 bg-surface-subtle rounded-lg border border-border text-sm text-text-secondary">
          <GripVertical className="w-4 h-4 text-text-tertiary" />
          Maximum of {MAX_VAULTS} vaults reached. Disable or remove an existing vault to add a new one.
        </div>
      )}

      <div className="p-5 bg-surface-subtle border border-border rounded-lg text-sm text-text-secondary">
        <p className="font-medium text-text-primary mb-1">How Vaults work</p>
        <p>Add messages yourself or share a vault link with guests so they can drop in a note. Each vault unlocks automatically on its anniversary date. You can enable or disable individual vaults, and customize how long each one stays sealed. Disabled vaults are hidden from guests but your entries are preserved.</p>
        {archiveMode.isArchiveLike && <p className="mt-2 text-xs text-text-tertiary">Best rhythm: start with one immediate note, one short guest-facing vault, and one later anniversary vault instead of overbuilding this all at once.</p>}
      </div>
    </div>
  );
}
