import { resolveActiveSiteForUser } from '../../../lib/activeSite';
import { demoWeddingSite } from '../../../lib/demoData';
import type { PlannerAccessRole } from '../../../lib/plannerAccess';
import { readDemoRsvpSettings } from './settingsDemoStorage';
import {
  loadSettingsCollaboratorInvites,
  loadSettingsSite,
  loadSettingsTranslationStatuses,
  type SettingsCollaboratorInviteRow,
} from './settingsSiteData';
import {
  SITE_LANGUAGE_OPTIONS,
  TRANSLATION_LANGUAGE_OPTIONS,
  type RSVPQuestionSetting,
  type SiteLanguageCode,
  type TranslationStatusRow,
} from './settingsDashboardTypes';
import { normalizeMealOptions, normalizeRsvpQuestions, type SettingsPrivacyMode } from './settingsDashboardUtils';

export type SettingsDashboardSnapshot = {
  accountEmail: string;
  collaboratorInvites: SettingsCollaboratorInviteRow[];
  coupleNames: string;
  currentTemplate: string;
  defaultLanguage: SiteLanguageCode;
  guestAccessToken: string | null;
  hideFromSearch: boolean;
  musicPlaylistUrl: string;
  notifDigest: boolean;
  notifPhotos: boolean;
  notifRsvp: boolean;
  notifUpdates: boolean;
  privacyMode: SettingsPrivacyMode;
  rsvpMealEnabled: boolean;
  rsvpMealOptions: string[];
  rsvpQuestions: RSVPQuestionSetting[];
  settingsRole: PlannerAccessRole;
  siteSlug: string;
  translationStatuses: TranslationStatusRow[];
  venueName: string | null;
  weddingDate: string | null;
  weddingSiteId: string | null;
};

type LoadSettingsDashboardSnapshotArgs = {
  isDemoMode: boolean;
  userEmail: string | null;
  userId: string | null;
};

const DEFAULT_SNAPSHOT: Omit<SettingsDashboardSnapshot, 'accountEmail'> = {
  collaboratorInvites: [],
  coupleNames: '',
  currentTemplate: 'base',
  defaultLanguage: 'en',
  guestAccessToken: null,
  hideFromSearch: false,
  musicPlaylistUrl: '',
  notifDigest: false,
  notifPhotos: true,
  notifRsvp: true,
  notifUpdates: false,
  privacyMode: 'public',
  rsvpMealEnabled: true,
  rsvpMealOptions: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'],
  rsvpQuestions: [],
  settingsRole: 'owner',
  siteSlug: '',
  translationStatuses: [],
  venueName: null,
  weddingDate: null,
  weddingSiteId: null,
};

function buildDemoSnapshot(userEmail: string | null): SettingsDashboardSnapshot {
  const demoRsvpSettings = readDemoRsvpSettings();

  return {
    ...DEFAULT_SNAPSHOT,
    accountEmail: userEmail ?? '',
    coupleNames: `${demoWeddingSite.couple_name_1} & ${demoWeddingSite.couple_name_2}`,
    currentTemplate: 'base',
    musicPlaylistUrl: '',
    rsvpMealEnabled: typeof demoRsvpSettings.mealEnabled === 'boolean' ? demoRsvpSettings.mealEnabled : true,
    rsvpMealOptions: demoRsvpSettings.mealOptions ?? DEFAULT_SNAPSHOT.rsvpMealOptions,
    rsvpQuestions: demoRsvpSettings.questions ?? [],
    siteSlug: demoWeddingSite.site_url,
    venueName: demoWeddingSite.venue_name,
    weddingDate: demoWeddingSite.wedding_date,
    weddingSiteId: demoWeddingSite.id,
  };
}

async function loadSnapshotTranslationStatuses(siteId: string): Promise<TranslationStatusRow[]> {
  try {
    const rows = await loadSettingsTranslationStatuses(
      siteId,
      TRANSLATION_LANGUAGE_OPTIONS.map((option) => option.value),
    );

    return rows
      .filter((row): row is TranslationStatusRow =>
        TRANSLATION_LANGUAGE_OPTIONS.some((option) => option.value === row.language) &&
        (row.status === 'ready' || row.status === 'failed'),
      )
      .map((row) => ({
        language: row.language,
        status: row.status,
        translated_at: row.translated_at ?? null,
      }));
  } catch {
    return [];
  }
}

export async function loadSettingsDashboardSnapshot({
  isDemoMode,
  userEmail,
  userId,
}: LoadSettingsDashboardSnapshotArgs): Promise<SettingsDashboardSnapshot> {
  if (!userId) {
    return {
      ...DEFAULT_SNAPSHOT,
      accountEmail: '',
    };
  }

  if (isDemoMode) {
    return buildDemoSnapshot(userEmail);
  }

  const activeSite = await resolveActiveSiteForUser(userId);
  const settingsRole = activeSite?.role ?? 'owner';
  const data = activeSite?.id ? await loadSettingsSite(activeSite.id) : null;

  if (!data) {
    return {
      ...DEFAULT_SNAPSHOT,
      accountEmail: userEmail ?? '',
      settingsRole,
    };
  }

  const siteId = typeof data.id === 'string' ? data.id : null;
  const name1 = (data.couple_name_1 as string) ?? '';
  const name2 = (data.couple_name_2 as string) ?? '';
  const loadedLanguage = SITE_LANGUAGE_OPTIONS.some((option) => option.value === data.default_language)
    ? data.default_language as SiteLanguageCode
    : 'en';
  const prefs = data.notification_prefs as Record<string, boolean> | null;
  const mealCfg = (data as { rsvp_meal_config?: unknown }).rsvp_meal_config as { enabled?: boolean; options?: unknown[] } | undefined;

  return {
    ...DEFAULT_SNAPSHOT,
    accountEmail: userEmail ?? '',
    collaboratorInvites: siteId ? await loadSettingsCollaboratorInvites(siteId) : [],
    coupleNames: name1 && name2 ? `${name1} & ${name2}` : name1 || name2 || '',
    currentTemplate: (data.active_template_id as string) || 'base',
    defaultLanguage: loadedLanguage,
    guestAccessToken: (data.guest_access_token as string | null) ?? null,
    hideFromSearch: !!(data.hide_from_search as boolean | null | undefined),
    musicPlaylistUrl: (data.music_playlist_url as string) ?? '',
    notifDigest: prefs?.digest ?? false,
    notifPhotos: prefs?.photos ?? true,
    notifRsvp: prefs?.rsvp ?? true,
    notifUpdates: prefs?.updates ?? false,
    privacyMode: (data.privacy_mode as SettingsPrivacyMode) ?? 'public',
    rsvpMealEnabled: mealCfg?.enabled ?? true,
    rsvpMealOptions: normalizeMealOptions(mealCfg?.options),
    rsvpQuestions: normalizeRsvpQuestions((data as { rsvp_custom_questions?: unknown }).rsvp_custom_questions),
    settingsRole,
    siteSlug: (data.site_slug as string) ?? '',
    translationStatuses: siteId ? await loadSnapshotTranslationStatuses(siteId) : [],
    venueName: (data.venue_name as string | null) ?? null,
    weddingDate: (data.wedding_date as string | null) ?? null,
    weddingSiteId: siteId,
  };
}
