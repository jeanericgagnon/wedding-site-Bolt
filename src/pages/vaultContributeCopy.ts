import { customerSafeErrorMessage } from '../lib/customerSafeError';

type VaultAttachmentSiteState = {
  vault_storage_provider?: 'supabase' | 'google_drive';
  vault_google_drive_connected?: boolean;
} | null;

export function mapVaultAttachmentUploadError(message?: string | null): string {
  const trimmed = String(message ?? '').trim();
  if (!trimmed) return 'We could not upload that attachment right now. Please try again.';
  if (/\bbucket\b|\bpolicy\b|\bstorage\b/i.test(trimmed)) {
    return 'Photo and video uploads are temporarily unavailable for this vault. You can still leave a written message right now.';
  }
  return 'We could not upload that attachment right now. Please try again.';
}

export function mapVaultContributionSaveError(error: unknown): string {
  return customerSafeErrorMessage(error, 'Could not save your message right now. Please try again.');
}

export function getVaultAttachmentStatusCopy(site: VaultAttachmentSiteState): string {
  if (site?.vault_storage_provider === 'google_drive' && !site.vault_google_drive_connected) {
    return 'Photo and video uploads are not available for this vault yet. You can still leave a written message.';
  }
  return 'Photo, video, and voice attachments are ready for this vault.';
}
