import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Select, Badge } from '../../components/ui';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { PLANNER_ROLE_OPTIONS, getPlannerPermissionPreset } from '../../lib/plannerAccess';
import { useToast } from '../../components/ui/Toast';
import { getSafePublicWebUrl } from '../../sections/publicLinks';
import {
  type SettingsCollaboratorInviteRow,
} from './settings/settingsSiteData';
import {
  type RSVPQuestionSetting,
  type SiteLanguageCode,
  type TranslationLanguageCode,
  type TranslationStatusRow,
} from './settings/settingsDashboardTypes';
import {
  makeQuestion,
  safeSettingsError,
} from './settings/settingsDashboardUtils';
import { buildSettingsDashboardViewModel } from './settings/buildSettingsDashboardViewModel';
import { SettingsAccountPanel } from './settings/SettingsAccountPanel';
import { SettingsBillingPanel } from './settings/SettingsBillingPanel';
import { SettingsNavigation, type SettingsTabId } from './settings/SettingsNavigation';
import { SettingsNotificationsPanel } from './settings/SettingsNotificationsPanel';
import { SettingsRsvpTabContent } from './settings/SettingsRsvpTabContent';
import { SettingsSiteTabContent } from './settings/SettingsSiteTabContent';
import { SettingsTeamAccessPanel } from './settings/SettingsTeamAccessPanel';
import { SettingsDashboardShell } from './settings/SettingsDashboardShell';
import { SettingsTabContent } from './settings/SettingsTabContent';
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
    <SettingsDashboardShell
      activeTab={activeTab}
      defaultLanguage={defaultLanguage}
      onTabChange={setActiveTab}
      rsvpQuestionCount={rsvpQuestions.length}
      settingsRole={settingsRole}
      tabs={tabs}
    >
      <SettingsTabContent
        activeTab={activeTab}
        accountContent={(
          <SettingsAccountPanel
            coupleNames={coupleNames}
            accountEmail={accountEmail}
            accountSaving={accountSaving}
            accountSuccess={accountSuccess}
            accountError={accountError}
            currentPassword={currentPassword}
            newPassword={newPassword}
            confirmPassword={confirmPassword}
            showCurrentPw={showCurrentPw}
            showNewPw={showNewPw}
            showConfirmPw={showConfirmPw}
            passwordSaving={passwordSaving}
            passwordSuccess={passwordSuccess}
            passwordError={passwordError}
            onCoupleNamesChange={setCoupleNames}
            onCurrentPasswordChange={setCurrentPassword}
            onNewPasswordChange={setNewPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onToggleCurrentPassword={() => setShowCurrentPw((value) => !value)}
            onToggleNewPassword={() => setShowNewPw((value) => !value)}
            onToggleConfirmPassword={() => setShowConfirmPw((value) => !value)}
            onSaveAccount={handleSaveAccount}
            onUpdatePassword={handleUpdatePassword}
            onLogout={handleLogout}
          />
        )}
        teamContent={(
          <SettingsTeamAccessPanel
            collaboratorInvites={collaboratorInvites}
            creatingCollaboratorInvite={creatingCollaboratorInvite}
            onCopyCollaboratorInviteLink={handleCopyCollaboratorInviteLink}
            onCreateCollaboratorInvite={() => { void handleCreateCollaboratorInvite(); }}
            onPlannerInviteEmailChange={setPlannerInviteEmail}
            onPlannerInviteNameChange={setPlannerInviteName}
            onPlannerInviteRoleChange={(nextRole) => {
              setPlannerInviteRole(nextRole);
              setPlannerInvitePermissions(getPlannerPermissionPreset(nextRole));
            }}
            onRemovePlannerInvite={handleRemovePlannerInvite}
            onResendCollaboratorInvite={(inviteToken) => { void handleResendCollaboratorInvite(inviteToken); }}
            onRevokeCollaboratorInvite={(inviteId) => { void handleRevokeCollaboratorInvite(inviteId); }}
            onSavePlannerInvite={handleSavePlannerInvite}
            onTogglePlannerPermission={togglePlannerPermission}
            plannerInvite={plannerInvite}
            plannerInviteEmail={plannerInviteEmail}
            plannerInviteError={plannerInviteError}
            plannerInviteName={plannerInviteName}
            plannerInvitePermissions={plannerInvitePermissions}
            plannerInviteRole={plannerInviteRole}
            plannerInviteSuccess={plannerInviteSuccess}
            plannerRoleOptions={plannerRoleOptions}
            revokingCollaboratorInviteId={revokingCollaboratorInviteId}
          />
        )}
        siteContent={(
          <SettingsSiteTabContent
            changingTemplate={changingTemplate}
            currentTemplate={currentTemplate}
            defaultLanguage={defaultLanguage}
            guestAccessToken={guestAccessToken}
            hideFromSearch={hideFromSearch}
            onAutoTranslateLanguage={(language) => { void handleAutoTranslateLanguage(language); }}
            onCopyIdentityManifest={() => { void copyIdentityManifest(); }}
            onCopyInviteLink={copyInviteLink}
            onDefaultLanguageChange={(language) => { void handleDefaultLanguageChange(language); }}
            onDownloadIdentityPrintPack={downloadIdentityPrintPack}
            onHideFromSearchChange={(checked) => {
              visibilityDraftGuard.markDirty();
              setHideFromSearch(checked);
            }}
            onPrivacyModeChange={(mode) => {
              visibilityDraftGuard.markDirty();
              setPrivacyMode(mode);
            }}
            onRegenerateToken={() => { void handleRegenerateToken(); }}
            onSavePrivacy={handleSavePrivacy}
            onSitePasswordChange={(value) => {
              visibilityDraftGuard.markDirty();
              setSitePassword(value);
            }}
            onSiteSlugChange={(value) => setSiteSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            onSubmitSiteSlug={handleUpdateSlug}
            onTemplateChange={(templateId) => { void handleTemplateChange(templateId); }}
            onTogglePrivacySettings={() => setShowPrivacySettings((value) => !value)}
            onToggleShowSitePassword={() => setShowSitePassword((value) => !value)}
            onToggleTemplateSettings={() => setShowTemplateSettings((value) => !value)}
            privacyCopied={privacyCopied}
            privacyMode={privacyMode}
            publicSiteUrl={publicSiteUrl}
            showPrivacySettings={showPrivacySettings}
            showSitePassword={showSitePassword}
            showTemplateSettings={showTemplateSettings}
            sitePassword={sitePassword}
            siteSlug={siteSlug}
            slugError={slugError}
            slugSaving={slugSaving}
            slugSuccess={slugSuccess}
            templateError={templateError}
            templateSuccess={templateSuccess}
            translatingLanguage={translatingLanguage}
            translationStatuses={translationStatuses}
            visibilityError={visibilityError}
            visibilitySaving={visibilitySaving}
            visibilitySuccess={visibilitySuccess}
            weddingIdentityExportKit={weddingIdentityExportKit}
            weddingIdentityPrintAssets={weddingIdentityPrintAssets}
          />
        )}
        rsvpContent={(
          <SettingsRsvpTabContent
            collapsedQuestionIds={collapsedQuestionIds}
            mealOptions={rsvpMealOptions}
            musicPlaylistUrl={musicPlaylistUrl}
            onAddChoice={(questionId) => {
              rsvpDraftGuard.markDirty();
              setRsvpQuestions((prev) => prev.map((item) => item.id === questionId ? { ...item, options: [...(item.options ?? []), ''] } : item));
            }}
            onAddMealOption={() => {
              rsvpDraftGuard.markDirty();
              setRsvpMealOptions((prev) => [...prev, '']);
            }}
            onAddQuestion={() => {
              rsvpDraftGuard.markDirty();
              const question = makeQuestion();
              setRsvpQuestions((prev) => [...prev, question]);
              setCollapsedQuestionIds((prev) => {
                const next = new Set(prev);
                next.delete(question.id);
                return next;
              });
            }}
            onAppliesToChange={(questionId, value) => {
              rsvpDraftGuard.markDirty();
              setRsvpQuestions((prev) => prev.map((item) => item.id === questionId ? { ...item, appliesTo: value } : item));
            }}
            onMealChoiceEnabledChange={(enabled) => {
              rsvpDraftGuard.markDirty();
              setRsvpMealEnabled(enabled);
            }}
            onMealOptionChange={(index, value) => {
              rsvpDraftGuard.markDirty();
              setRsvpMealOptions((prev) => {
                const next = [...prev];
                next[index] = value;
                return next;
              });
            }}
            onMusicPlaylistUrlChange={setMusicPlaylistUrl}
            onOpenPlaylist={() => {
              if (safeMusicPlaylistUrl) {
                window.open(safeMusicPlaylistUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            onPromptChange={(questionId, value) => {
              rsvpDraftGuard.markDirty();
              setRsvpQuestions((prev) => prev.map((item) => item.id === questionId ? { ...item, label: value } : item));
            }}
            onRemoveChoice={(questionId, optionIndex) => {
              rsvpDraftGuard.markDirty();
              setRsvpQuestions((prev) => prev.map((item) => {
                if (item.id !== questionId) return item;
                const next = [...(item.options ?? [])];
                next.splice(optionIndex, 1);
                return { ...item, options: next };
              }));
            }}
            onRemoveMealOption={(index) => {
              rsvpDraftGuard.markDirty();
              setRsvpMealOptions((prev) => prev.filter((_, optionIndex) => optionIndex !== index));
            }}
            onRemoveQuestion={(questionId) => {
              rsvpDraftGuard.markDirty();
              setRsvpQuestions((prev) => prev.filter((item) => item.id !== questionId));
              setCollapsedQuestionIds((prev) => {
                const next = new Set(prev);
                next.delete(questionId);
                return next;
              });
            }}
            onRequiredChange={(questionId, checked) => {
              rsvpDraftGuard.markDirty();
              setRsvpQuestions((prev) => prev.map((item) => item.id === questionId ? { ...item, required: checked } : item));
            }}
            onSaveMealSettings={() => { void saveRsvpSettings(); }}
            onSaveMusicPlaylist={() => { void handleSaveMusicPlaylist(); }}
            onSaveQuestions={handleSaveRsvpQuestions}
            onToggleAdvancedVisibility={() => setShowAdvancedRsvp((value) => !value)}
            onToggleCollapse={(questionId) => {
              setCollapsedQuestionIds((prev) => {
                const next = new Set(prev);
                if (next.has(questionId)) next.delete(questionId);
                else next.add(questionId);
                return next;
              });
            }}
            onToggleMealVisibility={() => setShowMealChoiceSettings((value) => !value)}
            onTypeChange={(questionId, value) => {
              rsvpDraftGuard.markDirty();
              setRsvpQuestions((prev) => prev.map((item) => {
                if (item.id !== questionId) return item;
                if (value === 'single_choice' || value === 'multi_choice') {
                  const current = item.options ?? [];
                  return { ...item, type: value, options: current.length > 0 ? current : ['', ''] };
                }
                return { ...item, type: value, options: [] };
              }));
            }}
            onUpdateChoice={(questionId, optionIndex, value) => {
              rsvpDraftGuard.markDirty();
              setRsvpQuestions((prev) => prev.map((item) => {
                if (item.id !== questionId) return item;
                const next = [...(item.options ?? [])];
                next[optionIndex] = value;
                return { ...item, options: next };
              }));
            }}
            questions={rsvpQuestions}
            rsvpMealEnabled={rsvpMealEnabled}
            rsvpQuestionsError={rsvpQuestionsError}
            rsvpQuestionsSaving={rsvpQuestionsSaving}
            rsvpQuestionsSuccess={rsvpQuestionsSuccess}
            safeMusicPlaylistUrl={safeMusicPlaylistUrl}
            showAdvancedRsvp={showAdvancedRsvp}
            showMealChoiceSettings={showMealChoiceSettings}
          />
        )}
        notificationsContent={(
          <SettingsNotificationsPanel
            showNotificationSettings={showNotificationSettings}
            notifRsvp={notifRsvp}
            notifPhotos={notifPhotos}
            notifDigest={notifDigest}
            notifUpdates={notifUpdates}
            notifSaving={notifSaving}
            notifSuccess={notifSuccess}
            notifError={notifError}
            onToggleVisibility={() => setShowNotificationSettings((value) => !value)}
            onRsvpChange={(value) => { notifDraftGuard.markDirty(); setNotifRsvp(value); }}
            onPhotosChange={(value) => { notifDraftGuard.markDirty(); setNotifPhotos(value); }}
            onDigestChange={(value) => { notifDraftGuard.markDirty(); setNotifDigest(value); }}
            onUpdatesChange={(value) => { notifDraftGuard.markDirty(); setNotifUpdates(value); }}
            onSaveNotifications={handleSaveNotifications}
          />
        )}
        billingContent={(
          <SettingsBillingPanel
            billingInfo={billingInfo}
            billingLoading={billingLoading}
            billingError={billingError}
            subscribeError={subscribeError}
            subscribeLoading={subscribeLoading}
            onSubscribe={handleSubscribe}
          />
        )}
      />
    </SettingsDashboardShell>
  );
};
