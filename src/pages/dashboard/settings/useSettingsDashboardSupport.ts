import { useCallback } from 'react';

import { resolveActiveSiteForUser } from '../../../lib/activeSite';
import { logAppAction } from '../../../lib/actionAudit';
import { loadSettingsCollaboratorInvites, loadSettingsTranslationStatuses, type SettingsCollaboratorInviteRow } from './settingsSiteData';
import type { TranslationLanguageCode, TranslationStatusRow } from './settingsDashboardTypes';

interface UseSettingsDashboardSupportArgs {
  setCollaboratorInvites: React.Dispatch<React.SetStateAction<SettingsCollaboratorInviteRow[]>>;
  setTranslationStatuses: React.Dispatch<React.SetStateAction<TranslationStatusRow[]>>;
  setWeddingSiteId: React.Dispatch<React.SetStateAction<string | null>>;
  userId: string | null | undefined;
  weddingSiteId: string | null;
}

export function useSettingsDashboardSupport({
  setCollaboratorInvites,
  setTranslationStatuses,
  setWeddingSiteId,
  userId,
  weddingSiteId,
}: UseSettingsDashboardSupportArgs) {
  const loadCollaboratorInvites = useCallback(async (siteId: string) => {
    setCollaboratorInvites(await loadSettingsCollaboratorInvites(siteId));
  }, [setCollaboratorInvites]);

  const resolveSettingsSiteId = useCallback(async () => {
    if (weddingSiteId) return weddingSiteId;
    if (!userId) return null;
    const activeSite = await resolveActiveSiteForUser(userId);
    const activeSiteId = activeSite?.id ?? null;
    if (activeSiteId) setWeddingSiteId(activeSiteId);
    return activeSiteId;
  }, [setWeddingSiteId, userId, weddingSiteId]);

  const logSettingsAction = useCallback((
    type: string,
    summary: string,
    metadata?: Record<string, unknown>,
    targetId?: string | null,
    targetLabel?: string | null,
    siteIdOverride?: string | null,
  ) => {
    const targetSiteId = siteIdOverride ?? weddingSiteId;
    if (!targetSiteId) return;
    void logAppAction({
      weddingSiteId: targetSiteId,
      area: 'settings',
      type,
      summary,
      targetId,
      targetLabel,
      metadata,
    });
  }, [weddingSiteId]);

  const loadTranslationStatuses = useCallback(async (siteId: string) => {
    try {
      const rows = await loadSettingsTranslationStatuses(
        siteId,
        ['es', 'fr', 'it', 'de', 'pt'],
      );
      setTranslationStatuses(
        rows
          .filter((row): row is TranslationStatusRow => row.status === 'ready' || row.status === 'failed')
          .map((row) => ({
            language: row.language as TranslationLanguageCode,
            status: row.status,
            translated_at: row.translated_at ?? null,
          })),
      );
    } catch {
      setTranslationStatuses([]);
    }
  }, [setTranslationStatuses]);

  const downloadTextFile = useCallback((filename: string, content: string, type = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, []);

  return {
    downloadTextFile,
    loadCollaboratorInvites,
    loadTranslationStatuses,
    logSettingsAction,
    resolveSettingsSiteId,
  };
}
