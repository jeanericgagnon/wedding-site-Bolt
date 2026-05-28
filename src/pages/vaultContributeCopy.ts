import { customerSafeErrorMessage } from '../lib/customerSafeError';

type VaultAttachmentSiteState = {
  vault_storage_provider?: 'supabase' | 'google_drive';
  vault_google_drive_connected?: boolean;
} | null;

export type VaultContributionMediaType = 'text' | 'photo' | 'video' | 'voice';

export const VAULT_ATTACHMENT_PAUSED_ERROR =
  'Photo, video, and voice uploads are temporarily unavailable for this vault. You can still leave a written message.';
export const VAULT_ATTACHMENT_READY_COPY = 'Photo, video, and voice attachments are ready for this vault.';
export const VAULT_UPLOAD_READY_COPY = (count: number) =>
  `Ready to save: ${count} ${count === 1 ? 'file' : 'files'} will be added to this vault.`;
export const VAULT_COMPRESSION_FALLBACK_COPY =
  'We could not compress that video here, so the original file will be uploaded instead.';

export function mapVaultAttachmentUploadError(message?: string | null): string {
  const trimmed = String(message ?? '').trim();
  if (!trimmed) return 'We could not upload that attachment right now. Please try again.';
  if (/\bbucket\b|\bpolicy\b|\bstorage\b/i.test(trimmed)) {
    return VAULT_ATTACHMENT_PAUSED_ERROR;
  }
  return 'We could not upload that attachment right now. Please try again.';
}

export function mapVaultContributionSaveError(error: unknown): string {
  return customerSafeErrorMessage(error, 'Could not save your message right now. Please try again.');
}

export function getVaultAttachmentStatusCopy(site: VaultAttachmentSiteState): string {
  if (site?.vault_storage_provider === 'google_drive' && !site.vault_google_drive_connected) {
    return VAULT_ATTACHMENT_PAUSED_ERROR;
  }
  return VAULT_ATTACHMENT_READY_COPY;
}

export function areVaultAttachmentsAvailable(site: VaultAttachmentSiteState): boolean {
  return site?.vault_storage_provider !== 'google_drive' || Boolean(site.vault_google_drive_connected);
}

export function getVaultAllowedContributionMediaTypes(site: VaultAttachmentSiteState): VaultContributionMediaType[] {
  return areVaultAttachmentsAvailable(site)
    ? ['text', 'photo', 'video', 'voice']
    : ['text'];
}
