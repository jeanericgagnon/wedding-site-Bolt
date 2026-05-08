import { useState } from 'react';

import { sendAnniversaryReminder } from '../../lib/emailService';
import { formatVaultUnlockDate, getVaultUnlockDate } from './vaultDate';
import {
  createVaultConfig,
  createVaultEntry,
  deleteVaultConfigWithEntryRollback,
  deleteVaultEntry,
  seedStarterVaultConfigs,
  updateVaultConfig,
  updateVaultEnabled,
  type VaultConfig,
  type VaultEntry,
} from './vaultService';

interface UseVaultDashboardActionsInput {
  coupleEmail: string | null;
  coupleName1: string;
  coupleName2: string;
  createSeedDemoState: () => { vaultConfigs: VaultConfig[]; entries: VaultEntry[] };
  entries: VaultEntry[];
  isDemoMode: boolean;
  loadData: () => Promise<void>;
  safeVaultDashboardError: (err: unknown, fallback: string) => string;
  saveDemoState: (nextConfigs: VaultConfig[], nextEntries: VaultEntry[]) => void;
  setActiveFormConfigId: React.Dispatch<React.SetStateAction<string | null>>;
  setEntries: React.Dispatch<React.SetStateAction<VaultEntry[]>>;
  setVaultConfigs: React.Dispatch<React.SetStateAction<VaultConfig[]>>;
  siteSlug: string | null;
  toast: (message: string, type?: 'success' | 'error') => void;
  vaultConfigs: VaultConfig[];
  weddingDate: Date | null;
  weddingSiteId: string | null;
}

function defaultVaultLabel(index: number, years: number): string {
  const ordinals: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 5: '5th', 10: '10th', 15: '15th', 20: '20th', 25: '25th', 50: '50th' };
  const ordinal = ordinals[years] ?? `${years}th`;
  return `${ordinal} Anniversary Vault`;
}

function nextAvailableYears(existingYears: number[]): number {
  const options = [1, 2, 3, 5, 10, 15, 20, 25, 50];
  return options.find((years) => !existingYears.includes(years)) ?? (Math.max(...existingYears, 0) + 5);
}

