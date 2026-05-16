import React from 'react';
import type { FormEvent } from 'react';
import { renderCalmDigestEmail } from '../../../lib/calmDigestEmail';
import { buildCalmDigestDeliveryPreview, buildCalmOwnerDigest } from '../../../lib/calmOwnerDigest';
import type { DigestCadence } from '../../../lib/notificationPrefs';
import { getPlannerPermissionPreset, type PlannerPermissionKey, type PlannerInviteRecord, type PlannerRoleOption } from '../../../lib/plannerAccess';
import type { BillingInfo } from '../../../lib/stripeService';
import type { WeddingIdentityExportKit, WeddingIdentityPrintAsset } from '../../../lib/weddingIdentityExports';
import type { SettingsCollaboratorInviteRow } from './settingsSiteData';
import type { AnalyticsRetentionDays, RSVPQuestionSetting, SiteLanguageCode, TranslationLanguageCode, TranslationStatusRow } from './settingsDashboardTypes';
import { makeQuestion } from './settingsDashboardUtils';
import { SettingsAccountPanel } from './SettingsAccountPanel';
import { SettingsBillingPanel } from './SettingsBillingPanel';
import { SettingsDashboardShell } from './SettingsDashboardShell';
import { SettingsNotificationsPanel } from './SettingsNotificationsPanel';
import { SettingsRsvpTabContent } from './SettingsRsvpTabContent';
import { SettingsSiteTabContent } from './SettingsSiteTabContent';
import { SettingsTabContent } from './SettingsTabContent';
import { SettingsTeamAccessPanel } from './SettingsTeamAccessPanel';
import type { SettingsTab, SettingsTabId } from './SettingsNavigation';

