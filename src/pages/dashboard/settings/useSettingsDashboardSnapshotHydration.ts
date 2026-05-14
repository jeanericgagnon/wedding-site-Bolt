import { useCallback, useEffect } from 'react';

import { safeSettingsError } from './settingsDashboardUtils';
import { loadSettingsDashboardSnapshot } from './loadSettingsDashboardSnapshot';
import type { RSVPQuestionSetting, SiteLanguageCode, TranslationStatusRow } from './settingsDashboardTypes';
import type { SettingsCollaboratorInviteRow } from './settingsSiteData';

interface DraftHydrationGuard {
  shouldHydrate: () => boolean;
}

interface UseSettingsDashboardSnapshotHydrationArgs {
  isDemoMode: boolean;
  notifDraftGuard: DraftHydrationGuard;
  rsvpDraftGuard: DraftHydrationGuard;
  setAccountEmail: React.Dispatch<React.SetStateAction<string>>;
  setAccountError: React.Dispatch<React.SetStateAction<string | null>>;
  setCollaboratorInvites: React.Dispatch<React.SetStateAction<SettingsCollaboratorInviteRow[]>>;
  setCoupleNames: React.Dispatch<React.SetStateAction<string>>;
  setCurrentTemplate: React.Dispatch<React.SetStateAction<string>>;
  setDefaultLanguage: React.Dispatch<React.SetStateAction<SiteLanguageCode>>;
  setGuestAccessToken: React.Dispatch<React.SetStateAction<string | null>>;
  setHideFromSearch: React.Dispatch<React.SetStateAction<boolean>>;
  setMusicPlaylistUrl: React.Dispatch<React.SetStateAction<string>>;
  setNotifDigest: React.Dispatch<React.SetStateAction<boolean>>;
  setNotifDigestCadence: React.Dispatch<React.SetStateAction<'daily' | 'weekly' | 'paused'>>;
  setNotifDigestIncludePlanner: React.Dispatch<React.SetStateAction<boolean>>;
  setNotifDigestQuietUntilLabel: React.Dispatch<React.SetStateAction<string>>;
  setNotifPhotos: React.Dispatch<React.SetStateAction<boolean>>;
  setNotifRsvp: React.Dispatch<React.SetStateAction<boolean>>;
  setNotifUpdates: React.Dispatch<React.SetStateAction<boolean>>;
  setPrivacyMode: React.Dispatch<React.SetStateAction<'public' | 'password_protected' | 'invite_only'>>;
  setRsvpMealEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setRsvpMealOptions: React.Dispatch<React.SetStateAction<string[]>>;
  setRsvpQuestions: React.Dispatch<React.SetStateAction<RSVPQuestionSetting[]>>;
  setSettingsRole: React.Dispatch<React.SetStateAction<'owner' | 'planner' | 'coordinator' | 'viewer'>>;
  setSiteSlug: React.Dispatch<React.SetStateAction<string>>;
  setTranslationStatuses: React.Dispatch<React.SetStateAction<TranslationStatusRow[]>>;
  setVenueName: React.Dispatch<React.SetStateAction<string | null>>;
  setWeddingDate: React.Dispatch<React.SetStateAction<string | null>>;
  setWeddingSiteId: React.Dispatch<React.SetStateAction<string | null>>;
  userEmail: string | null;
  userId: string | null;
  visibilityDraftGuard: DraftHydrationGuard;
}

export function useSettingsDashboardSnapshotHydration({
  isDemoMode,
  notifDraftGuard,
  rsvpDraftGuard,
  setAccountEmail,
  setAccountError,
  setCollaboratorInvites,
  setCoupleNames,
  setCurrentTemplate,
  setDefaultLanguage,
  setGuestAccessToken,
  setHideFromSearch,
  setMusicPlaylistUrl,
  setNotifDigest,
  setNotifDigestCadence,
  setNotifDigestIncludePlanner,
  setNotifDigestQuietUntilLabel,
  setNotifPhotos,
  setNotifRsvp,
  setNotifUpdates,
  setPrivacyMode,
  setRsvpMealEnabled,
  setRsvpMealOptions,
  setRsvpQuestions,
  setSettingsRole,
  setSiteSlug,
  setTranslationStatuses,
  setVenueName,
  setWeddingDate,
  setWeddingSiteId,
  userEmail,
  userId,
  visibilityDraftGuard,
}: UseSettingsDashboardSnapshotHydrationArgs) {
  const loadSiteData = useCallback(async () => {
    try {
      const snapshot = await loadSettingsDashboardSnapshot({
        isDemoMode,
        userEmail,
        userId,
      });

      setSettingsRole(snapshot.settingsRole);
      setWeddingSiteId(snapshot.weddingSiteId);
      setAccountEmail(snapshot.accountEmail);
      setCoupleNames(snapshot.coupleNames);
      setWeddingDate(snapshot.weddingDate);
      setVenueName(snapshot.venueName);
      setCurrentTemplate(snapshot.currentTemplate);
      setSiteSlug(snapshot.siteSlug);
      setMusicPlaylistUrl(snapshot.musicPlaylistUrl);
      setCollaboratorInvites(snapshot.collaboratorInvites);
      setTranslationStatuses(snapshot.translationStatuses);

      if (visibilityDraftGuard.shouldHydrate()) {
        setPrivacyMode(snapshot.privacyMode);
        setHideFromSearch(snapshot.hideFromSearch);
        setGuestAccessToken(snapshot.guestAccessToken);
        setDefaultLanguage(snapshot.defaultLanguage);
      }

      if (notifDraftGuard.shouldHydrate()) {
        setNotifRsvp(snapshot.notifRsvp);
        setNotifPhotos(snapshot.notifPhotos);
        setNotifDigest(snapshot.notifDigest);
        setNotifDigestCadence(snapshot.notifDigestCadence);
        setNotifDigestIncludePlanner(snapshot.notifDigestIncludePlanner);
        setNotifDigestQuietUntilLabel(snapshot.notifDigestQuietUntilLabel ?? '');
        setNotifUpdates(snapshot.notifUpdates);
      }

      if (rsvpDraftGuard.shouldHydrate()) {
        setRsvpQuestions(snapshot.rsvpQuestions);
        setRsvpMealEnabled(snapshot.rsvpMealEnabled);
        setRsvpMealOptions(snapshot.rsvpMealOptions);
      }
    } catch (err) {
      setAccountError(safeSettingsError(err, 'Couldn’t load settings right now.'));
    }
  }, [
    isDemoMode,
    notifDraftGuard,
    rsvpDraftGuard,
    setAccountEmail,
    setAccountError,
    setCollaboratorInvites,
    setCoupleNames,
    setCurrentTemplate,
    setDefaultLanguage,
    setGuestAccessToken,
    setHideFromSearch,
    setMusicPlaylistUrl,
    setNotifDigest,
    setNotifDigestCadence,
    setNotifDigestIncludePlanner,
    setNotifDigestQuietUntilLabel,
    setNotifPhotos,
    setNotifRsvp,
    setNotifUpdates,
    setPrivacyMode,
    setRsvpMealEnabled,
    setRsvpMealOptions,
    setRsvpQuestions,
    setSettingsRole,
    setSiteSlug,
    setTranslationStatuses,
    setVenueName,
    setWeddingDate,
    setWeddingSiteId,
    userEmail,
    userId,
    visibilityDraftGuard,
  ]);

  useEffect(() => {
    void loadSiteData();
  }, [loadSiteData]);

  return {
    loadSiteData,
  };
}