export function useVaultDashboardActions({
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
}: UseVaultDashboardActionsInput) {
  const [addingVault, setAddingVault] = useState(false);
  const [sendingReminderFor, setSendingReminderFor] = useState<string | null>(null);

  function handleSeedDemoVaults() {
    if (!isDemoMode) return;
    const seeded = createSeedDemoState();
    setVaultConfigs(seeded.vaultConfigs);
    setEntries(seeded.entries);
    saveDemoState(seeded.vaultConfigs, seeded.entries);
    toast('Demo vault set loaded (1/5/10)');
  }

  async function handleSendAnniversaryReminder(config: VaultConfig, reminderKind: 'upcoming' | 'unlock' | 'nudge' = 'upcoming') {
    if (!coupleEmail) {
      toast('No couple email available for anniversary reminder.', 'error');
      return;
    }

    setSendingReminderFor(config.id);
    try {
      const unlockDate = getVaultUnlockDate(weddingDate, config.duration_years);
      const vaultUrl = siteSlug ? `${window.location.origin}/vault/${siteSlug}/${config.duration_years}` : null;

      await sendAnniversaryReminder({
        weddingSiteId,
        to: coupleEmail,
        coupleName1,
        coupleName2,
        vaultLabel: config.label || `${config.duration_years}-Year Anniversary Vault`,
        anniversaryYear: config.duration_years,
        unlockDate: unlockDate ? formatVaultUnlockDate(unlockDate, '') : null,
        vaultUrl,
        reminderKind,
      });

      toast(`Anniversary ${reminderKind} email sent.`);
    } catch (err) {
      toast(safeVaultDashboardError(err, 'Couldn’t send the anniversary reminder right now.'), 'error');
    } finally {
      setSendingReminderFor(null);
    }
  }

  async function handleAddVault() {
    if (!weddingSiteId || vaultConfigs.length >= 5 || addingVault) return;
    setAddingVault(true);
    try {
      if (isDemoMode) {
        const usedIndexes = vaultConfigs.map((config) => config.vault_index);
        const nextIndex = [1, 2, 3, 4, 5].find((index) => !usedIndexes.includes(index)) ?? (vaultConfigs.length + 1);
        const existingYears = vaultConfigs.map((config) => config.duration_years);
        const years = nextAvailableYears(existingYears);
        const demoConfig: VaultConfig = {
          id: `demo-vault-${Date.now()}`,
          vault_index: nextIndex,
          label: defaultVaultLabel(nextIndex, years),
          duration_years: years,
          is_enabled: true,
        };
        const nextConfigs = [...vaultConfigs, demoConfig];
        setVaultConfigs(nextConfigs);
        saveDemoState(nextConfigs, entries);
        toast('Vault added');
        return;
      }

      const usedIndexes = vaultConfigs.map((config) => config.vault_index);
      const nextIndex = [1, 2, 3, 4, 5].find((index) => !usedIndexes.includes(index)) ?? (vaultConfigs.length + 1);
      const existingYears = vaultConfigs.map((config) => config.duration_years);
      const years = nextAvailableYears(existingYears);
      const label = defaultVaultLabel(nextIndex, years);

      const created = await createVaultConfig({
        weddingSiteId,
        vaultIndex: nextIndex,
        label,
        durationYears: years,
      });
      setVaultConfigs((prev) => [...prev, created].sort((a, b) => a.duration_years - b.duration_years));
      toast('Vault added');
    } catch {
      toast('Couldn’t add that vault right now. Please try again.', 'error');
    } finally {
      setAddingVault(false);
    }
  }

  async function handleSeedStarterVaults() {
    if (isDemoMode && weddingSiteId === 'demo-site-id') {
      handleSeedDemoVaults();
      return;
    }
    if (!weddingSiteId || addingVault) return;

    setAddingVault(true);
    try {
      const configs = await seedStarterVaultConfigs(weddingSiteId);
      setVaultConfigs(configs);
      toast('Starter vault set loaded (1/5/10)');
      await loadData();
    } catch {
      toast('Couldn’t load starter vaults right now. Please try again.', 'error');
    } finally {
      setAddingVault(false);
    }
  }

  async function handleToggleEnabled(configId: string, enabled: boolean) {
    if (isDemoMode && weddingSiteId === 'demo-site-id') {
      const nextConfigs = vaultConfigs.map((config) => config.id === configId ? { ...config, is_enabled: enabled } : config);
      setVaultConfigs(nextConfigs);
      saveDemoState(nextConfigs, entries);
      toast(enabled ? 'Vault enabled' : 'Vault disabled');
      return;
    }
    try {
      await updateVaultEnabled(configId, enabled);
    } catch {
      toast('Couldn’t update this vault. Please try again.', 'error');
      return;
    }
    setVaultConfigs((prev) => prev.map((config) => config.id === configId ? { ...config, is_enabled: enabled } : config));
    toast(enabled ? 'Vault enabled' : 'Vault disabled');
  }

  async function handleEditSave(id: string, label: string, durationYears: number) {
    const current = vaultConfigs.find((config) => config.id === id);
    const hasEntriesForVault = entries.some((entry) => entry.vault_config_id === id);
    if (hasEntriesForVault && current && current.duration_years !== durationYears) {
      toast('This vault already has submissions, so you cannot change its anniversary year.', 'error');
      throw new Error('Anniversary year is locked after submissions start.');
    }

    const hasDuplicateYear = vaultConfigs.some((config) => config.id !== id && config.duration_years === durationYears);
    if (hasDuplicateYear) {
      toast(`You already have a ${durationYears}-year vault. Choose a different anniversary.`, 'error');
      throw new Error(`You already have a ${durationYears}-year vault.`);
    }

    if (isDemoMode && weddingSiteId === 'demo-site-id') {
      const nextConfigs = vaultConfigs
        .map((config) => config.id === id ? { ...config, label, duration_years: durationYears } : config)
        .sort((a, b) => a.duration_years - b.duration_years);
      setVaultConfigs(nextConfigs);
      saveDemoState(nextConfigs, entries);
      toast('Vault updated');
      return;
    }

    try {
      await updateVaultConfig({ id, label, durationYears });
    } catch (error) {
      if (error instanceof Error && (error.message?.toLowerCase().includes('duplicate') || error.message?.toLowerCase().includes('unique'))) {
        toast(`You already have a ${durationYears}-year vault.`, 'error');
        throw new Error('A vault for that anniversary already exists.');
      }
      throw new Error('Couldn’t update this vault. Please try again.');
    }

    setVaultConfigs((prev) => prev
      .map((config) => config.id === id ? { ...config, label, duration_years: durationYears } : config)
      .sort((a, b) => a.duration_years - b.duration_years));
    toast('Vault updated');
  }

  async function handleSaveEntry(entry: { vault_config_id: string; vault_year: number; title: string; content: string; author_name: string; attachment_url: string | null; attachment_name: string | null }) {
    if (!weddingSiteId) throw new Error('No wedding site found');

    if (isDemoMode && weddingSiteId === 'demo-site-id') {
      const demoEntry: VaultEntry = {
        id: `demo-entry-${Date.now()}`,
        vault_config_id: entry.vault_config_id,
        vault_year: entry.vault_year,
        title: entry.title,
        content: entry.content,
        author_name: entry.author_name,
        attachment_url: entry.attachment_url,
        attachment_name: entry.attachment_name,
        media_type: entry.attachment_url ? 'photo' : 'text',
        created_at: new Date().toISOString(),
      };
      const nextEntries = [...entries, demoEntry];
      setEntries(nextEntries);
      setActiveFormConfigId(null);
      saveDemoState(vaultConfigs, nextEntries);
      toast('Entry added to vault');
      return;
    }

    let created: VaultEntry;
    try {
      created = await createVaultEntry(weddingSiteId, entry);
    } catch {
      throw new Error('Couldn’t save this vault entry. Please try again.');
    }
    setEntries((prev) => [...prev, created]);
    setActiveFormConfigId(null);
    toast('Entry added to vault');
  }

  async function handleDeleteEntry(id: string) {
    if (isDemoMode && weddingSiteId === 'demo-site-id') {
      const nextEntries = entries.filter((entry) => entry.id !== id);
      setEntries(nextEntries);
      saveDemoState(vaultConfigs, nextEntries);
      toast('Entry removed');
      return;
    }
    try {
      await deleteVaultEntry(id);
    } catch {
      toast('Couldn’t remove that entry. Please try again.', 'error');
      return;
    }
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    toast('Entry removed');
  }

  async function handleDeleteVault(configId: string) {
    if (isDemoMode && weddingSiteId === 'demo-site-id') {
      const remaining = vaultConfigs.filter((config) => config.id !== configId).map((config, index) => ({ ...config, vault_index: index + 1 }));
      const nextEntries = entries.filter((entry) => entry.vault_config_id !== configId);
      setVaultConfigs(remaining);
      setEntries(nextEntries);
      saveDemoState(remaining, nextEntries);
      toast('Vault removed');
      return;
    }
    const deletedEntries = entries.filter((entry) => entry.vault_config_id === configId);
    try {
      await deleteVaultConfigWithEntryRollback(configId, deletedEntries);
    } catch {
      toast('Couldn’t remove this vault. Please try again.', 'error');
      return;
    }
    setVaultConfigs((prev) => {
      const remaining = prev.filter((config) => config.id !== configId);
      return remaining.map((config, index) => ({ ...config, vault_index: index + 1 }));
    });
    setEntries((prev) => prev.filter((entry) => entry.vault_config_id !== configId));
    toast('Vault removed');
  }

  return {
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
  };
}
