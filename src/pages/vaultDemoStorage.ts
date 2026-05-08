import type { VaultConfig, VaultEntry } from './dashboard/vaultService';
import type { VaultContributionConfigInfo } from './vaultContributionService';

export const DEMO_VAULT_STORAGE_KEY = 'dayof_demo_vault_state_v1';
export const VAULT_SUBMITTED_KEY_PREFIX = 'vault_submitted_years_';
export const VAULT_DEMO_STORAGE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_DEMO_VAULT_CONFIGS = 12;
const MAX_DEMO_VAULT_ENTRIES = 200;
const MAX_VAULT_SUBMITTED_YEARS = 12;
const MAX_VAULT_TEXT_LENGTH = 2000;
const MAX_VAULT_SHORT_TEXT_LENGTH = 240;

export type DemoVaultState = {
  vaultConfigs: VaultConfig[];
  entries: VaultEntry[];
};

type VaultStorageEnvelope<T> = {
  savedAtISO: string;
  value: T;
};

export type DemoVaultEntryInput = {
  content: string;
  author_name: string;
  title: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  media_type: 'text' | 'photo' | 'video' | 'voice';
  mime_type?: string | null;
  size_bytes?: number | null;
};

function normalizeVaultText(value: unknown, maxLength = MAX_VAULT_TEXT_LENGTH): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeNullableVaultText(value: unknown, maxLength = MAX_VAULT_TEXT_LENGTH): string | null {
  const text = normalizeVaultText(value, maxLength);
  return text || null;
}

function normalizeVaultNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
  }
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

function isVaultStorageEnvelope<T = unknown>(value: unknown): value is VaultStorageEnvelope<T> {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Partial<VaultStorageEnvelope<T>>;
  return typeof envelope.savedAtISO === 'string' && 'value' in envelope;
}

function isFreshVaultStorage(savedAtISO: string): boolean {
  const savedAt = Date.parse(savedAtISO);
  return Number.isFinite(savedAt) && Date.now() - savedAt <= VAULT_DEMO_STORAGE_RETENTION_MS;
}

function readVaultStorageValue<T>(key: string, fallback: T): { value: T; shouldMigrate: boolean; hadStoredValue: boolean } {
  const raw = localStorage.getItem(key);
  if (!raw) return { value: fallback, shouldMigrate: false, hadStoredValue: false };

  const parsed = JSON.parse(raw) as unknown;
  if (isVaultStorageEnvelope<T>(parsed)) {
    if (!isFreshVaultStorage(parsed.savedAtISO)) {
      localStorage.removeItem(key);
      return { value: fallback, shouldMigrate: false, hadStoredValue: false };
    }
    return { value: parsed.value, shouldMigrate: false, hadStoredValue: true };
  }

  return { value: parsed as T, shouldMigrate: true, hadStoredValue: true };
}

function writeVaultStorageValue<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify({
    savedAtISO: new Date().toISOString(),
    value,
  } satisfies VaultStorageEnvelope<T>));
}

function normalizeVaultConfig(value: unknown, index: number): VaultConfig | null {
  if (!value || typeof value !== 'object') return null;
  const config = value as Partial<VaultConfig & VaultContributionConfigInfo>;
  const id = normalizeVaultText(config.id, MAX_VAULT_SHORT_TEXT_LENGTH);
  const label = normalizeVaultText(config.label, MAX_VAULT_SHORT_TEXT_LENGTH);
  const durationYears = normalizeVaultNumber(config.duration_years);
  if (!id || !label || durationYears <= 0) return null;

  return {
    id,
    vault_index: normalizeVaultNumber(config.vault_index, index + 1),
    label,
    duration_years: durationYears,
    is_enabled: config.is_enabled !== false,
  };
}

function normalizeVaultEntry(value: unknown): VaultEntry | null {
  if (!value || typeof value !== 'object') return null;
  const entry = value as Partial<VaultEntry> & { mime_type?: unknown; size_bytes?: unknown };
  const id = normalizeVaultText(entry.id, MAX_VAULT_SHORT_TEXT_LENGTH);
  const vaultYear = normalizeVaultNumber(entry.vault_year);
  const content = normalizeVaultText(entry.content);
  const authorName = normalizeVaultText(entry.author_name, MAX_VAULT_SHORT_TEXT_LENGTH);
  const createdAt = normalizeVaultText(entry.created_at, 40);
  if (!id || vaultYear <= 0 || !content || !authorName || !createdAt) return null;

  const mediaType = entry.media_type === 'photo' || entry.media_type === 'video' || entry.media_type === 'voice'
    ? entry.media_type
    : 'text';

  const normalized: VaultEntry = {
    id,
    vault_config_id: normalizeNullableVaultText(entry.vault_config_id, MAX_VAULT_SHORT_TEXT_LENGTH),
    vault_year: vaultYear,
    title: normalizeVaultText(entry.title, MAX_VAULT_SHORT_TEXT_LENGTH),
    content,
    author_name: authorName,
    attachment_url: normalizeNullableVaultText(entry.attachment_url),
    attachment_name: normalizeNullableVaultText(entry.attachment_name, MAX_VAULT_SHORT_TEXT_LENGTH),
    media_type: mediaType,
    created_at: createdAt,
  };
  if (entry.storage_provider === 'google_drive' || entry.storage_provider === 'supabase') normalized.storage_provider = entry.storage_provider;
  const externalFileId = normalizeNullableVaultText(entry.external_file_id, MAX_VAULT_SHORT_TEXT_LENGTH);
  const externalFileUrl = normalizeNullableVaultText(entry.external_file_url);
  const unlockAt = normalizeNullableVaultText(entry.unlock_at, 40);
  if (externalFileId !== null) normalized.external_file_id = externalFileId;
  if (externalFileUrl !== null) normalized.external_file_url = externalFileUrl;
  if (unlockAt !== null) normalized.unlock_at = unlockAt;
  return normalized;
}

