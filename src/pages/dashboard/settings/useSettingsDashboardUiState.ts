import { useCallback, useEffect, useRef, useState } from 'react';
import type { DigestCadence } from '../../../lib/notificationPrefs';
import { fetchBillingInfo, type BillingInfo } from '../../../lib/stripeService';
import {
  canManageSettings,
  getPlannerPermissionPreset,
  readPlannerInvite,
  type PlannerAccessRole,
  type PlannerInviteRecord,
  type PlannerPermissionKey,
} from '../../../lib/plannerAccess';
import type { SettingsCollaboratorInviteRow } from './settingsSiteData';
import type {
  AnalyticsRetentionDays,
  RSVPQuestionSetting,
  SiteLanguageCode,
  TranslationLanguageCode,
  TranslationStatusRow,
} from './settingsDashboardTypes';
import { safeSettingsError } from './settingsDashboardUtils';
import type { SettingsTabId } from './SettingsNavigation';

const useDraftHydrationGuard = (clearStatus: () => void) => {
  const dirtyRef = useRef(false);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    clearStatus();
  }, [clearStatus]);

  const markSaved = useCallback(() => {
    dirtyRef.current = false;
  }, []);

  const shouldHydrate = useCallback(() => !dirtyRef.current, []);

  return { markDirty, markSaved, shouldHydrate };
};

type Args = {
  userId: string | null | undefined;
};

