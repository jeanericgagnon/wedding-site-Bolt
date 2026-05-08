import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '../../components/ui';
import {
  X, Sparkles
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getArchiveModeDescriptor } from '../../lib/archiveMode';
import { getVaultUnlockDate, toValidDateOrNull } from './vaultDate';
import { customerSafeErrorMessage } from '../../lib/customerSafeError';
import { readDemoVaultState, writeDemoVaultState } from '../vaultDemoStorage';
import { useVaultDashboardActions } from './useVaultDashboardActions';
import {
  checkVaultGoogleDriveHealth,
  ensureHostedVaultProvider as persistHostedVaultProvider,
  finishVaultGoogleDriveAuth,
  loadDemoVaultDashboardData,
  loadVaultDashboardData,
  resolveVaultEntryLink as resolveVaultEntryLinkFromService,
  startVaultGoogleDriveAuth,
  type VaultConfig,
  type VaultEntry,
} from './vaultService';
import { EditVaultModal } from './VaultEditModal';
import { VaultCard } from './VaultCard';
import { VaultDashboardRouteView } from './VaultDashboardRouteView';
import { VaultDashboardLiveContent } from './VaultDashboardLiveContent';

const MAX_VAULTS = 5;
const VAULT_RELEASE_NOTICE_KEY = 'dayof_vault_release_notified_v1';
const DEMO_WEDDING_DATE = '2026-02-23';

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
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [weddingDate, setWeddingDate] = useState<Date | null>(null);
  const [siteSlug, setSiteSlug] = useState<string | null>(null);
  const [vaultConfigs, setVaultConfigs] = useState<VaultConfig[]>([]);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFormConfigId, setActiveFormConfigId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<VaultConfig | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [vaultStorageProvider, setVaultStorageProvider] = useState<'supabase' | 'google_drive'>('supabase');
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [driveHealthChecking, setDriveHealthChecking] = useState(false);
  const [driveHealthMessage, setDriveHealthMessage] = useState<string | null>(null);
  const [driveNeedsReconnect, setDriveNeedsReconnect] = useState(false);
  const [coupleEmail, setCoupleEmail] = useState<string | null>(null);
  const [coupleName1, setCoupleName1] = useState<string>('Partner');
  const [coupleName2, setCoupleName2] = useState<string>('Partner');

  function toast(message: string, type: Toast['type'] = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  async function ensureHostedVaultProvider(siteId: string) {
    if (isDemoMode && siteId === 'demo-site-id') {
      setVaultStorageProvider('supabase');
      return;
    }

    await persistHostedVaultProvider(siteId);
    setVaultStorageProvider('supabase');
  }


  async function checkGoogleDriveHealth() {
    if (!weddingSiteId || (isDemoMode && weddingSiteId === 'demo-site-id')) return;
    setDriveHealthChecking(true);
    try {
      const result = await checkVaultGoogleDriveHealth(weddingSiteId);
      setDriveHealthMessage(result?.message ?? null);
      setDriveNeedsReconnect(!!result?.needsReconnect);
      setGoogleDriveConnected(!!result?.healthy && !result?.needsReconnect);
    } catch {
      setDriveHealthMessage('Drive backup is not connected right now. dayof hosted storage is active.');
      setGoogleDriveConnected(false);
      setDriveNeedsReconnect(true);
    } finally {
      setDriveHealthChecking(false);
    }
  }

  async function handleConnectGoogleDrive() {
    if (!weddingSiteId) return;

    if (isDemoMode && weddingSiteId === 'demo-site-id') {
      setGoogleDriveConnected(true);
      setVaultStorageProvider('supabase');
      toast('Demo: simulated Google Drive backup connection.');
      return;
    }

    setConnectingDrive(true);
    try {
      const authUrl = await startVaultGoogleDriveAuth(weddingSiteId);
      window.location.href = authUrl;
    } catch (err) {
      toast(safeVaultDashboardError(err, 'Couldn’t start the Google Drive connection right now.'), 'error');
    } finally {
      setConnectingDrive(false);
    }
  }


  function createSeedDemoState(): { vaultConfigs: VaultConfig[]; entries: VaultEntry[] } {
    const now = Date.now();
    const vaultConfigs: VaultConfig[] = [
      { id: 'demo-vault-1', vault_index: 1, label: '1-Year Anniversary Vault', duration_years: 1, is_enabled: true },
      { id: 'demo-vault-5', vault_index: 2, label: '5-Year Anniversary Vault', duration_years: 5, is_enabled: true },
      { id: 'demo-vault-10', vault_index: 3, label: '10-Year Anniversary Vault', duration_years: 10, is_enabled: true },
    ];

    const entries: VaultEntry[] = [
      {
        id: `demo-entry-${now}-1`,
        vault_config_id: 'demo-vault-1',
        vault_year: 1,
        title: 'A first-year note',
        content: 'Congrats on your first year! Keep choosing each other every day.',
        author_name: 'The Johnsons',
        attachment_url: null,
        attachment_name: null,
        media_type: 'text',
        created_at: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
      },
      {
        id: `demo-entry-${now}-2`,
        vault_config_id: 'demo-vault-5',
        vault_year: 5,
        title: 'For year five',
        content: 'Five years in, may your adventures be even bigger than your plans today.',
        author_name: 'College Crew',
        attachment_url: null,
        attachment_name: null,
        media_type: 'text',
        created_at: new Date(now - 1000 * 60 * 60 * 20).toISOString(),
      },
      {
        id: `demo-entry-${now}-3`,
        vault_config_id: 'demo-vault-10',
        vault_year: 10,
        title: 'A decade from now',
        content: 'When you open this, we hope you are still laughing at the same inside jokes.',
        author_name: 'Future You',
        attachment_url: null,
        attachment_name: null,
        media_type: 'text',
        created_at: new Date(now - 1000 * 60 * 45).toISOString(),
      },
    ];

    return { vaultConfigs, entries };
  }

  function loadDemoState(): { vaultConfigs: VaultConfig[]; entries: VaultEntry[] } {
    try {
      const seeded = createSeedDemoState();
      const stored = readDemoVaultState(seeded);
      const vaultConfigs = stored.vaultConfigs ?? [];
      const entries = stored.entries ?? [];

      if (vaultConfigs.length === 0) {
        saveDemoState(seeded.vaultConfigs, seeded.entries);
        return seeded;
      }

      return { vaultConfigs, entries };
    } catch {
      const seeded = createSeedDemoState();
      saveDemoState(seeded.vaultConfigs, seeded.entries);
      return seeded;
    }
  }

  function saveDemoState(nextConfigs: VaultConfig[], nextEntries: VaultEntry[]) {
    writeDemoVaultState(nextConfigs, nextEntries);
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemoMode) {
        setSiteSlug('alex-jordan-demo');

        const { site: demoSite, configs, entries } = await loadDemoVaultDashboardData('alex-jordan-demo');

        if (demoSite) {
          setWeddingSiteId(demoSite.id);
          setVaultStorageProvider('supabase');
          setGoogleDriveConnected(!!demoSite.vault_google_drive_connected);
          void ensureHostedVaultProvider(demoSite.id).catch(() => {
            toast('Couldn’t sync dayof as the active vault home right now.', 'error');
          });
          if (demoSite.wedding_date) setWeddingDate(toValidDateOrNull(demoSite.wedding_date));
          else setWeddingDate(toValidDateOrNull(DEMO_WEDDING_DATE));
          setVaultConfigs(configs);
          setEntries(entries);
          return;
        }

        setWeddingSiteId('demo-site-id');
        setVaultStorageProvider('supabase');
        setGoogleDriveConnected(false);
        setWeddingDate(toValidDateOrNull(DEMO_WEDDING_DATE));
        const demoState = loadDemoState();
        setVaultConfigs(demoState.vaultConfigs);
        setEntries(demoState.entries);
        return;
      }

      if (!user) {
        setWeddingSiteId(null);
        setVaultConfigs([]);
        setEntries([]);
        setGoogleDriveConnected(false);
        setDriveNeedsReconnect(false);
        return;
      }
      const { site, configs, entries } = await loadVaultDashboardData(user.id);

      if (!site) {
        setWeddingSiteId(null);
        setVaultConfigs([]);
        setEntries([]);
        setGoogleDriveConnected(false);
        setDriveNeedsReconnect(false);
        return;
      }
      setWeddingSiteId(site.id);
      setVaultStorageProvider('supabase');
      setGoogleDriveConnected(!!site.vault_google_drive_connected);
      void ensureHostedVaultProvider(site.id).catch(() => {
        toast('Couldn’t sync dayof as the active vault home right now.', 'error');
      });
      if (site.wedding_date) setWeddingDate(toValidDateOrNull(site.wedding_date));
      if (site.site_slug) setSiteSlug(site.site_slug);
      setCoupleName1(site.couple_name_1 || 'Partner');
      setCoupleName2(site.couple_name_2 || 'Partner');
      setCoupleEmail(user.email ?? null);
      setVaultConfigs(configs);
      setEntries(entries);
    } catch {
      setWeddingSiteId(null);
      setVaultConfigs([]);
      setEntries([]);
      setGoogleDriveConnected(false);
      setDriveNeedsReconnect(false);
      toast('Couldn’t load vault data right now. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, isDemoMode]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (googleDriveConnected) checkGoogleDriveHealth();
  }, [googleDriveConnected, weddingSiteId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    const googleCode = params.get('google_drive_code') || params.get('code');
    const googleState = params.get('state');

    if (oauthError) {
      toast('Google Drive connection was cancelled or failed. Please try again.', 'error');
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      url.searchParams.delete('state');
      window.history.replaceState({}, '', url.toString());
      return;
    }

    if (!googleCode || !googleState) return;

    finishVaultGoogleDriveAuth(googleCode, googleState).then((data) => {
      const url = new URL(window.location.href);
      url.searchParams.delete('google_drive_code');
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());

      const ok = (data as { success?: boolean } | null)?.success;
      if (!ok) {
        toast('Google Drive connection wasn’t finished. Please reconnect to continue.', 'error');
        return;
      }

      void (async () => {
        try {
          if (weddingSiteId) {
            await ensureHostedVaultProvider(weddingSiteId);
          }
          toast('Google Drive backup connected successfully.');
          setGoogleDriveConnected(true);
          setVaultStorageProvider('supabase');
          checkGoogleDriveHealth();
          loadData();
        } catch {
          toast('Google Drive connected, but dayof could not finish the vault backup setup. Please try reconnecting.', 'error');
        }
      })();
    }).catch(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete('google_drive_code');
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
      toast('Google Drive connection failed. Please try again.', 'error');
    });
  }, [loadData, weddingSiteId]);

  useEffect(() => {
    if (!weddingDate || vaultConfigs.length === 0) return;

    const notified = (() => {
      try {
        const raw = localStorage.getItem(VAULT_RELEASE_NOTICE_KEY);
        return raw ? JSON.parse(raw) as string[] : [];
      } catch {
        return [] as string[];
      }
    })();

    const newlyUnlocked = vaultConfigs.filter((cfg) => {
      const unlockDate = getVaultUnlockDate(weddingDate, cfg.duration_years);
      if (!unlockDate) return false;
      const key = `${cfg.id}:${unlockDate.toISOString().slice(0, 10)}`;
      return cfg.is_enabled && new Date() >= unlockDate && !notified.includes(key);
    });

    if (newlyUnlocked.length === 0) return;

    newlyUnlocked.forEach((cfg) => {
      toast(`Vault unlocked: ${cfg.label || `${cfg.duration_years}-Year Anniversary Vault`} ✨`);
    });

    const next = [...notified, ...newlyUnlocked.map((cfg) => {
      const unlockDate = getVaultUnlockDate(weddingDate, cfg.duration_years);
      if (!unlockDate) return null;
      return `${cfg.id}:${unlockDate.toISOString().slice(0, 10)}`;
    }).filter(Boolean) as string[]];

    localStorage.setItem(VAULT_RELEASE_NOTICE_KEY, JSON.stringify(Array.from(new Set(next))));
  }, [vaultConfigs, weddingDate]);

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
    <VaultDashboardRouteView loading={loading}>
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
