import { describe, expect, it } from 'vitest';

import {
  mapVaultDashboardError,
  mapVaultOauthQueryError,
  VAULT_ANNIVERSARY_SEND_RETRY_ERROR,
  VAULT_DRIVE_CALLBACK_RETRY_ERROR,
  VAULT_ENTRY_SAVE_RETRY_ERROR,
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
});
