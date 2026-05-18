import { supabase } from '../lib/supabase';

export const VAULT_CONTRIBUTION_CONFIG_SELECT = 'id, label, duration_years, is_enabled';

export interface VaultContributionConfigInfo {
  id: string;
  label: string;
  duration_years: number;
  is_enabled: boolean;
}

export interface VaultContributionWindow {
  canSubmit: boolean;
  message: string | null;
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

export interface VaultContributionConfigResponse {
  config: VaultContributionConfigInfo | null;
  submissionWindow: VaultContributionWindow;
}

export interface VaultContributionConfigsResponse {
  configs: VaultContributionConfigInfo[];
  submissionWindow: VaultContributionWindow;
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
  qaOpen = false,
): Promise<VaultContributionConfigResponse> {
  const { data, error } = await supabase.functions.invoke('vault-contribution-public', {
    body: {
      siteSlug,
      vaultYear: durationYears,
      qaOpen,
      ...access,
    },
  });

  if (error) throw error;
  const payload = (data as { config?: VaultContributionConfigInfo | null; submissionWindow?: VaultContributionWindow | null } | null);
  return {
    config: payload?.config ?? null,
    submissionWindow: payload?.submissionWindow ?? { canSubmit: true, message: null },
  };
}

export async function listEnabledVaultContributionConfigs(
  siteSlug: string,
  access: VaultContributionAccessPayload,
  qaOpen = false,
): Promise<VaultContributionConfigsResponse> {
  const { data, error } = await supabase.functions.invoke('vault-contribution-public', {
    body: {
      siteSlug,
      qaOpen,
      ...access,
    },
  });

  if (error) throw error;
  const payload = (data as { configs?: VaultContributionConfigInfo[] | null; submissionWindow?: VaultContributionWindow | null } | null);
  return {
    configs: (((payload?.configs) ?? []) as VaultContributionConfigInfo[]).sort((a, b) => a.duration_years - b.duration_years),
    submissionWindow: payload?.submissionWindow ?? { canSubmit: true, message: null },
  };
}
