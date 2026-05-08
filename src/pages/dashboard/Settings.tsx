import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getPlannerPermissionPreset } from '../../lib/plannerAccess';
import { useToast } from '../../components/ui/Toast';
import { getSafePublicWebUrl } from '../../sections/publicLinks';
import {
  type SettingsCollaboratorInviteRow,
} from './settings/settingsSiteData';
import {
  type SiteLanguageCode,
} from './settings/settingsDashboardTypes';
import {
  safeSettingsError,
} from './settings/settingsDashboardUtils';
import { buildSettingsDashboardViewModel } from './settings/buildSettingsDashboardViewModel';
import { SettingsDashboardRouteContent } from './settings/SettingsDashboardRouteContent';
import { useSettingsAccountActions } from './settings/useSettingsAccountActions';
import { useSettingsDashboardSupport } from './settings/useSettingsDashboardSupport';
import { useSettingsSiteAccessActions } from './settings/useSettingsSiteAccessActions';
import { useSettingsExperienceActions } from './settings/useSettingsExperienceActions';
import { useSettingsDashboardSnapshotHydration } from './settings/useSettingsDashboardSnapshotHydration';
import { useSettingsDashboardUiState } from './settings/useSettingsDashboardUiState';

export const DashboardSettings: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isDemoMode, signOut } = useAuth();
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
    collapsedQuestionIds,
    collaboratorInvites,
    confirmPassword,
    coupleNames,
    creatingCollaboratorInvite,
    currentPassword,
    currentTemplate,
    defaultLanguage,
    guestAccessToken,
    hideFromSearch,
    musicPlaylistUrl,
    newPassword,
    notifDigest,
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
    privacyCopied,
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
    setCollapsedQuestionIds,
    setCollaboratorInvites,
    setConfirmPassword,
    setCoupleNames,
    setCreatingCollaboratorInvite,
    setCurrentPassword,
    setCurrentTemplate,
    setDefaultLanguage,
    setGuestAccessToken,
    setHideFromSearch,
    setMusicPlaylistUrl,
    setNewPassword,
    setNotifDigest,
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
    setPrivacyCopied,
    setPrivacyMode,
    setRsvpMealEnabled,
    setRsvpMealOptions,
    setRsvpQuestions,
    setRsvpQuestionsError,
    setRsvpQuestionsSaving,
    setRsvpQuestionsSuccess,
    setRevokingCollaboratorInviteId,
    setSettingsRole,
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
    setVenueName,
    setVisibilityError,
    setVisibilitySaving,
    setVisibilitySuccess,
    setWeddingDate,
    setWeddingSiteId,
  } = useSettingsDashboardUiState({ userId: user?.id });
  const safeMusicPlaylistUrl = getSafePublicWebUrl(musicPlaylistUrl);

  const handleLogout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

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
    setCollaboratorInvites,
    setCoupleNames,
    setCurrentTemplate,
    setDefaultLanguage,
    setGuestAccessToken,
    setHideFromSearch,
    setMusicPlaylistUrl,
    setNotifDigest,
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
    plannerRoleOptions,
    publicSiteUrl,
    tabs,
    weddingIdentityExportKit,
    weddingIdentityPrintAssets,
  } = useMemo(() => buildSettingsDashboardViewModel({
    coupleNames,
    currentTemplate,
    defaultLanguage,
    settingsRole,
    siteSlug,
    venueName,
    weddingDate,
  }), [coupleNames, currentTemplate, defaultLanguage, settingsRole, siteSlug, venueName, weddingDate]);

  const {
    copyIdentityManifest,
    copyInviteLink,
    downloadIdentityPrintPack,
    handleAutoTranslateLanguage,
    handleCopyCollaboratorInviteLink,
    handleCreateCollaboratorInvite,
    handleDefaultLanguageChange,
    handleRegenerateToken,
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
    privacyMode,
    hideFromSearch,
    defaultLanguage,
    sitePassword,
    guestAccessToken,
    musicPlaylistUrl,
    weddingIdentityExportKit,
    weddingIdentityPrintAssets,
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
    setPrivacyCopied,
    setRevokingCollaboratorInviteId,
    setSitePassword,
    setSiteSlug,
    setSlugError,
    setSlugSaving,
    setSlugSuccess,
    setTranslatingLanguage,
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
    setSubscribeLoading,
    setSubscribeError,
    setChangingTemplate,
    setTemplateError,
    setTemplateSuccess,
    setCurrentTemplate,
  });

  return (
    <SettingsDashboardRouteContent
      accountEmail={accountEmail}
      accountError={accountError}
      accountSaving={accountSaving}
      accountSuccess={accountSuccess}
      activeTab={activeTab}
      billingError={billingError}
      billingInfo={billingInfo}
      billingLoading={billingLoading}
      changingTemplate={changingTemplate}
      collapsedQuestionIds={collapsedQuestionIds}
      collaboratorInvites={collaboratorInvites}
      confirmPassword={confirmPassword}
      coupleNames={coupleNames}
      creatingCollaboratorInvite={creatingCollaboratorInvite}
      currentPassword={currentPassword}
      currentTemplate={currentTemplate}
      defaultLanguage={defaultLanguage}
      guestAccessToken={guestAccessToken}
      onAutoTranslateLanguage={handleAutoTranslateLanguage}
      handleCopyCollaboratorInviteLink={handleCopyCollaboratorInviteLink}
      handleCreateCollaboratorInvite={handleCreateCollaboratorInvite}
      handleDefaultLanguageChange={handleDefaultLanguageChange}
      handleLogout={handleLogout}
      handleRegenerateToken={handleRegenerateToken}
      handleRemovePlannerInvite={handleRemovePlannerInvite}
      handleResendCollaboratorInvite={handleResendCollaboratorInvite}
      handleRevokeCollaboratorInvite={handleRevokeCollaboratorInvite}
      handleSaveAccount={handleSaveAccount}
      handleSaveMusicPlaylist={handleSaveMusicPlaylist}
      handleSaveNotifications={handleSaveNotifications}
      handleSavePlannerInvite={handleSavePlannerInvite}
      handleSavePrivacy={handleSavePrivacy}
      handleSaveRsvpQuestions={handleSaveRsvpQuestions}
      handleSubscribe={handleSubscribe}
      handleTemplateChange={handleTemplateChange}
      handleUpdatePassword={handleUpdatePassword}
      handleUpdateSlug={handleUpdateSlug}
      hideFromSearch={hideFromSearch}
      musicPlaylistUrl={musicPlaylistUrl}
      newPassword={newPassword}
      notifDigest={notifDigest}
      notifDraftMarkDirty={notifDraftGuard.markDirty}
      notifError={notifError}
      notifPhotos={notifPhotos}
      notifRsvp={notifRsvp}
      notifSaving={notifSaving}
      notifSuccess={notifSuccess}
      notifUpdates={notifUpdates}
      onCopyIdentityManifest={copyIdentityManifest}
      onCopyInviteLink={copyInviteLink}
      onDownloadIdentityPrintPack={downloadIdentityPrintPack}
      passwordError={passwordError}
      passwordSaving={passwordSaving}
      passwordSuccess={passwordSuccess}
      plannerInvite={plannerInvite}
      plannerInviteEmail={plannerInviteEmail}
      plannerInviteError={plannerInviteError}
      plannerInviteName={plannerInviteName}
      plannerInvitePermissions={plannerInvitePermissions}
      plannerInviteRole={plannerInviteRole}
      plannerInviteSuccess={plannerInviteSuccess}
      plannerRoleOptions={plannerRoleOptions}
      privacyCopied={privacyCopied}
      privacyMode={privacyMode}
      publicSiteUrl={publicSiteUrl}
      revokingCollaboratorInviteId={revokingCollaboratorInviteId}
      rsvpDraftMarkDirty={rsvpDraftGuard.markDirty}
      rsvpMealEnabled={rsvpMealEnabled}
      rsvpMealOptions={rsvpMealOptions}
      rsvpQuestions={rsvpQuestions}
      rsvpQuestionsError={rsvpQuestionsError}
      rsvpQuestionsSaving={rsvpQuestionsSaving}
      rsvpQuestionsSuccess={rsvpQuestionsSuccess}
      safeMusicPlaylistUrl={safeMusicPlaylistUrl}
      saveRsvpSettings={saveRsvpSettings}
      setActiveTab={setActiveTab}
      setCollapsedQuestionIds={setCollapsedQuestionIds}
      setConfirmPassword={setConfirmPassword}
      setCoupleNames={setCoupleNames}
      setCurrentPassword={setCurrentPassword}
      setHideFromSearch={setHideFromSearch}
      setMusicPlaylistUrl={setMusicPlaylistUrl}
      setNewPassword={setNewPassword}
      setNotifDigest={setNotifDigest}
      setNotifPhotos={setNotifPhotos}
      setNotifRsvp={setNotifRsvp}
      setNotifUpdates={setNotifUpdates}
      setPlannerInviteEmail={setPlannerInviteEmail}
      setPlannerInviteName={setPlannerInviteName}
      setPlannerInvitePermissions={setPlannerInvitePermissions}
      setPlannerInviteRole={setPlannerInviteRole}
      setPrivacyMode={setPrivacyMode}
      setRsvpMealEnabled={setRsvpMealEnabled}
      setRsvpMealOptions={setRsvpMealOptions}
      setRsvpQuestions={setRsvpQuestions}
      setShowAdvancedRsvp={setShowAdvancedRsvp}
      setShowConfirmPw={setShowConfirmPw}
      setShowCurrentPw={setShowCurrentPw}
      setShowMealChoiceSettings={setShowMealChoiceSettings}
      setShowNewPw={setShowNewPw}
      setShowNotificationSettings={setShowNotificationSettings}
      setShowPrivacySettings={setShowPrivacySettings}
      setShowSitePassword={setShowSitePassword}
      setShowTemplateSettings={setShowTemplateSettings}
      setSitePassword={setSitePassword}
      setSiteSlug={setSiteSlug}
      settingsRole={settingsRole}
      showAdvancedRsvp={showAdvancedRsvp}
      showConfirmPw={showConfirmPw}
      showCurrentPw={showCurrentPw}
      showMealChoiceSettings={showMealChoiceSettings}
      showNewPw={showNewPw}
      showNotificationSettings={showNotificationSettings}
      showPrivacySettings={showPrivacySettings}
      showSitePassword={showSitePassword}
      showTemplateSettings={showTemplateSettings}
      sitePassword={sitePassword}
      siteSlug={siteSlug}
      slugError={slugError}
      slugSaving={slugSaving}
      slugSuccess={slugSuccess}
      subscribeError={subscribeError}
      subscribeLoading={subscribeLoading}
      tabs={tabs}
      templateError={templateError}
      templateSuccess={templateSuccess}
      togglePlannerPermission={togglePlannerPermission}
      translatingLanguage={translatingLanguage}
      translationStatuses={translationStatuses}
      visibilityDraftMarkDirty={visibilityDraftGuard.markDirty}
      visibilityError={visibilityError}
      visibilitySaving={visibilitySaving}
      visibilitySuccess={visibilitySuccess}
      weddingIdentityExportKit={weddingIdentityExportKit}
      weddingIdentityPrintAssets={weddingIdentityPrintAssets}
    />
  );
};
