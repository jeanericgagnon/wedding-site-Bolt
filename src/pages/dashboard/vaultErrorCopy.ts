import { customerSafeErrorMessage } from '../../lib/customerSafeError';

export const VAULT_ENTRY_SAVE_RETRY_ERROR = 'Could not save your vault entry right now.';
export const VAULT_SETTINGS_SAVE_RETRY_ERROR = 'Could not save your vault changes right now.';
export const VAULT_ATTACHMENT_OPEN_RETRY_ERROR = 'Could not open that attachment right now.';
export const VAULT_DRIVE_HEALTH_RETRY_ERROR = 'Drive health check failed.';
export const VAULT_DRIVE_CONNECT_RETRY_ERROR = 'Failed to start Google Drive connection.';
export const VAULT_DRIVE_OAUTH_RETRY_ERROR = 'Google Drive connection was cancelled or could not be completed.';
export const VAULT_DRIVE_CALLBACK_RETRY_ERROR = 'Google Drive connection failed. Please reconnect to continue.';
export const VAULT_DRIVE_PROVIDER_SYNC_RETRY_ERROR = 'Google Drive connected, but we could not save the vault provider.';
export const VAULT_ANNIVERSARY_SEND_RETRY_ERROR = 'Could not send anniversary reminder.';
export const VAULT_CONFIG_SAVE_RETRY_ERROR = 'Could not save this vault right now.';
export const VAULT_DUPLICATE_YEAR_ERROR = 'You already have a vault for that anniversary year.';
export const VAULT_SITE_REQUIRED_ERROR = 'No wedding site is connected to this vault workspace yet.';

export function mapVaultDashboardError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback);
}

export function mapVaultConfigSaveError(error: unknown): string {
  const raw = error instanceof Error ? error.message.trim() : typeof error === 'string' ? error.trim() : '';
  if (/duplicate|unique/i.test(raw)) {
    return VAULT_DUPLICATE_YEAR_ERROR;
  }
  return mapVaultDashboardError(error, VAULT_CONFIG_SAVE_RETRY_ERROR);
}

export function mapVaultEntryInsertError(error: unknown): string {
  const raw = error instanceof Error ? error.message.trim() : typeof error === 'string' ? error.trim() : '';
  if (/no wedding site found/i.test(raw)) {
    return VAULT_SITE_REQUIRED_ERROR;
  }
  return mapVaultDashboardError(error, VAULT_ENTRY_SAVE_RETRY_ERROR);
}

export function mapVaultOauthQueryError(errorCode?: string | null): string {
  const normalized = String(errorCode ?? '').trim().toLowerCase();
  if (normalized === 'access_denied') {
    return 'Google Drive connection was cancelled before it finished.';
  }
  return VAULT_DRIVE_OAUTH_RETRY_ERROR;
}