type Props = {
  accountEmail: string;
  accountError: string | null;
  accountSaving: boolean;
  accountSuccess: string | null;
  activeTab: SettingsTabId;
  setActiveTab: (tab: SettingsTabId) => void;
  billingError: string | null;
  billingInfo: BillingInfo | null;
  billingLoading: boolean;
  changingTemplate: boolean;
  collapsedQuestionIds: Set<string>;
  collaboratorInvites: SettingsCollaboratorInviteRow[];
  confirmPassword: string;
  coupleNames: string;
  creatingCollaboratorInvite: boolean;
  currentPassword: string;
  currentTemplate: string;
  allowedLanguages: SiteLanguageCode[];
  analyticsEnabled: boolean;
  analyticsRetentionDays: AnalyticsRetentionDays;
  analyticsGuestNotice: string;
  defaultLanguage: SiteLanguageCode;
  guestAccessToken: string | null;
  hasWeddingIdentityStoryGraphic: boolean;
  handleCopyCollaboratorInviteLink: (inviteToken: string) => void | Promise<void>;
  handleCreateCollaboratorInvite: () => Promise<void>;
  handleAllowedLanguagesChange: (languages: SiteLanguageCode[]) => void;
  handleDefaultLanguageChange: (language: SiteLanguageCode) => Promise<void>;
  handleLogout: () => Promise<void>;
  handleRegenerateToken: () => Promise<void>;
  handleRemovePlannerInvite: () => void;
  handleResendCollaboratorInvite: (inviteToken: string | undefined) => Promise<void>;
  handleRevokeCollaboratorInvite: (inviteId: string) => Promise<void>;
  handleSaveAccount: (e: FormEvent) => Promise<void>;
  handleSaveMusicPlaylist: () => Promise<void>;
  handleSaveNotifications: (e: FormEvent) => Promise<void>;
  handleSavePlannerInvite: () => void;
  handleSavePrivacy: (e: FormEvent) => Promise<void>;
  handleSaveRsvpQuestions: (e: FormEvent) => Promise<void>;
  handleSubscribe: () => Promise<void>;
  handleTemplateChange: (templateId: string) => Promise<void>;
  handleUpdatePassword: (e: FormEvent) => Promise<void>;
  handleUpdateSlug: (e: FormEvent) => Promise<void>;
  hideFromSearch: boolean;
  musicPlaylistUrl: string;
  newPassword: string;
  notifDigest: boolean;
  notifDigestCadence: DigestCadence;
  notifDigestIncludePlanner: boolean;
  notifDigestQuietUntilLabel: string;
  notifDigestNextDeliveryAt: string | null;
  notifDigestLastReviewedAt: string | null;
  notifDigestLastDeliveredAt: string | null;
  notifDraftMarkDirty: () => void;
  notifError: string | null;
  notifPhotos: boolean;
  notifRsvp: boolean;
  notifSaving: boolean;
  notifSuccess: string | null;
  notifUpdates: boolean;
  passwordError: string | null;
  passwordSaving: boolean;
  passwordSuccess: string | null;
  plannerInvite: PlannerInviteRecord | null;
  plannerInviteEmail: string;
  plannerInviteError: string | null;
  plannerInviteName: string;
  plannerInvitePermissions: PlannerPermissionKey[];
  plannerInviteRole: 'planner' | 'coordinator' | 'viewer';
  plannerInviteSuccess: string | null;
  plannerRoleOptions: PlannerRoleOption[];
  privacyCopied: boolean;
  privacyMode: 'public' | 'password_protected' | 'invite_only';
  isPublished: boolean;
  publicSiteUrl: string;
  revokingCollaboratorInviteId: string | null;
  rsvpDraftMarkDirty: () => void;
  rsvpMealEnabled: boolean;
  rsvpMealOptions: string[];
  rsvpQuestions: RSVPQuestionSetting[];
  rsvpQuestionsError: string | null;
  rsvpQuestionsSaving: boolean;
  rsvpQuestionsSuccess: string | null;
  safeMusicPlaylistUrl: string | null;
  saveRsvpSettings: () => Promise<void>;
  setCollapsedQuestionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setConfirmPassword: (value: string) => void;
  setCoupleNames: (value: string) => void;
  setCurrentPassword: (value: string) => void;
  setHideFromSearch: (value: boolean) => void;
  setAnalyticsEnabled: (value: boolean) => void;
  setAnalyticsRetentionDays: (value: AnalyticsRetentionDays) => void;
  setAnalyticsGuestNotice: (value: string) => void;
  setMusicPlaylistUrl: (value: string) => void;
  setNewPassword: (value: string) => void;
  setNotifDigest: (value: boolean) => void;
  setNotifDigestCadence: (value: DigestCadence) => void;
  setNotifDigestIncludePlanner: (value: boolean) => void;
  setNotifDigestQuietUntilLabel: (value: string) => void;
  setNotifPhotos: (value: boolean) => void;
  setNotifRsvp: (value: boolean) => void;
  setNotifUpdates: (value: boolean) => void;
  setPlannerInviteEmail: (value: string) => void;
  setPlannerInviteName: (value: string) => void;
  setPlannerInvitePermissions: React.Dispatch<React.SetStateAction<PlannerPermissionKey[]>>;
  setPlannerInviteRole: (value: 'planner' | 'coordinator' | 'viewer') => void;
  setPrivacyMode: (value: 'public' | 'password_protected' | 'invite_only') => void;
  setRsvpMealEnabled: (value: boolean) => void;
  setRsvpMealOptions: React.Dispatch<React.SetStateAction<string[]>>;
  setRsvpQuestions: React.Dispatch<React.SetStateAction<RSVPQuestionSetting[]>>;
  setShowAdvancedRsvp: React.Dispatch<React.SetStateAction<boolean>>;
  setShowConfirmPw: React.Dispatch<React.SetStateAction<boolean>>;
  setShowCurrentPw: React.Dispatch<React.SetStateAction<boolean>>;
  setShowMealChoiceSettings: React.Dispatch<React.SetStateAction<boolean>>;
  setShowNewPw: React.Dispatch<React.SetStateAction<boolean>>;
  setShowNotificationSettings: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPrivacySettings: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSitePassword: React.Dispatch<React.SetStateAction<boolean>>;
  setShowTemplateSettings: React.Dispatch<React.SetStateAction<boolean>>;
  setSitePassword: (value: string) => void;
  setSiteSlug: (value: string) => void;
  settingsRole: 'owner' | 'planner' | 'coordinator' | 'viewer';
  showAdvancedRsvp: boolean;
  showConfirmPw: boolean;
  showCurrentPw: boolean;
  showMealChoiceSettings: boolean;
  showNewPw: boolean;
  showNotificationSettings: boolean;
  showPrivacySettings: boolean;
  showSitePassword: boolean;
  showTemplateSettings: boolean;
  sitePassword: string;
  siteSlug: string;
  slugError: string | null;
  slugSaving: boolean;
  slugSuccess: string | null;
  subscribeError: string | null;
  subscribeLoading: boolean;
  tabs: SettingsTab[];
  templateError: string | null;
  templateSuccess: string | null;
  togglePlannerPermission: (permission: PlannerPermissionKey) => void;
  translatingLanguage: TranslationLanguageCode | null;
  translationStatuses: TranslationStatusRow[];
  visibilityDraftMarkDirty: () => void;
  visibilityError: string | null;
  visibilitySaving: boolean;
  visibilitySuccess: string | null;
  weddingIdentityExportKit: WeddingIdentityExportKit;
  weddingIdentityPrintAssets: WeddingIdentityPrintAsset[];
  onAutoTranslateLanguage: (language: TranslationLanguageCode) => Promise<void>;
  onCopyIdentityManifest: () => Promise<void>;
  onCopyIdentityStyleKit: () => Promise<void>;
  onCopyInviteLink: () => void;
  onDownloadIdentityStoryGraphic: () => void;
  onDownloadIdentityPrintPack: () => void;
};

