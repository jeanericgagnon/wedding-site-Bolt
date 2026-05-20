import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { toValidDateOrNull } from './vaultDate';
import { readDemoVaultState, writeDemoVaultState } from '../vaultDemoStorage';
import { buildVaultReleaseNoticeStorageKey, readVaultReleaseNoticeKeys, writeVaultReleaseNoticeKeys } from './vaultReleaseNoticeStorage';
import {
  checkVaultGoogleDriveHealth,
  ensureHostedVaultProvider as persistHostedVaultProvider,
  finishVaultGoogleDriveAuth,
  loadDemoVaultDashboardData,
  loadVaultDashboardData,
  startVaultGoogleDriveAuth,
  type VaultConfig,
  type VaultEntry,
} from './vaultService';

const VAULT_RELEASE_NOTICE_KEY = 'dayof_vault_release_notified_v1';
const DEMO_WEDDING_DATE = '2026-02-23';
const VAULT_DASHBOARD_LOAD_TIMEOUT_MS = 12000;

async function runVaultDashboardTimed<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: number | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error('Vault dashboard load timed out.')), timeoutMs);
  });

  try {
    return await Promise.race([task, timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

interface VaultDashboardDataArgs {
  isDemoMode: boolean;
  toast: (message: string, type?: 'success' | 'error') => void;
  user: { id: string; email?: string | null } | null;
}

export function useVaultDashboardData({ isDemoMode, toast, user }: VaultDashboardDataArgs) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toastRef = useRef(toast);
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [weddingDate, setWeddingDate] = useState<Date | null>(null);
  const [siteSlug, setSiteSlug] = useState<string | null>(null);
  const [vaultConfigs, setVaultConfigs] = useState<VaultConfig[]>([]);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [vaultStorageProvider, setVaultStorageProvider] = useState<'supabase' | 'google_drive'>('supabase');
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [driveHealthChecking, setDriveHealthChecking] = useState(false);
  const [driveHealthMessage, setDriveHealthMessage] = useState<string | null>(null);
  const [driveNeedsReconnect, setDriveNeedsReconnect] = useState(false);
  const [coupleEmail, setCoupleEmail] = useState<string | null>(null);
  const [coupleName1, setCoupleName1] = useState<string>('Partner');
  const [coupleName2, setCoupleName2] = useState<string>('Partner');
  const loadRequestIdRef = useRef(0);

  const resetVaultDashboardState = useCallback(() => {
    setSiteSlug(null);
    setWeddingSiteId(null);
    setWeddingDate(null);
    setVaultConfigs([]);
    setEntries([]);
    setVaultStorageProvider('supabase');
    setGoogleDriveConnected(false);
    setConnectingDrive(false);
    setDriveHealthChecking(false);
    setDriveHealthMessage(null);
    setDriveNeedsReconnect(false);
    setCoupleEmail(null);
    setCoupleName1('Partner');
    setCoupleName2('Partner');
  }, []);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const ensureHostedVaultProvider = useCallback(async (siteId: string) => {
    if (isDemoMode && siteId === 'demo-site-id') {
      setVaultStorageProvider('supabase');
      return;
    }

    await persistHostedVaultProvider(siteId);
    setVaultStorageProvider('supabase');
  }, [isDemoMode]);

  const createSeedDemoState = useCallback((): { vaultConfigs: VaultConfig[]; entries: VaultEntry[] } => {
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
  }, []);

  const saveDemoState = useCallback((nextConfigs: VaultConfig[], nextEntries: VaultEntry[]) => {
    writeDemoVaultState(nextConfigs, nextEntries);
  }, []);

  const loadDemoState = useCallback((): { vaultConfigs: VaultConfig[]; entries: VaultEntry[] } => {
    try {
      const seeded = createSeedDemoState();
      const stored = readDemoVaultState(seeded);
      const nextConfigs = stored.vaultConfigs ?? [];
      const nextEntries = stored.entries ?? [];

      if (nextConfigs.length === 0) {
        saveDemoState(seeded.vaultConfigs, seeded.entries);
        return seeded;
      }

      return { vaultConfigs: nextConfigs, entries: nextEntries };
    } catch {
      const seeded = createSeedDemoState();
      saveDemoState(seeded.vaultConfigs, seeded.entries);
      return seeded;
    }
  }, [createSeedDemoState, saveDemoState]);

  const checkGoogleDriveHealth = useCallback(async () => {
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
  }, [isDemoMode, weddingSiteId]);

  const loadData = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    const isCurrentLoad = () => requestId === loadRequestIdRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      if (isDemoMode) {
        setSiteSlug('alex-jordan-demo');

        const { site: demoSite, configs, entries: demoEntries } = await loadDemoVaultDashboardData('alex-jordan-demo');
        if (!isCurrentLoad()) return;

        if (demoSite) {
          setWeddingSiteId(demoSite.id);
          setVaultStorageProvider('supabase');
          setGoogleDriveConnected(!!demoSite.vault_google_drive_connected);
          setConnectingDrive(false);
          setDriveHealthChecking(false);
          setDriveHealthMessage(null);
          setDriveNeedsReconnect(false);
          setCoupleEmail(null);
          setCoupleName1(demoSite.couple_name_1 || 'Partner');
          setCoupleName2(demoSite.couple_name_2 || 'Partner');
          void ensureHostedVaultProvider(demoSite.id).catch(() => {
            if (isCurrentLoad()) toastRef.current('Couldn’t sync dayof as the active vault home right now.', 'error');
          });
          if (demoSite.wedding_date) setWeddingDate(toValidDateOrNull(demoSite.wedding_date));
          else setWeddingDate(toValidDateOrNull(DEMO_WEDDING_DATE));
          setVaultConfigs(configs);
          setEntries(demoEntries);
          return;
        }

        setWeddingSiteId('demo-site-id');
        setVaultStorageProvider('supabase');
        setGoogleDriveConnected(false);
        setConnectingDrive(false);
        setDriveHealthChecking(false);
        setDriveHealthMessage(null);
        setDriveNeedsReconnect(false);
        setCoupleEmail(null);
        setCoupleName1('Alex');
        setCoupleName2('Jordan');
        setWeddingDate(toValidDateOrNull(DEMO_WEDDING_DATE));
        const demoState = loadDemoState();
        setVaultConfigs(demoState.vaultConfigs);
        setEntries(demoState.entries);
        return;
      }

      if (!userId) {
        resetVaultDashboardState();
        return;
      }

      const { site, configs, entries: loadedEntries } = await runVaultDashboardTimed(
        loadVaultDashboardData(userId),
        VAULT_DASHBOARD_LOAD_TIMEOUT_MS,
      );
      if (!isCurrentLoad()) return;

      if (!site) {
        resetVaultDashboardState();
        return;
      }

      setWeddingSiteId(site.id);
      setVaultStorageProvider('supabase');
      setGoogleDriveConnected(!!site.vault_google_drive_connected);
      setConnectingDrive(false);
      setDriveHealthChecking(false);
      setDriveHealthMessage(null);
      setDriveNeedsReconnect(false);
      void ensureHostedVaultProvider(site.id).catch(() => {
        if (isCurrentLoad()) toastRef.current('Couldn’t sync dayof as the active vault home right now.', 'error');
      });
      setWeddingDate(toValidDateOrNull(site.wedding_date ?? null));
      setSiteSlug(site.site_slug ?? null);
      setCoupleName1(site.couple_name_1 || 'Partner');
      setCoupleName2(site.couple_name_2 || 'Partner');
      setCoupleEmail(userEmail);
      setVaultConfigs(configs);
      setEntries(loadedEntries);
    } catch {
      if (!isCurrentLoad()) return;
      resetVaultDashboardState();
      setLoadError('Couldn’t load vaults right now. Try again in a moment.');
      toastRef.current('Couldn’t load vault data right now. Please try again.', 'error');
    } finally {
      if (isCurrentLoad()) setLoading(false);
    }
  }, [ensureHostedVaultProvider, isDemoMode, loadDemoState, resetVaultDashboardState, userEmail, userId]);

  const handleConnectGoogleDrive = useCallback(async () => {
    if (!weddingSiteId) return;

    if (isDemoMode && weddingSiteId === 'demo-site-id') {
      setGoogleDriveConnected(true);
      setVaultStorageProvider('supabase');
      toastRef.current('Demo: simulated Google Drive backup connection.');
      return;
    }

    setConnectingDrive(true);
    try {
      const authUrl = await startVaultGoogleDriveAuth(weddingSiteId);
      window.location.href = authUrl;
    } catch {
      toastRef.current('Couldn’t start the Google Drive connection right now.', 'error');
    } finally {
      setConnectingDrive(false);
    }
  }, [isDemoMode, weddingSiteId]);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    if (googleDriveConnected) void checkGoogleDriveHealth();
  }, [checkGoogleDriveHealth, googleDriveConnected]);

  useEffect(() => {
    const oauthError = searchParams.get('error');
    const googleCode = searchParams.get('google_drive_code') || searchParams.get('code');
    const googleState = searchParams.get('state');
    const clearOAuthParams = () => {
      const url = new URLSearchParams(searchParams);
      url.delete('google_drive_code');
      url.delete('code');
      url.delete('state');
      url.delete('error');
      navigate(
        {
          pathname: location.pathname,
          search: url.toString() ? `?${url.toString()}` : '',
          hash: location.hash,
        },
        { replace: true },
      );
    };

    if (oauthError) {
      toastRef.current('Google Drive connection was cancelled or failed. Please try again.', 'error');
      clearOAuthParams();
      return;
    }

    if (!googleCode || !googleState) return;

    finishVaultGoogleDriveAuth(googleCode, googleState).then((data) => {
      clearOAuthParams();

      const ok = (data as { success?: boolean } | null)?.success;
      if (!ok) {
        toastRef.current('Google Drive connection wasn’t finished. Please reconnect to continue.', 'error');
        return;
      }

      void (async () => {
        try {
          if (weddingSiteId) {
            await ensureHostedVaultProvider(weddingSiteId);
          }
          toastRef.current('Google Drive backup connected successfully.');
          setGoogleDriveConnected(true);
          setVaultStorageProvider('supabase');
          await checkGoogleDriveHealth();
          await loadData();
        } catch {
          toastRef.current('Google Drive connected, but dayof could not finish the vault backup setup. Please try reconnecting.', 'error');
        }
      })();
    }).catch(() => {
      clearOAuthParams();
      toastRef.current('Google Drive connection failed. Please try again.', 'error');
    });
  }, [checkGoogleDriveHealth, ensureHostedVaultProvider, loadData, location.hash, location.pathname, navigate, searchParams, weddingSiteId]);

  useEffect(() => {
    if (!weddingDate || !weddingSiteId || vaultConfigs.length === 0) return;

    const storageKey = buildVaultReleaseNoticeStorageKey(VAULT_RELEASE_NOTICE_KEY, weddingSiteId);
    const notified = readVaultReleaseNoticeKeys(storageKey);

    const newlyUnlocked = vaultConfigs.filter((config) => {
      const unlockDate = new Date(weddingDate);
      unlockDate.setFullYear(unlockDate.getFullYear() + config.duration_years);
      const key = `${config.id}:${unlockDate.toISOString().slice(0, 10)}`;
      return config.is_enabled && new Date() >= unlockDate && !notified.includes(key);
    });

    if (newlyUnlocked.length === 0) return;

    newlyUnlocked.forEach((config) => {
      toastRef.current(`Vault unlocked: ${config.label || `${config.duration_years}-Year Anniversary Vault`} ✨`);
    });

    const next = [...notified, ...newlyUnlocked.map((config) => {
      const unlockDate = new Date(weddingDate);
      unlockDate.setFullYear(unlockDate.getFullYear() + config.duration_years);
      return `${config.id}:${unlockDate.toISOString().slice(0, 10)}`;
    })];

    writeVaultReleaseNoticeKeys(storageKey, Array.from(new Set(next)));
  }, [vaultConfigs, weddingDate, weddingSiteId]);

  return {
    checkGoogleDriveHealth,
    connectingDrive,
    coupleEmail,
    coupleName1,
    coupleName2,
    createSeedDemoState,
    driveHealthChecking,
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
    vaultStorageProvider,
    weddingDate,
    weddingSiteId,
  };
}
