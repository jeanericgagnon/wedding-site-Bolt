import { supabase } from '../lib/supabase';

export const VAULT_CONTRIBUTION_CONFIG_SELECT = 'id, label, duration_years, is_enabled';

export interface VaultContributionConfigInfo {
  id: string;
  label: string;
  duration_years: number;
  is_enabled: boolean;
}

interface VaultContributionAccessPayload {
  inviteToken: string | null;
  passwordSession: string | null;
}

export interface VaultContributionAttachmentUploadInput extends VaultContributionAccessPayload {
  siteId: string;
  vaultConfigId: string;
  vaultYear: number;
  mediaType: string;
  fileName: string;
  mimeType: string;
  base64: string;
  qaOpen?: boolean;
}

export interface VaultContributionAttachmentUploadResult {
  publicUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

export interface VaultContributionDriveUploadInput extends VaultContributionAccessPayload {
  siteId: string;
  vaultYear: number;
  fileName: string;
  mimeType: string;
  base64: string;
}

export interface VaultContributionDriveUploadResult {
  fileId?: string;
  webViewLink?: string | null;
  webContentLink?: string | null;
}

export async function uploadVaultContributionAttachment(
  input: VaultContributionAttachmentUploadInput,
): Promise<VaultContributionAttachmentUploadResult | null> {
  const { data, error } = await supabase.functions.invoke('vault-entry-submit', {
    body: {
      action: 'upload_attachment',
      siteId: input.siteId,
      vaultConfigId: input.vaultConfigId,
      vaultYear: input.vaultYear,
      mediaType: input.mediaType,
      fileName: input.fileName,
      mimeType: input.mimeType,
      base64: input.base64,
      qaOpen: input.qaOpen,
      inviteToken: input.inviteToken,
      passwordSession: input.passwordSession,
    },
  });

  if (error) throw error;
  return (data as VaultContributionAttachmentUploadResult | null) ?? null;
}

export async function uploadVaultContributionToGoogleDrive(
  input: VaultContributionDriveUploadInput,
): Promise<VaultContributionDriveUploadResult | null> {
  const { data, error } = await supabase.functions.invoke('vault-upload-google-drive', {
    body: {
      siteId: input.siteId,
      vaultYear: input.vaultYear,
      fileName: input.fileName,
      mimeType: input.mimeType,
      base64: input.base64,
      inviteToken: input.inviteToken,
      passwordSession: input.passwordSession,
    },
  });

  if (error) throw error;
  return (data as VaultContributionDriveUploadResult | null) ?? null;
}

export async function submitVaultContributionRows(
  rows: Record<string, unknown>[],
  access: VaultContributionAccessPayload,
  qaOpen = false,
): Promise<void> {
  const { error } = await supabase.functions.invoke('vault-entry-submit', {
    body: {
      rows,
      qaOpen,
      inviteToken: access.inviteToken,
      passwordSession: access.passwordSession,
    },
  });

  if (error) throw error;
}

export async function loadEnabledVaultContributionConfig(
  siteSlug: string,
  durationYears: number,
  access: VaultContributionAccessPayload,
): Promise<VaultContributionConfigInfo | null> {
  const { data, error } = await supabase.functions.invoke('vault-contribution-public', {
    body: {
      siteSlug,
      vaultYear: durationYears,
      ...access,
    },
  });

  if (error) throw error;
  return ((data as { config?: VaultContributionConfigInfo | null } | null)?.config ?? null);
}

export async function listEnabledVaultContributionConfigs(
  siteSlug: string,
  access: VaultContributionAccessPayload,
): Promise<VaultContributionConfigInfo[]> {
  const { data, error } = await supabase.functions.invoke('vault-contribution-public', {
    body: {
      siteSlug,
      ...access,
    },
  });

  if (error) throw error;
  return ((((data as { configs?: VaultContributionConfigInfo[] | null } | null)?.configs) ?? []) as VaultContributionConfigInfo[])
    .sort((a, b) => a.duration_years - b.duration_years);
}
