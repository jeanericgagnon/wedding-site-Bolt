import { useState } from 'react';
import {
  queueGuestPhotoFollowups as queueGuestPhotoFollowupsFromService,
  saveGuestPhotoHubSettings,
} from '../guestPhotoSharingService';
import {
  safePhotoOwnerError,
  type GuestHubSettings,
} from '../guestPhotoSharingUtils';

type LogPhotoAction = (
  type: string,
  summary: string,
  metadata?: Record<string, unknown>,
  targetId?: string | null,
  targetLabel?: string | null
) => void;

type UseGuestPhotoHubActionsArgs = {
  hubSettings: GuestHubSettings;
  load: () => Promise<void>;
  logPhotoAction: LogPhotoAction;
  setError: (value: string | null) => void;
  setSuccess: (value: string | null) => void;
  siteId: string | null;
};

export function useGuestPhotoHubActions({
  hubSettings,
  load,
  logPhotoAction,
  setError,
  setSuccess,
  siteId,
}: UseGuestPhotoHubActionsArgs) {
  const [queueingFollowups, setQueueingFollowups] = useState<'recap' | 'future_event' | null>(null);
  const [savingHubSettings, setSavingHubSettings] = useState(false);

  const saveHubSettings = async () => {
    if (!siteId) return;
    try {
      setSavingHubSettings(true);
      setError(null);
      await saveGuestPhotoHubSettings(siteId, hubSettings);
      logPhotoAction('guest_hub_settings_saved', 'Guest hub settings were updated.', {
        photosEnabled: hubSettings.photos_enabled,
        guestbookEnabled: hubSettings.guestbook_enabled,
        recapStatus: hubSettings.recap_status,
        languageDefault: hubSettings.language_default,
      });
      setSuccess('Guest hub settings saved.');
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t save guest hub controls yet.'));
    } finally {
      setSavingHubSettings(false);
    }
  };

  const queueGuestFollowups = async (kind: 'recap' | 'future_event') => {
    if (!siteId) return;
    try {
      setQueueingFollowups(kind);
      setError(null);
      const data = await queueGuestPhotoFollowupsFromService(siteId, kind);
      const queued = Number((data as { queued?: number } | null)?.queued ?? 0);
      setSuccess(
        queued > 0
          ? `Prepared ${queued} ${kind === 'recap' ? 'recap' : 'future event'} follow-up email${queued === 1 ? '' : 's'}.`
          : 'No new guest follow-ups are ready right now.'
      );
      await load();
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t prepare guest follow-ups yet.'));
    } finally {
      setQueueingFollowups(null);
    }
  };

  return {
    queueGuestFollowups,
    queueingFollowups,
    saveHubSettings,
    savingHubSettings,
  };
}