export function normalizeDemoVaultState(value: unknown): DemoVaultState {
  if (!value || typeof value !== 'object') return { vaultConfigs: [], entries: [] };
  const state = value as { vaultConfigs?: unknown; entries?: unknown };
  return {
    vaultConfigs: Array.isArray(state.vaultConfigs)
      ? state.vaultConfigs.map(normalizeVaultConfig).filter((config): config is VaultConfig => config !== null).slice(0, MAX_DEMO_VAULT_CONFIGS)
      : [],
    entries: Array.isArray(state.entries)
      ? state.entries.map(normalizeVaultEntry).filter((entry): entry is VaultEntry => entry !== null).slice(0, MAX_DEMO_VAULT_ENTRIES)
      : [],
  };
}

export function readDemoVaultState(fallbackState: DemoVaultState): DemoVaultState {
  try {
    const stored = readVaultStorageValue<unknown>(DEMO_VAULT_STORAGE_KEY, {});
    const normalized = normalizeDemoVaultState(stored.value);
    if (stored.shouldMigrate && normalized.vaultConfigs.length > 0) writeDemoVaultState(normalized.vaultConfigs, normalized.entries);
    if (stored.hadStoredValue && normalized.vaultConfigs.length === 0) localStorage.removeItem(DEMO_VAULT_STORAGE_KEY);
    return normalized.vaultConfigs.length > 0 ? normalized : fallbackState;
  } catch {
    try {
      localStorage.removeItem(DEMO_VAULT_STORAGE_KEY);
    } catch {}
    return fallbackState;
  }
}

export function writeDemoVaultState(vaultConfigs: VaultConfig[], entries: VaultEntry[]): void {
  try {
    writeVaultStorageValue(DEMO_VAULT_STORAGE_KEY, normalizeDemoVaultState({ vaultConfigs, entries }));
  } catch {}
}

export function appendDemoVaultEntries(vault: VaultContributionConfigInfo, rows: DemoVaultEntryInput[]): void {
  try {
    const current = readDemoVaultState({ vaultConfigs: [], entries: [] });
    const existingConfigs = current.vaultConfigs;
    const hasConfig = existingConfigs.some((config) => config.id === vault.id);
    const nextConfigs = hasConfig
      ? existingConfigs
      : [...existingConfigs, normalizeVaultConfig(vault, existingConfigs.length)].filter((config): config is VaultConfig => config !== null)
        .sort((a, b) => a.duration_years - b.duration_years);
    const now = Date.now();
    const mappedEntries = rows.map((row, index) => normalizeVaultEntry({
      id: `demo-public-${now}-${index}`,
      vault_config_id: vault.id,
      vault_year: vault.duration_years,
      title: row.title,
      content: row.content,
      author_name: row.author_name,
      attachment_url: row.attachment_url,
      attachment_name: row.attachment_name,
      media_type: row.media_type,
      created_at: new Date(now + index).toISOString(),
    })).filter((entry): entry is VaultEntry => entry !== null);

    writeDemoVaultState(nextConfigs, [...current.entries, ...mappedEntries]);
  } catch {}
}

export function getVaultSubmittedYearsStorageKey(siteSlug: string | null | undefined): string {
  return `${VAULT_SUBMITTED_KEY_PREFIX}${siteSlug ?? 'unknown'}`;
}

function normalizeSubmittedYears(value: unknown): number[] {
  return Array.isArray(value)
    ? Array.from(new Set(value.map((year) => normalizeVaultNumber(year)).filter((year) => year > 0)))
      .sort((left, right) => left - right)
      .slice(0, MAX_VAULT_SUBMITTED_YEARS)
    : [];
}

export function readSubmittedVaultYears(storageKey: string): number[] {
  try {
    const stored = readVaultStorageValue<unknown>(storageKey, []);
    const normalized = normalizeSubmittedYears(stored.value);
    if (stored.shouldMigrate && normalized.length > 0) writeVaultStorageValue(storageKey, normalized);
    if (stored.hadStoredValue && normalized.length === 0) localStorage.removeItem(storageKey);
    return normalized;
  } catch {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    return [];
  }
}

export function markSubmittedVaultYear(storageKey: string, years: number): number[] {
  const next = normalizeSubmittedYears([...readSubmittedVaultYears(storageKey), years]);
  try {
    writeVaultStorageValue(storageKey, next);
  } catch {}
  return next;
}
