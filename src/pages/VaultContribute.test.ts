import { describe, expect, it } from 'vitest';

import { getContributionWindow, getVaultCoupleName, getVaultUnlockAtIso, getVaultUnlockYear } from './VaultContribute';
import {
  areVaultAttachmentsAvailable,
  getVaultAllowedContributionMediaTypes,
  getVaultAttachmentStatusCopy,
  mapVaultAttachmentUploadError,
  mapVaultContributionSaveError,
  VAULT_ATTACHMENT_PAUSED_ERROR,
  VAULT_ATTACHMENT_PREPARE_RETRY_ERROR,
  VAULT_ATTACHMENT_READY_COPY,
  VAULT_COMPRESSION_FALLBACK_COPY,
  VAULT_UPLOAD_READY_COPY,
} from './vaultContributeCopy';

describe('getVaultCoupleName', () => {
  it('keeps a single partner name truthful instead of showing a broken ampersand', () => {
    expect(getVaultCoupleName({ couple_name_1: 'Alex', couple_name_2: '   ' })).toBe('Alex');
  });

  it('falls back cleanly when both partner names are blank', () => {
    expect(getVaultCoupleName({ couple_name_1: '  ', couple_name_2: null })).toBe('the couple');
  });
});

describe('getVaultUnlockYear', () => {
  it('skips invalid wedding dates instead of surfacing NaN unlock years', () => {
    expect(getVaultUnlockYear('not-a-date', 5)).toBeNull();
    expect(getVaultUnlockYear('2027-02-30', 5)).toBeNull();
  });

  it('returns the anniversary year when the wedding date is valid', () => {
    expect(getVaultUnlockYear('2026-02-23', 10)).toBe(2036);
  });
});

describe('getVaultUnlockAtIso', () => {
  it('skips invalid persisted wedding dates instead of throwing on toISOString', () => {
    expect(getVaultUnlockAtIso('not-a-date', 5)).toBeNull();
    expect(getVaultUnlockAtIso('2027-02-30', 5)).toBeNull();
    expect(getVaultUnlockAtIso(null, 5)).toBeNull();
  });

  it('returns the matching anniversary unlock timestamp when the wedding date is valid', () => {
    expect(getVaultUnlockAtIso('2026-02-23', 5)).toBe(new Date('2031-02-23T00:00:00.000Z').toISOString());
  });
});

describe('getContributionWindow', () => {
  it('ignores impossible persisted wedding dates instead of enforcing a fake upload window', () => {
    expect(getContributionWindow('2027-02-30')).toEqual({ canSubmit: true, message: null });
  });
});

describe('vault guest-safe copy', () => {
  it('keeps attachment upload failures guest-safe instead of leaking provider or bucket details', () => {
    expect(mapVaultAttachmentUploadError('missing vault-attachments bucket or policy')).toBe(
      VAULT_ATTACHMENT_PAUSED_ERROR,
    );
    expect(mapVaultAttachmentUploadError(new Error(VAULT_ATTACHMENT_PREPARE_RETRY_ERROR))).toBe(
      VAULT_ATTACHMENT_PREPARE_RETRY_ERROR,
    );
    expect(mapVaultAttachmentUploadError(new Error('Google Drive upload failed: provider timeout token=abc'))).toBe(
      'We could not upload that attachment right now. Please try again.',
    );
  });

  it('keeps save failures guest-safe instead of exposing internal details', () => {
    expect(mapVaultContributionSaveError(new Error('duplicate key value violates row-level security policy'))).toBe(
      'Could not save your message right now. Please try again.',
    );
  });

  it('describes attachment readiness without provider-specific language', () => {
    expect(getVaultAttachmentStatusCopy({
      vault_storage_provider: 'google_drive',
      vault_google_drive_connected: false,
    })).toBe(VAULT_ATTACHMENT_PAUSED_ERROR);

    expect(getVaultAttachmentStatusCopy({
      vault_storage_provider: 'supabase',
      vault_google_drive_connected: false,
    })).toBe(VAULT_ATTACHMENT_READY_COPY);
  });

  it('keeps written notes available even when attachment uploads are paused', () => {
    const attachmentPausedSite = {
      vault_storage_provider: 'google_drive' as const,
      vault_google_drive_connected: false,
    };

    expect(areVaultAttachmentsAvailable(attachmentPausedSite)).toBe(false);
    expect(getVaultAllowedContributionMediaTypes(attachmentPausedSite)).toEqual(['text']);

    expect(areVaultAttachmentsAvailable({
      vault_storage_provider: 'supabase',
      vault_google_drive_connected: false,
    })).toBe(true);
    expect(getVaultAllowedContributionMediaTypes({
      vault_storage_provider: 'supabase',
      vault_google_drive_connected: false,
    })).toEqual(['text', 'photo', 'video', 'voice']);
  });

  it('keeps upload progress and fallback copy free of storage-provider language', () => {
    expect(VAULT_UPLOAD_READY_COPY(2)).toBe('Ready to save: 2 files will be added to this vault.');
    expect(VAULT_UPLOAD_READY_COPY(2)).not.toMatch(/google drive|storage/i);
    expect(VAULT_COMPRESSION_FALLBACK_COPY).toBe(
      'We could not compress that video here, so the original file will be uploaded instead.',
    );
  });
});
