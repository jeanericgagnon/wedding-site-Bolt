import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import {
  type SettingsCollaboratorInviteRow,
} from './settings/settingsSiteData';
import {
  type SiteLanguageCode,
} from './settings/settingsDashboardTypes';
import {
  safeSettingsError,
} from './settings/settingsDashboardUtils';
import { buildSettingsDashboardRouteContentProps } from './settings/buildSettingsDashboardRouteContentProps';
import { SettingsDashboardRouteContent } from './settings/SettingsDashboardRouteContent';
import { useSettingsAccountActions } from './settings/useSettingsAccountActions';
import { useSettingsDashboardSupport } from './settings/useSettingsDashboardSupport';
import { useSettingsSiteAccessActions } from './settings/useSettingsSiteAccessActions';
import { useSettingsExperienceActions } from './settings/useSettingsExperienceActions';
import { useSettingsDashboardSnapshotHydration } from './settings/useSettingsDashboardSnapshotHydration';
import { useSettingsDashboardUiState } from './settings/useSettingsDashboardUiState';
import { useSettingsDashboardRouteSupport } from './settings/useSettingsDashboardRouteSupport';
import { resolveSettingsRouteState } from './settings/settingsRouteState';

export const DashboardSettings: React.FC = () => {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isDemoMode, signOut } = useAuth();
  const identityExportsQaMode = searchParams.get('identityExportsQa') === '1';
  const {
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
    allowedLanguages,
    defaultLanguage,
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
    setAllowedLanguages,
    setDefaultLanguage,
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
  } = useSettingsDashboardUiState({ userId: user?.id });
  const isPublishedForIdentityExports = isPublished || identityExportsQaMode;

  React.useEffect(() => {
    const routeState = resolveSettingsRouteState({
      search: location.search,
      settingsPermissions,
      settingsRole,
    });

    const nextTab = routeState.activeTab ?? 'account';
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }

    if (routeState.activeTab !== 'site' || !routeState.focusTargetId) return;

    const scrollToTarget = () => {
      const target = document.getElementById(routeState.focusTargetId ?? '');
      if (!target) return false;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    };

    if (scrollToTarget()) return;
    const timeout = window.setTimeout(scrollToTarget, 50);
    return () => window.clearTimeout(timeout);
  }, [activeTab, location.search, setActiveTab, settingsPermissions, settingsRole]);

  const {
    downloadTextFile,
    loadCollaboratorInvites,
    loadTranslationStatuses,
    logSettingsAction,
    resolveSettingsSiteId,
  } = useSettingsDashboardSupport({
    setCollaboratorInvites,
    setTranslationStatuses,
    setWeddingSiteId,
    userId: user?.id,
    weddingSiteId,
  });

  useSettingsDashboardSnapshotHydration({
    isDemoMode,
    notifDraftGuard,
    rsvpDraftGuard,
    setAccountEmail,
    setAccountError,
    setAllowedLanguages,
    setAnalyticsEnabled,
    setAnalyticsGuestNotice,
    setAnalyticsRetentionDays,
    setCollaboratorInvites,
    setCoupleNames,
    setCurrentTemplate,
    setDefaultLanguage,
    setGuestAccessToken,
    setHideFromSearch,
    setIsPublished,
    setMusicPlaylistUrl,
    setNotifDigest,
    setNotifDigestCadence,
    setNotifDigestIncludePlanner,
    setNotifDigestQuietUntilLabel,
    setNotifDigestNextDeliveryAt,
    setNotifDigestLastReviewedAt,
    setNotifDigestLastDeliveredAt,
    setNotifPhotos,
    setNotifRsvp,
    setNotifUpdates,
    setPrivacyMode,
    setRsvpMealEnabled,
    setRsvpMealOptions,
    setRsvpQuestions,
    setSettingsRole,
    setSettingsPermissions,
    setSiteSlug,
    setSettingsWeddingData,
    setTranslationStatuses,
    setVenueName,
    setWeddingDate,
    setWeddingSiteId,
    userEmail: user?.email ?? null,
    userId: user?.id ?? null,
    visibilityDraftGuard,
  });

  const {
    handleSaveAccount,
    handleUpdatePassword,
  } = useSettingsAccountActions({
    coupleNames,
    currentPassword,
    newPassword,
    confirmPassword,
    logSettingsAction,
    setAccountError,
    setAccountSaving,
    setAccountSuccess,
    setConfirmPassword,
    setCurrentPassword,
    setNewPassword,
    setPasswordError,
    setPasswordSaving,
    setPasswordSuccess,
    weddingSiteId,
  });

  const {
    handleLogout,
    plannerRoleOptions,
    publicSiteUrl,
    safeMusicPlaylistUrl,
    tabs,
    weddingIdentityExportKit,
    weddingIdentityPrintAssets,
    weddingIdentityStoryGraphic,
    weddingIdentityStyleKit,
  } = useSettingsDashboardRouteSupport({
    coupleNames,
    currentTemplate,
    defaultLanguage,
    isPublished: isPublishedForIdentityExports,
    musicPlaylistUrl,
    navigate,
    settingsRole,
    settingsPermissions,
    signOut,
    siteSlug,
    venueName,
    weddingDate,
  });

  const {
    copyIdentityManifest,
    copyIdentityStyleKit,
    copyInviteLink,
    downloadIdentityStoryGraphic,
    downloadIdentityPrintPack,
    handleAllowedLanguagesChange,
    handleAutoTranslateLanguage,
    handleCopyCollaboratorInviteLink,
    handleClearCollaboratorInviteTestFixtures,
    handleCreateCollaboratorInvite,
    handleDefaultLanguageChange,
    handleRegenerateToken,
    handleRevealCollaboratorInviteLink,
    handleRemovePlannerInvite,
    handleResendCollaboratorInvite,
    handleRevokeCollaboratorInvite,
    handleSaveMusicPlaylist,
    handleSavePlannerInvite,
    handleSavePrivacy,
    handleUpdateSlug,
    togglePlannerPermission,
  } = useSettingsSiteAccessActions({
    userId: user?.id,
    siteSlug,
    weddingSiteId,
    plannerInvite,
    plannerInviteName,
    plannerInviteEmail,
    plannerInviteRole,
    plannerInvitePermissions,
    collaboratorInvites,
    isPublished: isPublishedForIdentityExports,
    privacyMode,
    hideFromSearch,
    allowedLanguages,
    defaultLanguage,
    analyticsEnabled,
    analyticsRetentionDays,
    analyticsGuestNotice,
    settingsWeddingData,
    sitePassword,
    guestAccessToken,
    musicPlaylistUrl,
    weddingIdentityExportKit,
    weddingIdentityPrintAssets,
    weddingIdentityStoryGraphic,
    weddingIdentityStyleKit,
    resolveSettingsSiteId,
    loadCollaboratorInvites,
    loadTranslationStatuses,
    logSettingsAction,
    toast,
    visibilityDraftGuard,
    downloadTextFile,
    setPlannerInvite,
    setPlannerInviteName,
    setPlannerInviteEmail,
    setPlannerInviteRole,
    setPlannerInvitePermissions,
    setCreatingCollaboratorInvite,
    setDefaultLanguage,
    setGuestAccessToken,
    setPlannerInviteError,
    setPlannerInviteSuccess,
    setPrivacyCopyNotice,
    setRevokingCollaboratorInviteId,
    setSitePassword,
    setSiteSlug,
    setSlugError,
    setSlugSaving,
    setSlugSuccess,
    setTranslatingLanguage,
    setAllowedLanguages,
    setSettingsWeddingData,
    setVisibilityError,
    setVisibilitySaving,
    setVisibilitySuccess,
    setWeddingSiteId,
  });

  const {
    handleSaveNotifications,
    handleSaveRsvpQuestions,
    handleSubscribe,
    handleTemplateChange,
    saveRsvpSettings,
  } = useSettingsExperienceActions({
    userId: user?.id,
    isDemoMode,
    weddingSiteId,
    rsvpQuestions,
    rsvpMealEnabled,
    rsvpMealOptions,
    notifRsvp,
    notifPhotos,
    notifDigest,
    notifDigestCadence,
    notifDigestIncludePlanner,
    notifDigestQuietUntilLabel,
    notifDigestLastDeliveredAt,
    notifUpdates,
    billingInfo,
    resolveSettingsSiteId,
    logSettingsAction,
    rsvpDraftGuard,
    notifDraftGuard,
    setWeddingSiteId,
    setRsvpQuestions,
    setRsvpMealOptions,
    setRsvpQuestionsSaving,
    setRsvpQuestionsSuccess,
    setRsvpQuestionsError,
    setNotifSaving,
    setNotifSuccess,
    setNotifError,
    setNotifDigestNextDeliveryAt,
    setNotifDigestLastReviewedAt,
    setSubscribeLoading,
    setSubscribeError,
    setChangingTemplate,
    setTemplateError,
    setTemplateSuccess,
    setCurrentTemplate,
  });

  const clearVisibilityFeedback = React.useCallback(() => {
    setVisibilityError(null);
    setVisibilitySuccess(null);
  }, [setVisibilityError, setVisibilitySuccess]);

  const clearRsvpFeedback = React.useCallback(() => {
    setRsvpQuestionsError(null);
    setRsvpQuestionsSuccess(null);
  }, [setRsvpQuestionsError, setRsvpQuestionsSuccess]);

  const clearNotificationFeedback = React.useCallback(() => {
    setNotifError(null);
    setNotifSuccess(null);
  }, [setNotifError, setNotifSuccess]);

  const settingsDashboardRouteContentProps = buildSettingsDashboardRouteContentProps({
    accountEmail,
    accountError,
    accountSaving,
    accountSuccess,
    activeTab,
    billingError,
    billingInfo,
    billingLoading,
    changingTemplate,
    collapsedQuestionIds,
    collaboratorInvites,
    confirmPassword,
    coupleNames,
    creatingCollaboratorInvite,
    currentPassword,
    currentTemplate,
    allowedLanguages,
    analyticsEnabled,
    analyticsRetentionDays,
    analyticsGuestNotice,
    defaultLanguage,
    guestAccessToken,
    isPublished: isPublishedForIdentityExports,
    onAutoTranslateLanguage: handleAutoTranslateLanguage,
    handleAllowedLanguagesChange,
    handleCopyCollaboratorInviteLink,
    handleClearCollaboratorInviteTestFixtures,
    handleCreateCollaboratorInvite,
    handleDefaultLanguageChange,
    handleLogout,
    handleRegenerateToken,
    handleRevealCollaboratorInviteLink,
    handleRemovePlannerInvite,
    handleResendCollaboratorInvite,
    handleRevokeCollaboratorInvite,
    handleSaveAccount,
    handleSaveMusicPlaylist,
    handleSaveNotifications,
    handleSavePlannerInvite,
    handleSavePrivacy,
    handleSaveRsvpQuestions,
    handleSubscribe,
    handleTemplateChange,
    handleUpdatePassword,
    handleUpdateSlug,
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
    notifDraftMarkDirty: notifDraftGuard.markDirty,
    notifError,
    notifPhotos,
    notifRsvp,
    notifSaving,
    notifSuccess,
    notifUpdates,
    onCopyIdentityManifest: copyIdentityManifest,
    onCopyIdentityStyleKit: copyIdentityStyleKit,
    onCopyInviteLink: copyInviteLink,
    onDownloadIdentityStoryGraphic: downloadIdentityStoryGraphic,
    onDownloadIdentityPrintPack: downloadIdentityPrintPack,
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
    plannerRoleOptions,
    privacyCopyNotice,
    privacyMode,
    publicSiteUrl,
    revokingCollaboratorInviteId,
    rsvpDraftMarkDirty: rsvpDraftGuard.markDirty,
    rsvpMealEnabled,
    rsvpMealOptions,
    rsvpQuestions,
    rsvpQuestionsError,
    rsvpQuestionsSaving,
    rsvpQuestionsSuccess,
    safeMusicPlaylistUrl,
    saveRsvpSettings,
    setActiveTab,
    setCollapsedQuestionIds,
    setConfirmPassword: (value) => {
      setPasswordError(null);
      setPasswordSuccess(null);
      setConfirmPassword(value);
    },
    setCoupleNames: (value) => {
      setAccountError(null);
      setAccountSuccess(null);
      setCoupleNames(value);
    },
    setCurrentPassword: (value) => {
      setPasswordError(null);
      setPasswordSuccess(null);
      setCurrentPassword(value);
    },
    setHideFromSearch: (value) => {
      clearVisibilityFeedback();
      setHideFromSearch(value);
    },
    setAnalyticsEnabled: (value) => {
      clearVisibilityFeedback();
      setAnalyticsEnabled(value);
    },
    setAnalyticsRetentionDays: (value) => {
      clearVisibilityFeedback();
      setAnalyticsRetentionDays(value);
    },
    setAnalyticsGuestNotice: (value) => {
      clearVisibilityFeedback();
      setAnalyticsGuestNotice(value);
    },
    setMusicPlaylistUrl: (value) => {
      clearVisibilityFeedback();
      setMusicPlaylistUrl(value);
    },
    setNewPassword: (value) => {
      setPasswordError(null);
      setPasswordSuccess(null);
      setNewPassword(value);
    },
    setNotifDigest: (value) => {
      clearNotificationFeedback();
      setNotifDigest(value);
    },
    setNotifDigestCadence: (value) => {
      clearNotificationFeedback();
      setNotifDigestCadence(value);
    },
    setNotifDigestIncludePlanner: (value) => {
      clearNotificationFeedback();
      setNotifDigestIncludePlanner(value);
    },
    setNotifDigestQuietUntilLabel: (value) => {
      clearNotificationFeedback();
      setNotifDigestQuietUntilLabel(value);
    },
    setNotifPhotos: (value) => {
      clearNotificationFeedback();
      setNotifPhotos(value);
    },
    setNotifRsvp: (value) => {
      clearNotificationFeedback();
      setNotifRsvp(value);
    },
    setNotifUpdates: (value) => {
      clearNotificationFeedback();
      setNotifUpdates(value);
    },
    setPlannerInviteEmail: (value) => {
      setPlannerInviteError(null);
      setPlannerInviteSuccess(null);
      setPlannerInviteEmail(value);
    },
    setPlannerInviteName: (value) => {
      setPlannerInviteError(null);
      setPlannerInviteSuccess(null);
      setPlannerInviteName(value);
    },
    setPlannerInvitePermissions: (value) => {
      setPlannerInviteError(null);
      setPlannerInviteSuccess(null);
      setPlannerInvitePermissions(value);
    },
    setPlannerInviteRole: (value) => {
      setPlannerInviteError(null);
      setPlannerInviteSuccess(null);
      setPlannerInviteRole(value);
    },
    setPrivacyMode: (value) => {
      clearVisibilityFeedback();
      setPrivacyMode(value);
    },
    setRsvpMealEnabled: (value) => {
      clearRsvpFeedback();
      setRsvpMealEnabled(value);
    },
    setRsvpMealOptions: (value) => {
      clearRsvpFeedback();
      setRsvpMealOptions(value);
    },
    setRsvpQuestions: (value) => {
      clearRsvpFeedback();
      setRsvpQuestions(value);
    },
    setShowAdvancedRsvp,
    setShowConfirmPw,
    setShowCurrentPw,
    setShowMealChoiceSettings,
    setShowNewPw,
    setShowNotificationSettings,
    setShowPrivacySettings,
    setShowSitePassword,
    setShowTemplateSettings,
    setSitePassword: (value) => {
      clearVisibilityFeedback();
      setSitePassword(value);
    },
    setSiteSlug: (value) => {
      setSlugError(null);
      setSlugSuccess(null);
      setSiteSlug(value);
    },
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
    tabs,
    templateError,
    templateSuccess,
    togglePlannerPermission,
    translatingLanguage,
    translationStatuses,
    visibilityDraftMarkDirty: visibilityDraftGuard.markDirty,
    visibilityError,
    visibilitySaving,
    visibilitySuccess,
    hasWeddingIdentityStoryGraphic: Boolean(weddingIdentityStoryGraphic),
    weddingIdentityExportKit,
    weddingIdentityPrintAssets,
  });

  return (
    <SettingsDashboardRouteContent {...settingsDashboardRouteContentProps} />
  );
};
