import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEMO_VAULT_STORAGE_KEY,
  VAULT_DEMO_STORAGE_RETENTION_MS,
  appendDemoVaultEntries,
  getVaultSubmittedYearsStorageKey,
  markSubmittedVaultYear,
  normalizeDemoVaultState,
  readDemoVaultState,
  readSubmittedVaultYears,
  writeDemoVaultState,
} from './vaultDemoStorage';
import type { VaultConfig, VaultEntry } from './dashboard/vaultService';

const fallbackConfig: VaultConfig = {
  id: 'vault-1',
  vault_index: 1,
  label: '1-Year Vault',
  duration_years: 1,
  is_enabled: true,
};

const fallbackEntry: VaultEntry = {
  id: 'entry-1',
  vault_config_id: 'vault-1',
  vault_year: 1,
  title: 'A note',
  content: 'Open this later',
  author_name: 'Guest',
  attachment_url: null,
  attachment_name: null,
  media_type: 'text',
  created_at: '2026-05-06T12:00:00.000Z',
};

describe('vault demo storage helpers', () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('normalizes vault configs and entries with bounded text', () => {
    const normalized = normalizeDemoVaultState({
      vaultConfigs: [{
        id: ' vault-1 ',
        label: 'x'.repeat(300),
        duration_years: 1.9,
        is_enabled: true,
      }, { id: 'bad' }],
      entries: [{
        id: ' entry-1 ',
        vault_config_id: ' vault-1 ',
        vault_year: 1.9,
        title: 'Title',
        content: 'y'.repeat(2200),
        author_name: ' Guest ',
        attachment_url: ' https://example.com/file.jpg ',
        attachment_name: ' file.jpg ',
        media_type: 'photo',
        created_at: '2026-05-06T12:00:00.000Z',
      }, { id: 'bad' }],
    });

    expect(normalized.vaultConfigs).toEqual([expect.objectContaining({
      id: 'vault-1',
      label: 'x'.repeat(240),
      duration_years: 1,
      vault_index: 1,
    })]);
    expect(normalized.entries).toEqual([expect.objectContaining({
      id: 'entry-1',
      content: 'y'.repeat(2000),
      author_name: 'Guest',
      attachment_url: 'https://example.com/file.jpg',
      media_type: 'photo',
    })]);
  });

  it('writes timestamped demo vault envelopes and reads them back', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));

    writeDemoVaultState([fallbackConfig], [fallbackEntry]);

    expect(readDemoVaultState({ vaultConfigs: [], entries: [] })).toEqual({
      vaultConfigs: [fallbackConfig],
      entries: [fallbackEntry],
    });
    expect(JSON.parse(localStorage.getItem(DEMO_VAULT_STORAGE_KEY) ?? '{}')).toMatchObject({
      savedAtISO: '2026-05-06T12:00:00.000Z',
      value: {
        vaultConfigs: [{ id: 'vault-1' }],
        entries: [{ id: 'entry-1' }],
      },
    });
  });

  it('migrates active legacy vault state and removes stale envelopes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    localStorage.setItem(DEMO_VAULT_STORAGE_KEY, JSON.stringify({
      vaultConfigs: [fallbackConfig],
      entries: [fallbackEntry],
    }));

    expect(readDemoVaultState({ vaultConfigs: [], entries: [] }).vaultConfigs).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(DEMO_VAULT_STORAGE_KEY) ?? '{}')).toHaveProperty('savedAtISO');

    localStorage.setItem(DEMO_VAULT_STORAGE_KEY, JSON.stringify({
      savedAtISO: new Date(Date.now() - VAULT_DEMO_STORAGE_RETENTION_MS - 1).toISOString(),
      value: { vaultConfigs: [fallbackConfig], entries: [fallbackEntry] },
    }));

    expect(readDemoVaultState({ vaultConfigs: [], entries: [] })).toEqual({ vaultConfigs: [], entries: [] });
    expect(localStorage.getItem(DEMO_VAULT_STORAGE_KEY)).toBeNull();
  });

  it('appends public demo entries without dropping existing state', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    writeDemoVaultState([fallbackConfig], [fallbackEntry]);

    appendDemoVaultEntries({ id: 'vault-5', label: '5-Year Vault', duration_years: 5, is_enabled: true }, [{
      title: 'For later',
      content: 'Happy anniversary',
      author_name: 'Friend',
      attachment_url: null,
      attachment_name: null,
      media_type: 'text',
    }]);

    const state = readDemoVaultState({ vaultConfigs: [], entries: [] });
    expect(state.vaultConfigs.map((config) => config.id)).toEqual(['vault-1', 'vault-5']);
    expect(state.entries.map((entry) => entry.id)).toEqual(['entry-1', 'demo-public-1778068800000-0']);
  });

  it('wraps submitted-year markers in timestamped envelopes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    const storageKey = getVaultSubmittedYearsStorageKey('maya-leo');
    localStorage.setItem(storageKey, JSON.stringify([5, '1', 5, -1]));

    expect(readSubmittedVaultYears(storageKey)).toEqual([1, 5]);
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '{}')).toHaveProperty('savedAtISO');

    expect(markSubmittedVaultYear(storageKey, 10)).toEqual([1, 5, 10]);
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '{}')).toMatchObject({
      savedAtISO: '2026-05-06T12:00:00.000Z',
      value: [1, 5, 10],
    });
  });
});
