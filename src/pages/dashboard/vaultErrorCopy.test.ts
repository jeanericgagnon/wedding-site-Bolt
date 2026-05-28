import { describe, expect, it } from 'vitest';

import {
  mapVaultConfigSaveError,
  mapVaultDashboardError,
  mapVaultEntryInsertError,
  mapVaultOauthQueryError,
  VAULT_ANNIVERSARY_SEND_RETRY_ERROR,
  VAULT_CONFIG_SAVE_RETRY_ERROR,
  VAULT_DUPLICATE_YEAR_ERROR,
  VAULT_DRIVE_CALLBACK_RETRY_ERROR,
  VAULT_DRIVE_CONNECT_RETRY_ERROR,
  VAULT_ENTRY_SAVE_RETRY_ERROR,
  VAULT_SITE_REQUIRED_ERROR,
} from './vaultErrorCopy';

describe('vaultErrorCopy', () => {
  it('masks provider and internal vault dashboard failures behind calm owner copy', () => {
    expect(mapVaultDashboardError(new Error('google-drive-auth-start provider timeout with token=abc'), VAULT_DRIVE_CALLBACK_RETRY_ERROR)).toBe(
      VAULT_DRIVE_CALLBACK_RETRY_ERROR,
    );
    expect(mapVaultDashboardError(new Error('Supabase bucket policy denied vault-resolve-entry-link'), VAULT_ENTRY_SAVE_RETRY_ERROR)).toBe(
      VAULT_ENTRY_SAVE_RETRY_ERROR,
    );
    expect(mapVaultDashboardError(new Error('sendAnniversaryReminder telnyx authorization failed'), VAULT_ANNIVERSARY_SEND_RETRY_ERROR)).toBe(
      VAULT_ANNIVERSARY_SEND_RETRY_ERROR,
    );
  });

  it('keeps oauth query failures owner-safe instead of echoing raw redirect details', () => {
    expect(mapVaultOauthQueryError('access_denied')).toBe(
      'Google Drive connection was cancelled before it finished.',
    );
    expect(mapVaultOauthQueryError('redirect_uri_mismatch')).toBe(
      'Google Drive connection was cancelled or could not be completed.',
    );
  });

  it('keeps drive connect fallback framed as a calm retry instead of a raw failure banner', () => {
    expect(VAULT_DRIVE_CONNECT_RETRY_ERROR).toBe(
      'Could not start Google Drive connection right now.',
    );
  });

  it('keeps vault save and entry insert failures behind calm dashboard-safe copy', () => {
    expect(mapVaultConfigSaveError(new Error('duplicate key value violates unique constraint "vault_configs_duration_years_key"'))).toBe(
      VAULT_DUPLICATE_YEAR_ERROR,
    );
    expect(mapVaultConfigSaveError(new Error('provider timeout token=abc while saving vault config'))).toBe(
      VAULT_CONFIG_SAVE_RETRY_ERROR,
    );
    expect(mapVaultEntryInsertError(new Error('No wedding site found'))).toBe(
      VAULT_SITE_REQUIRED_ERROR,
    );
    expect(mapVaultEntryInsertError(new Error('row-level security policy denied vault_entries insert'))).toBe(
      VAULT_ENTRY_SAVE_RETRY_ERROR,
    );
  });
});