export function SettingsDashboardRouteContent(props: Props) {
  const digestPreview = buildCalmDigestDeliveryPreview({
    digest: buildCalmOwnerDigest({
      role: 'owner',
      newRsvpCount: 2,
      upcomingTaskCount: 1,
      newPhotoUploadCount: 1,
      isPublished: props.isPublished,
    }),
    cadence: props.notifDigest ? props.notifDigestCadence : 'paused',
    includePlanner: props.notifDigestIncludePlanner,
    quietUntilLabel: props.notifDigestQuietUntilLabel,
    nextDeliveryAt: props.notifDigestNextDeliveryAt,
    lastReviewedAt: props.notifDigestLastReviewedAt,
    lastDeliveredAt: props.notifDigestLastDeliveredAt,
    emailDeliveryEnabled: false,
  });
  const digestEmail = renderCalmDigestEmail(digestPreview);

  return (
    <SettingsDashboardShell
      activeTab={props.activeTab}
      defaultLanguage={props.defaultLanguage}
      onTabChange={props.setActiveTab}
      rsvpQuestionCount={props.rsvpQuestions.length}
      settingsRole={props.settingsRole}
      tabs={props.tabs}
    >
      <SettingsTabContent
        activeTab={props.activeTab}
        accountContent={(
          <SettingsAccountPanel
            coupleNames={props.coupleNames}
            accountEmail={props.accountEmail}
            accountSaving={props.accountSaving}
            accountSuccess={props.accountSuccess}
            accountError={props.accountError}
            currentPassword={props.currentPassword}
            newPassword={props.newPassword}
            confirmPassword={props.confirmPassword}
            showCurrentPw={props.showCurrentPw}
            showNewPw={props.showNewPw}
            showConfirmPw={props.showConfirmPw}
            passwordSaving={props.passwordSaving}
            passwordSuccess={props.passwordSuccess}
            passwordError={props.passwordError}
            onCoupleNamesChange={props.setCoupleNames}
            onCurrentPasswordChange={props.setCurrentPassword}
            onNewPasswordChange={props.setNewPassword}
            onConfirmPasswordChange={props.setConfirmPassword}
            onToggleCurrentPassword={() => props.setShowCurrentPw((value) => !value)}
            onToggleNewPassword={() => props.setShowNewPw((value) => !value)}
            onToggleConfirmPassword={() => props.setShowConfirmPw((value) => !value)}
            onSaveAccount={props.handleSaveAccount}
            onUpdatePassword={props.handleUpdatePassword}
            onLogout={props.handleLogout}
          />
        )}
        teamContent={(
          <SettingsTeamAccessPanel
            collaboratorInvites={props.collaboratorInvites}
            creatingCollaboratorInvite={props.creatingCollaboratorInvite}
            onCopyCollaboratorInviteLink={(inviteToken) => {
              if (!inviteToken) return;
              void props.handleCopyCollaboratorInviteLink(inviteToken);
            }}
            onCreateCollaboratorInvite={() => { void props.handleCreateCollaboratorInvite(); }}
            onPlannerInviteEmailChange={props.setPlannerInviteEmail}
            onPlannerInviteNameChange={props.setPlannerInviteName}
            onPlannerInviteRoleChange={(nextRole) => {
              props.setPlannerInviteRole(nextRole);
              props.setPlannerInvitePermissions(getPlannerPermissionPreset(nextRole));
            }}
            onRemovePlannerInvite={props.handleRemovePlannerInvite}
            onResendCollaboratorInvite={(inviteToken) => { void props.handleResendCollaboratorInvite(inviteToken); }}
            onRevokeCollaboratorInvite={(inviteId) => { void props.handleRevokeCollaboratorInvite(inviteId); }}
            onSavePlannerInvite={props.handleSavePlannerInvite}
            onTogglePlannerPermission={props.togglePlannerPermission}
            plannerInvite={props.plannerInvite}
            plannerInviteEmail={props.plannerInviteEmail}
            plannerInviteError={props.plannerInviteError}
            plannerInviteName={props.plannerInviteName}
            plannerInvitePermissions={props.plannerInvitePermissions}
            plannerInviteRole={props.plannerInviteRole}
            plannerInviteSuccess={props.plannerInviteSuccess}
            plannerRoleOptions={props.plannerRoleOptions}
            revokingCollaboratorInviteId={props.revokingCollaboratorInviteId}
          />
        )}
        siteContent={(
          <SettingsSiteTabContent
            changingTemplate={props.changingTemplate}
            currentTemplate={props.currentTemplate}
            allowedLanguages={props.allowedLanguages}
            analyticsEnabled={props.analyticsEnabled}
            analyticsRetentionDays={props.analyticsRetentionDays}
            analyticsGuestNotice={props.analyticsGuestNotice}
            defaultLanguage={props.defaultLanguage}
            hasWeddingIdentityStoryGraphic={props.hasWeddingIdentityStoryGraphic}
            guestAccessToken={props.guestAccessToken}
            hideFromSearch={props.hideFromSearch}
            isPublished={props.isPublished}
            onAutoTranslateLanguage={(language) => { void props.onAutoTranslateLanguage(language); }}
            onAllowedLanguagesChange={(languages) => {
              props.visibilityDraftMarkDirty();
              props.handleAllowedLanguagesChange(languages);
            }}
            onCopyIdentityManifest={() => { void props.onCopyIdentityManifest(); }}
            onCopyIdentityStyleKit={() => { void props.onCopyIdentityStyleKit(); }}
            onCopyInviteLink={props.onCopyInviteLink}
            onDefaultLanguageChange={(language) => { void props.handleDefaultLanguageChange(language); }}
            onDownloadIdentityStoryGraphic={() => { void props.onDownloadIdentityStoryGraphic(); }}
            onDownloadIdentityPrintPack={() => { void props.onDownloadIdentityPrintPack(); }}
            onHideFromSearchChange={(checked) => {
              props.visibilityDraftMarkDirty();
              props.setHideFromSearch(checked);
            }}
            onAnalyticsEnabledChange={(checked) => {
              props.visibilityDraftMarkDirty();
              props.setAnalyticsEnabled(checked);
            }}
            onAnalyticsRetentionDaysChange={(days) => {
              props.visibilityDraftMarkDirty();
              props.setAnalyticsRetentionDays(days);
            }}
            onAnalyticsGuestNoticeChange={(value) => {
              props.visibilityDraftMarkDirty();
              props.setAnalyticsGuestNotice(value);
            }}
            onPrivacyModeChange={(mode) => {
              props.visibilityDraftMarkDirty();
              props.setPrivacyMode(mode);
            }}
            onRegenerateToken={() => { void props.handleRegenerateToken(); }}
            onSavePrivacy={props.handleSavePrivacy}
            onSitePasswordChange={(value) => {
              props.visibilityDraftMarkDirty();
              props.setSitePassword(value);
            }}
            onSiteSlugChange={(value) => props.setSiteSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            onSubmitSiteSlug={props.handleUpdateSlug}
            onTemplateChange={(templateId) => { void props.handleTemplateChange(templateId); }}
            onTogglePrivacySettings={() => props.setShowPrivacySettings((value) => !value)}
            onToggleShowSitePassword={() => props.setShowSitePassword((value) => !value)}
            onToggleTemplateSettings={() => props.setShowTemplateSettings((value) => !value)}
            privacyCopied={props.privacyCopied}
            privacyMode={props.privacyMode}
            publicSiteUrl={props.publicSiteUrl}
            showPrivacySettings={props.showPrivacySettings}
            showSitePassword={props.showSitePassword}
            showTemplateSettings={props.showTemplateSettings}
            sitePassword={props.sitePassword}
            siteSlug={props.siteSlug}
            slugError={props.slugError}
            slugSaving={props.slugSaving}
            slugSuccess={props.slugSuccess}
            templateError={props.templateError}
            templateSuccess={props.templateSuccess}
            translatingLanguage={props.translatingLanguage}
            translationStatuses={props.translationStatuses}
            visibilityError={props.visibilityError}
            visibilitySaving={props.visibilitySaving}
            visibilitySuccess={props.visibilitySuccess}
            weddingIdentityExportKit={props.weddingIdentityExportKit}
            weddingIdentityPrintAssets={props.weddingIdentityPrintAssets}
          />
        )}
        rsvpContent={(
          <SettingsRsvpTabContent
            collapsedQuestionIds={props.collapsedQuestionIds}
            mealOptions={props.rsvpMealOptions}
            musicPlaylistUrl={props.musicPlaylistUrl}
            onAddChoice={(questionId) => {
              props.rsvpDraftMarkDirty();
              props.setRsvpQuestions((prev) => prev.map((item) => item.id === questionId ? { ...item, options: [...(item.options ?? []), ''] } : item));
            }}
            onAddMealOption={() => {
              props.rsvpDraftMarkDirty();
              props.setRsvpMealOptions((prev) => [...prev, '']);
            }}
            onAddQuestion={() => {
              props.rsvpDraftMarkDirty();
              const question = makeQuestion();
              props.setRsvpQuestions((prev) => [...prev, question]);
              props.setCollapsedQuestionIds((prev) => {
                const next = new Set(prev);
                next.delete(question.id);
                return next;
              });
            }}
            onAppliesToChange={(questionId, value) => {
              props.rsvpDraftMarkDirty();
              props.setRsvpQuestions((prev) => prev.map((item) => item.id === questionId ? { ...item, appliesTo: value } : item));
            }}
            onMealChoiceEnabledChange={(enabled) => {
              props.rsvpDraftMarkDirty();
              props.setRsvpMealEnabled(enabled);
            }}
            onMealOptionChange={(index, value) => {
              props.rsvpDraftMarkDirty();
              props.setRsvpMealOptions((prev) => {
                const next = [...prev];
                next[index] = value;
                return next;
              });
            }}
            onMusicPlaylistUrlChange={props.setMusicPlaylistUrl}
            onOpenPlaylist={() => {
              if (props.safeMusicPlaylistUrl) {
                window.open(props.safeMusicPlaylistUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            onPromptChange={(questionId, value) => {
              props.rsvpDraftMarkDirty();
              props.setRsvpQuestions((prev) => prev.map((item) => item.id === questionId ? { ...item, label: value } : item));
            }}
            onRemoveChoice={(questionId, optionIndex) => {
              props.rsvpDraftMarkDirty();
              props.setRsvpQuestions((prev) => prev.map((item) => {
                if (item.id !== questionId) return item;
                const next = [...(item.options ?? [])];
                next.splice(optionIndex, 1);
                return { ...item, options: next };
              }));
            }}
            onRemoveMealOption={(index) => {
              props.rsvpDraftMarkDirty();
              props.setRsvpMealOptions((prev) => prev.filter((_, optionIndex) => optionIndex !== index));
            }}
            onRemoveQuestion={(questionId) => {
              props.rsvpDraftMarkDirty();
              props.setRsvpQuestions((prev) => prev.filter((item) => item.id !== questionId));
              props.setCollapsedQuestionIds((prev) => {
                const next = new Set(prev);
                next.delete(questionId);
                return next;
              });
            }}
            onRequiredChange={(questionId, checked) => {
              props.rsvpDraftMarkDirty();
              props.setRsvpQuestions((prev) => prev.map((item) => item.id === questionId ? { ...item, required: checked } : item));
            }}
            onSaveMealSettings={() => { void props.saveRsvpSettings(); }}
            onSaveMusicPlaylist={() => { void props.handleSaveMusicPlaylist(); }}
            onSaveQuestions={props.handleSaveRsvpQuestions}
            onToggleAdvancedVisibility={() => props.setShowAdvancedRsvp((value) => !value)}
            onToggleCollapse={(questionId) => {
              props.setCollapsedQuestionIds((prev) => {
                const next = new Set(prev);
                if (next.has(questionId)) next.delete(questionId);
                else next.add(questionId);
                return next;
              });
            }}
            onToggleMealVisibility={() => props.setShowMealChoiceSettings((value) => !value)}
            onTypeChange={(questionId, value) => {
              props.rsvpDraftMarkDirty();
              props.setRsvpQuestions((prev) => prev.map((item) => {
                if (item.id !== questionId) return item;
                if (value === 'single_choice' || value === 'multi_choice') {
                  const current = item.options ?? [];
                  return { ...item, type: value, options: current.length > 0 ? current : ['', ''] };
                }
                return { ...item, type: value, options: [] };
              }));
            }}
            onUpdateChoice={(questionId, optionIndex, value) => {
              props.rsvpDraftMarkDirty();
              props.setRsvpQuestions((prev) => prev.map((item) => {
                if (item.id !== questionId) return item;
                const next = [...(item.options ?? [])];
                next[optionIndex] = value;
                return { ...item, options: next };
              }));
            }}
            questions={props.rsvpQuestions}
            rsvpMealEnabled={props.rsvpMealEnabled}
            rsvpQuestionsError={props.rsvpQuestionsError}
            rsvpQuestionsSaving={props.rsvpQuestionsSaving}
            rsvpQuestionsSuccess={props.rsvpQuestionsSuccess}
            safeMusicPlaylistUrl={props.safeMusicPlaylistUrl}
            showAdvancedRsvp={props.showAdvancedRsvp}
            showMealChoiceSettings={props.showMealChoiceSettings}
          />
        )}
        notificationsContent={(
          <SettingsNotificationsPanel
            showNotificationSettings={props.showNotificationSettings}
            notifRsvp={props.notifRsvp}
            notifPhotos={props.notifPhotos}
            notifDigest={props.notifDigest}
            notifDigestCadence={props.notifDigestCadence}
            notifDigestIncludePlanner={props.notifDigestIncludePlanner}
            notifDigestQuietUntilLabel={props.notifDigestQuietUntilLabel}
            notifDigestNextDeliveryAt={props.notifDigestNextDeliveryAt}
            notifDigestLastReviewedAt={props.notifDigestLastReviewedAt}
            notifDigestLastDeliveredAt={props.notifDigestLastDeliveredAt}
            notifUpdates={props.notifUpdates}
            notifSaving={props.notifSaving}
            notifSuccess={props.notifSuccess}
            notifError={props.notifError}
            digestPreview={digestPreview}
            digestEmailText={digestEmail.text}
            onToggleVisibility={() => props.setShowNotificationSettings((value) => !value)}
            onRsvpChange={(value) => { props.notifDraftMarkDirty(); props.setNotifRsvp(value); }}
            onPhotosChange={(value) => { props.notifDraftMarkDirty(); props.setNotifPhotos(value); }}
            onDigestChange={(value) => {
              props.notifDraftMarkDirty();
              props.setNotifDigest(value);
              if (value && props.notifDigestCadence === 'paused') props.setNotifDigestCadence('weekly');
              if (!value) props.setNotifDigestCadence('paused');
            }}
            onDigestCadenceChange={(value) => { props.notifDraftMarkDirty(); props.setNotifDigestCadence(value); }}
            onDigestIncludePlannerChange={(value) => { props.notifDraftMarkDirty(); props.setNotifDigestIncludePlanner(value); }}
            onDigestQuietUntilLabelChange={(value) => { props.notifDraftMarkDirty(); props.setNotifDigestQuietUntilLabel(value); }}
            onUpdatesChange={(value) => { props.notifDraftMarkDirty(); props.setNotifUpdates(value); }}
            onSaveNotifications={props.handleSaveNotifications}
          />
        )}
        billingContent={(
          <SettingsBillingPanel
            billingInfo={props.billingInfo}
            billingLoading={props.billingLoading}
            billingError={props.billingError}
            subscribeError={props.subscribeError}
            subscribeLoading={props.subscribeLoading}
            onSubscribe={() => { void props.handleSubscribe(); }}
          />
        )}
      />
    </SettingsDashboardShell>
  );
}