export function useSettingsDashboardUiState({ userId }: Args) {
  const previousUserIdRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTabId>('account');

  const [coupleNames, setCoupleNames] = useState('');
  const [weddingDate, setWeddingDate] = useState<string | null>(null);
  const [venueName, setVenueName] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [siteSlug, setSiteSlug] = useState('');
  const [musicPlaylistUrl, setMusicPlaylistUrl] = useState('');
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugSuccess, setSlugSuccess] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  const [defaultLanguage, setDefaultLanguage] = useState<SiteLanguageCode>('en');
  const [allowedLanguages, setAllowedLanguages] = useState<SiteLanguageCode[]>(['en', 'es', 'fr', 'it', 'de', 'pt']);
  const [settingsWeddingData, setSettingsWeddingData] = useState<Record<string, unknown> | null>(null);
  const [translatingLanguage, setTranslatingLanguage] = useState<TranslationLanguageCode | null>(null);
  const [translationStatuses, setTranslationStatuses] = useState<TranslationStatusRow[]>([]);
  const [privacyMode, setPrivacyMode] = useState<'public' | 'password_protected' | 'invite_only'>('public');
  const [hideFromSearch, setHideFromSearch] = useState(false);
  const [sitePassword, setSitePassword] = useState('');
  const [showSitePassword, setShowSitePassword] = useState(false);
  const [guestAccessToken, setGuestAccessToken] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [analyticsRetentionDays, setAnalyticsRetentionDays] = useState<AnalyticsRetentionDays>(90);
  const [analyticsGuestNotice, setAnalyticsGuestNotice] = useState('');
  const [rsvpQuestions, setRsvpQuestions] = useState<RSVPQuestionSetting[]>([]);
  const [rsvpQuestionsSaving, setRsvpQuestionsSaving] = useState(false);
  const [rsvpQuestionsSuccess, setRsvpQuestionsSuccess] = useState<string | null>(null);
  const [rsvpQuestionsError, setRsvpQuestionsError] = useState<string | null>(null);
  const [collapsedQuestionIds, setCollapsedQuestionIds] = useState<Set<string>>(new Set());
  const [showAdvancedRsvp, setShowAdvancedRsvp] = useState(false);
  const [showMealChoiceSettings, setShowMealChoiceSettings] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showTemplateSettings, setShowTemplateSettings] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [rsvpMealEnabled, setRsvpMealEnabled] = useState(true);
  const [plannerInvite, setPlannerInvite] = useState<PlannerInviteRecord | null>(null);
  const [plannerInviteName, setPlannerInviteName] = useState('');
  const [plannerInviteEmail, setPlannerInviteEmail] = useState('');
  const [plannerInviteRole, setPlannerInviteRole] = useState<'planner' | 'coordinator' | 'viewer'>('planner');
  const [plannerInviteError, setPlannerInviteError] = useState<string | null>(null);
  const [plannerInviteSuccess, setPlannerInviteSuccess] = useState<string | null>(null);
  const [collaboratorInvites, setCollaboratorInvites] = useState<SettingsCollaboratorInviteRow[]>([]);
  const [creatingCollaboratorInvite, setCreatingCollaboratorInvite] = useState(false);
  const [plannerInvitePermissions, setPlannerInvitePermissions] = useState<PlannerPermissionKey[]>(getPlannerPermissionPreset('planner'));
  const [revokingCollaboratorInviteId, setRevokingCollaboratorInviteId] = useState<string | null>(null);
  const [rsvpMealOptions, setRsvpMealOptions] = useState<string[]>(['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan']);
  const clearRsvpSettingsStatus = useCallback(() => {
    setRsvpQuestionsSuccess(null);
    setRsvpQuestionsError(null);
  }, []);
  const rsvpDraftGuard = useDraftHydrationGuard(clearRsvpSettingsStatus);

  const [privacyCopyNotice, setPrivacyCopyNotice] = useState<'copied' | 'downloaded' | null>(null);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [visibilitySuccess, setVisibilitySuccess] = useState<string | null>(null);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const clearVisibilityStatus = useCallback(() => {
    setVisibilitySuccess(null);
    setVisibilityError(null);
  }, []);
  const visibilityDraftGuard = useDraftHydrationGuard(clearVisibilityStatus);

  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [settingsRole, setSettingsRole] = useState<PlannerAccessRole>('owner');
  const [settingsPermissions, setSettingsPermissions] = useState<PlannerPermissionKey[] | null>(null);

  const [notifRsvp, setNotifRsvp] = useState(true);
  const [notifPhotos, setNotifPhotos] = useState(true);
  const [notifDigest, setNotifDigest] = useState(false);
  const [notifDigestCadence, setNotifDigestCadence] = useState<DigestCadence>('paused');
  const [notifDigestIncludePlanner, setNotifDigestIncludePlanner] = useState(false);
  const [notifDigestQuietUntilLabel, setNotifDigestQuietUntilLabel] = useState('');
  const [notifDigestNextDeliveryAt, setNotifDigestNextDeliveryAt] = useState<string | null>(null);
  const [notifDigestLastReviewedAt, setNotifDigestLastReviewedAt] = useState<string | null>(null);
  const [notifDigestLastDeliveredAt, setNotifDigestLastDeliveredAt] = useState<string | null>(null);
  const [notifUpdates, setNotifUpdates] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState<string | null>(null);
  const [notifError, setNotifError] = useState<string | null>(null);
  const clearNotifSettingsStatus = useCallback(() => {
    setNotifSuccess(null);
    setNotifError(null);
  }, []);
  const notifDraftGuard = useDraftHydrationGuard(clearNotifSettingsStatus);

  const [currentTemplate, setCurrentTemplate] = useState<string>('base');
  const [changingTemplate, setChangingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSuccess, setTemplateSuccess] = useState<string | null>(null);

  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  const resetPlannerInviteState = useCallback(() => {
    setPlannerInvite(null);
    setPlannerInviteName('');
    setPlannerInviteEmail('');
    setPlannerInviteRole('planner');
    setPlannerInvitePermissions(getPlannerPermissionPreset('planner'));
    setPlannerInviteError(null);
    setPlannerInviteSuccess(null);
  }, []);

  const resetSettingsDashboardState = useCallback(() => {
    visibilityDraftGuard.markSaved();
    rsvpDraftGuard.markSaved();
    notifDraftGuard.markSaved();

    setActiveTab('account');
    setCoupleNames('');
    setWeddingDate(null);
    setVenueName(null);
    setAccountEmail('');
    setAccountSaving(false);
    setAccountSuccess(null);
    setAccountError(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPw(false);
    setShowNewPw(false);
    setShowConfirmPw(false);
    setPasswordSaving(false);
    setPasswordSuccess(null);
    setPasswordError(null);
    setSiteSlug('');
    setMusicPlaylistUrl('');
    setSlugSaving(false);
    setSlugSuccess(null);
    setSlugError(null);
    setDefaultLanguage('en');
    setAllowedLanguages(['en', 'es', 'fr', 'it', 'de', 'pt']);
    setSettingsWeddingData(null);
    setTranslatingLanguage(null);
    setTranslationStatuses([]);
    setPrivacyMode('public');
    setHideFromSearch(false);
    setSitePassword('');
    setShowSitePassword(false);
    setGuestAccessToken(null);
    setIsPublished(false);
    setAnalyticsEnabled(true);
    setAnalyticsRetentionDays(90);
    setAnalyticsGuestNotice('');
    setRsvpQuestions([]);
    setRsvpQuestionsSaving(false);
    setRsvpQuestionsSuccess(null);
    setRsvpQuestionsError(null);
    setCollapsedQuestionIds(new Set());
    setShowAdvancedRsvp(false);
    setShowMealChoiceSettings(false);
    setShowPrivacySettings(false);
    setShowTemplateSettings(false);
    setShowNotificationSettings(false);
    setRsvpMealEnabled(true);
    setCollaboratorInvites([]);
    setCreatingCollaboratorInvite(false);
    setRevokingCollaboratorInviteId(null);
    setRsvpMealOptions(['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan']);
    resetPlannerInviteState();
    setPrivacyCopyNotice(null);
    setVisibilitySaving(false);
    setVisibilitySuccess(null);
    setVisibilityError(null);
    setWeddingSiteId(null);
    setSettingsRole('owner');
    setSettingsPermissions(null);
    setNotifRsvp(true);
    setNotifPhotos(true);
    setNotifDigest(false);
    setNotifDigestCadence('paused');
    setNotifDigestIncludePlanner(false);
    setNotifDigestQuietUntilLabel('');
    setNotifDigestNextDeliveryAt(null);
    setNotifDigestLastReviewedAt(null);
    setNotifDigestLastDeliveredAt(null);
    setNotifUpdates(false);
    setNotifSaving(false);
    setNotifSuccess(null);
    setNotifError(null);
    setCurrentTemplate('base');
    setChangingTemplate(false);
    setTemplateError(null);
    setTemplateSuccess(null);
    setBillingInfo(null);
    setBillingLoading(false);
    setBillingError(null);
    setSubscribeLoading(false);
    setSubscribeError(null);
  }, [notifDraftGuard, rsvpDraftGuard, visibilityDraftGuard, resetPlannerInviteState]);

  useEffect(() => {
    if (previousUserIdRef.current && userId && previousUserIdRef.current !== userId) {
      resetSettingsDashboardState();
    }
    previousUserIdRef.current = userId ?? null;
  }, [resetSettingsDashboardState, userId]);

  useEffect(() => {
    if (!userId) {
      resetSettingsDashboardState();
      return;
    }
    if (settingsRole !== 'owner') {
      setBillingInfo(null);
      setBillingLoading(false);
      setBillingError(null);
      setSubscribeLoading(false);
      setSubscribeError(null);
      return;
    }
    if (activeTab !== 'billing' || billingInfo) return;
    let cancelled = false;
    setBillingLoading(true);
    setBillingError(null);
    fetchBillingInfo(userId)
      .then((info) => {
        if (!cancelled) setBillingInfo(info);
      })
      .catch((err) => {
        if (!cancelled) setBillingError(safeSettingsError(err, 'Couldn’t load billing right now.'));
      })
      .finally(() => {
        if (!cancelled) setBillingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, billingInfo, resetSettingsDashboardState, settingsRole, userId]);

  useEffect(() => {
    if (settingsRole !== 'owner' && (activeTab === 'team' || activeTab === 'billing')) {
      setActiveTab(canManageSettings(settingsRole, settingsPermissions) ? 'site' : 'account');
      return;
    }
    if (activeTab !== 'account' && !canManageSettings(settingsRole, settingsPermissions)) {
      setActiveTab('account');
    }
  }, [activeTab, settingsPermissions, settingsRole]);

  useEffect(() => {
    const invite = readPlannerInvite(siteSlug || userId || null);
    if (!invite) {
      resetPlannerInviteState();
      return;
    }
    setPlannerInvite(invite);
    setPlannerInviteName(invite.name);
    setPlannerInviteEmail(invite.email);
    setPlannerInviteRole(invite.role);
    setPlannerInvitePermissions(getPlannerPermissionPreset(invite.role));
  }, [resetPlannerInviteState, siteSlug, userId]);

  return {
    activeTab,
    accountEmail,
    accountError,
    accountSaving,
    accountSuccess,
    billingError,
    billingInfo,
    billingLoading,
    changingTemplate,
    analyticsEnabled,
    analyticsRetentionDays,
    analyticsGuestNotice,
    collapsedQuestionIds,
    collaboratorInvites,
    confirmPassword,
    coupleNames,
    creatingCollaboratorInvite,
    currentPassword,
    currentTemplate,
    defaultLanguage,
    allowedLanguages,
    guestAccessToken,
    isPublished,
    hideFromSearch,
    musicPlaylistUrl,
    newPassword,
    notifDigest,
    notifDigestCadence,
    notifDigestIncludePlanner,
    notifDigestQuietUntilLabel,
    notifDigestNextDeliveryAt,
    notifDigestLastReviewedAt,
    notifDigestLastDeliveredAt,
    notifDraftGuard,
    notifError,
    notifPhotos,
    notifRsvp,
    notifSaving,
    notifSuccess,
    notifUpdates,
    passwordError,
    passwordSaving,
    passwordSuccess,
    plannerInvite,
    plannerInviteEmail,
    plannerInviteError,
    plannerInviteName,
    plannerInvitePermissions,
    plannerInviteRole,
    plannerInviteSuccess,
    privacyCopyNotice,
    privacyMode,
    rsvpDraftGuard,
    rsvpMealEnabled,
    rsvpMealOptions,
    rsvpQuestions,
    rsvpQuestionsError,
    rsvpQuestionsSaving,
    rsvpQuestionsSuccess,
    revokingCollaboratorInviteId,
    settingsRole,
    settingsPermissions,
    showAdvancedRsvp,
    showConfirmPw,
    showCurrentPw,
    showMealChoiceSettings,
    showNewPw,
    showNotificationSettings,
    showPrivacySettings,
    showSitePassword,
    showTemplateSettings,
    sitePassword,
    siteSlug,
    slugError,
    slugSaving,
    slugSuccess,
    subscribeError,
    subscribeLoading,
    templateError,
    templateSuccess,
    translatingLanguage,
    translationStatuses,
    settingsWeddingData,
    venueName,
    visibilityDraftGuard,
    visibilityError,
    visibilitySaving,
    visibilitySuccess,
    weddingDate,
    weddingSiteId,
    setActiveTab,
    setAccountEmail,
    setAccountError,
    setAccountSaving,
    setAccountSuccess,
    setBillingError,
    setBillingInfo,
    setBillingLoading,
    setChangingTemplate,
    setAnalyticsEnabled,
    setAnalyticsRetentionDays,
    setAnalyticsGuestNotice,
    setCollapsedQuestionIds,
    setCollaboratorInvites,
    setConfirmPassword,
    setCoupleNames,
    setCreatingCollaboratorInvite,
    setCurrentPassword,
    setCurrentTemplate,
    setDefaultLanguage,
    setAllowedLanguages,
    setGuestAccessToken,
    setIsPublished,
    setHideFromSearch,
    setMusicPlaylistUrl,
    setNewPassword,
    setNotifDigest,
    setNotifDigestCadence,
    setNotifDigestIncludePlanner,
    setNotifDigestQuietUntilLabel,
    setNotifDigestNextDeliveryAt,
    setNotifDigestLastReviewedAt,
    setNotifDigestLastDeliveredAt,
    setNotifError,
    setNotifPhotos,
    setNotifRsvp,
    setNotifSaving,
    setNotifSuccess,
    setNotifUpdates,
    setPasswordError,
    setPasswordSaving,
    setPasswordSuccess,
    setPlannerInvite,
    setPlannerInviteEmail,
    setPlannerInviteError,
    setPlannerInviteName,
    setPlannerInvitePermissions,
    setPlannerInviteRole,
    setPlannerInviteSuccess,
    setPrivacyCopyNotice,
    setPrivacyMode,
    setRsvpMealEnabled,
    setRsvpMealOptions,
    setRsvpQuestions,
    setRsvpQuestionsError,
    setRsvpQuestionsSaving,
    setRsvpQuestionsSuccess,
    setRevokingCollaboratorInviteId,
    setSettingsRole,
    setSettingsPermissions,
    setShowAdvancedRsvp,
    setShowConfirmPw,
    setShowCurrentPw,
    setShowMealChoiceSettings,
    setShowNewPw,
    setShowNotificationSettings,
    setShowPrivacySettings,
    setShowSitePassword,
    setShowTemplateSettings,
    setSitePassword,
    setSiteSlug,
    setSlugError,
    setSlugSaving,
    setSlugSuccess,
    setSubscribeError,
    setSubscribeLoading,
    setTemplateError,
    setTemplateSuccess,
    setTranslatingLanguage,
    setTranslationStatuses,
    setSettingsWeddingData,
    setVenueName,
    setVisibilityError,
    setVisibilitySaving,
    setVisibilitySuccess,
    setWeddingDate,
    setWeddingSiteId,
  };
}
