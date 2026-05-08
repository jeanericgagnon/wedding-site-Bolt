import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Select, Badge } from '../../components/ui';
import { Loader2 } from 'lucide-react';
import { getSiteVisibilityState, getVisibilityModeOptions } from '../../lib/siteVisibilityState';
import { getAllTemplates } from '../../templates/registry';
import { fetchBillingInfo, type BillingInfo } from '../../lib/stripeService';
import { useAuth } from '../../hooks/useAuth';
import { PLANNER_ROLE_OPTIONS, getPlannerPermissionPreset, readPlannerInvite, type PlannerAccessRole, type PlannerInviteRecord, type PlannerPermissionKey } from '../../lib/plannerAccess';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { useToast } from '../../components/ui/Toast';
import { logAppAction } from '../../lib/actionAudit';
import { demoWeddingSite } from '../../lib/demoData';
import { getSafePublicWebUrl } from '../../sections/publicLinks';
import {
  buildWeddingIdentityExportKit,
  buildWeddingIdentityPrintAssets,
} from '../../lib/weddingIdentityExports';
import {
  loadSettingsCollaboratorInvites,
  loadSettingsSite,
  loadSettingsTranslationStatuses,
  requireSettingsAuthenticatedUser,
  updateSettingsAccountPassword,
  updateSettingsSite,
  verifySettingsCurrentPassword,
  type SettingsCollaboratorInviteRow,
} from './settings/settingsSiteData';
import {
  SITE_LANGUAGE_OPTIONS,
  TRANSLATION_LANGUAGE_OPTIONS,
  type RSVPQuestionSetting,
  type SiteLanguageCode,
  type TranslationLanguageCode,
  type TranslationStatusRow,
} from './settings/settingsDashboardTypes';
import {
  SETTINGS_SITE_MISSING_COPY,
  formatTranslationStatusDate,
  makeQuestion,
  normalizeMealOptions,
  normalizeRsvpQuestions,
  safeSettingsError,
  splitCoupleNames,
} from './settings/settingsDashboardUtils';
import { readDemoRsvpSettings } from './settings/settingsDemoStorage';
import { SettingsAccountPanel } from './settings/SettingsAccountPanel';
import { SettingsBillingPanel } from './settings/SettingsBillingPanel';
import { getSettingsTabs, SettingsNavigation, type SettingsTabId } from './settings/SettingsNavigation';
import { SettingsNotificationsPanel } from './settings/SettingsNotificationsPanel';
import { SettingsRsvpTabContent } from './settings/SettingsRsvpTabContent';
import { SettingsSiteTabContent } from './settings/SettingsSiteTabContent';
import { SettingsTeamAccessPanel } from './settings/SettingsTeamAccessPanel';
import { SettingsDashboardShell } from './settings/SettingsDashboardShell';
import { SettingsTabContent } from './settings/SettingsTabContent';
import { useSettingsSiteAccessActions } from './settings/useSettingsSiteAccessActions';
import { useSettingsExperienceActions } from './settings/useSettingsExperienceActions';

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

export const DashboardSettings: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isDemoMode, signOut } = useAuth();
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
  const safeMusicPlaylistUrl = getSafePublicWebUrl(musicPlaylistUrl);
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugSuccess, setSlugSuccess] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  const [defaultLanguage, setDefaultLanguage] = useState<SiteLanguageCode>('en');
  const [translatingLanguage, setTranslatingLanguage] = useState<TranslationLanguageCode | null>(null);
  const [translationStatuses, setTranslationStatuses] = useState<TranslationStatusRow[]>([]);
  const [privacyMode, setPrivacyMode] = useState<'public' | 'password_protected' | 'invite_only'>('public');
  const [hideFromSearch, setHideFromSearch] = useState(false);
  const [sitePassword, setSitePassword] = useState('');
  const [showSitePassword, setShowSitePassword] = useState(false);
  const [guestAccessToken, setGuestAccessToken] = useState<string | null>(null);
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
  const [rsvpMealOptions, setRsvpMealOptions] = useState<string[]>(['Chicken','Beef','Fish','Vegetarian','Vegan']);
  const clearRsvpSettingsStatus = useCallback(() => {
    setRsvpQuestionsSuccess(null);
    setRsvpQuestionsError(null);
  }, []);
  const rsvpDraftGuard = useDraftHydrationGuard(clearRsvpSettingsStatus);
  const [privacyCopied, setPrivacyCopied] = useState(false);
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

  const [notifRsvp, setNotifRsvp] = useState(true);
  const [notifPhotos, setNotifPhotos] = useState(true);
  const [notifDigest, setNotifDigest] = useState(false);
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

  useEffect(() => {
    loadSiteData();
  }, [user, isDemoMode]);

  useEffect(() => {
    if (activeTab === 'billing' && settingsRole === 'owner' && user && !billingInfo) {
      setBillingLoading(true);
      fetchBillingInfo(user.id)
        .then(info => setBillingInfo(info))
        .catch(err => setBillingError(safeSettingsError(err, 'Couldn’t load billing right now.')))
        .finally(() => setBillingLoading(false));
    }
  }, [activeTab, settingsRole, user, billingInfo]);

  useEffect(() => {
    if (settingsRole !== 'owner' && (activeTab === 'team' || activeTab === 'billing')) {
      setActiveTab('site');
    }
  }, [activeTab, settingsRole]);

  const handleLogout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const loadCollaboratorInvites = async (siteId: string) => {
    setCollaboratorInvites(await loadSettingsCollaboratorInvites(siteId));
  };

  const resolveSettingsSiteId = async () => {
    if (weddingSiteId) return weddingSiteId;
    if (!user?.id) return null;
    const activeSite = await resolveActiveSiteForUser(user.id);
    const activeSiteId = activeSite?.id ?? null;
    if (activeSiteId) setWeddingSiteId(activeSiteId);
    return activeSiteId;
  };

  const logSettingsAction = (
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
  };

  const loadTranslationStatuses = async (siteId: string) => {
    let data: Awaited<ReturnType<typeof loadSettingsTranslationStatuses>>;
    try {
      data = await loadSettingsTranslationStatuses(
        siteId,
        TRANSLATION_LANGUAGE_OPTIONS.map((option) => option.value),
      );
    } catch {
      setTranslationStatuses([]);
      return;
    }

    setTranslationStatuses(
      data
        .filter((row): row is TranslationStatusRow =>
          TRANSLATION_LANGUAGE_OPTIONS.some((option) => option.value === row.language) &&
          (row.status === 'ready' || row.status === 'failed')
        )
        .map((row) => ({
          language: row.language,
          status: row.status,
          translated_at: row.translated_at ?? null,
        }))
    );
  };

  const loadSiteData = async () => {
    if (!user) {
      setWeddingSiteId(null);
      setCoupleNames('');
      setAccountEmail('');
      setSiteSlug('');
      setGuestAccessToken(null);
      setCollaboratorInvites([]);
      setSettingsRole('owner');
      return;
    }

    if (isDemoMode) {
      const demoRsvpSettings = readDemoRsvpSettings();
      if (rsvpDraftGuard.shouldHydrate()) {
        if (demoRsvpSettings.questions) setRsvpQuestions(demoRsvpSettings.questions);
        if (typeof demoRsvpSettings.mealEnabled === 'boolean') setRsvpMealEnabled(demoRsvpSettings.mealEnabled);
        if (demoRsvpSettings.mealOptions) setRsvpMealOptions(demoRsvpSettings.mealOptions);
      }

      setSettingsRole('owner');
      setWeddingSiteId(demoWeddingSite.id);
      setAccountEmail(user.email ?? '');
      setCoupleNames(`${demoWeddingSite.couple_name_1} & ${demoWeddingSite.couple_name_2}`);
      setWeddingDate(demoWeddingSite.wedding_date);
      setVenueName(demoWeddingSite.venue_name);
      setCurrentTemplate('base');
      setSiteSlug(demoWeddingSite.site_url);
      setMusicPlaylistUrl('');
      if (visibilityDraftGuard.shouldHydrate()) {
        setPrivacyMode('public');
        setHideFromSearch(false);
        setGuestAccessToken(null);
        setDefaultLanguage('en');
      }
      if (notifDraftGuard.shouldHydrate()) {
        setNotifRsvp(true);
        setNotifPhotos(true);
        setNotifDigest(false);
        setNotifUpdates(false);
      }
      setCollaboratorInvites([]);
      return;
    }

    try {
      const activeSite = await resolveActiveSiteForUser(user.id);
      setSettingsRole(activeSite?.role ?? 'owner');
      if (isDemoMode && activeSite?.id === 'demo-site-id') {
        setWeddingSiteId(demoWeddingSite.id);
        setAccountEmail(user.email ?? '');
        setCoupleNames(`${demoWeddingSite.couple_name_1} & ${demoWeddingSite.couple_name_2}`);
        setWeddingDate(demoWeddingSite.wedding_date);
        setVenueName(demoWeddingSite.venue_name);
        setCurrentTemplate('base');
        setSiteSlug(demoWeddingSite.site_url);
        setMusicPlaylistUrl('');
        if (visibilityDraftGuard.shouldHydrate()) {
          setPrivacyMode('public');
          setHideFromSearch(false);
          setGuestAccessToken(null);
          setDefaultLanguage('en');
        }
        if (notifDraftGuard.shouldHydrate()) {
          setNotifRsvp(true);
          setNotifPhotos(true);
          setNotifDigest(false);
          setNotifUpdates(false);
        }
        setCollaboratorInvites([]);
        return;
      }
      const data = activeSite?.id ? await loadSettingsSite(activeSite.id) : null;

      if (data) {
        setWeddingSiteId((data.id as string) ?? null);
        if (typeof data.id === 'string') {
          void loadTranslationStatuses(data.id);
        }
        const name1 = (data.couple_name_1 as string) ?? '';
        const name2 = (data.couple_name_2 as string) ?? '';
        setCoupleNames(name1 && name2 ? `${name1} & ${name2}` : name1 || name2 || '');
        setWeddingDate((data.wedding_date as string | null) ?? null);
        setVenueName((data.venue_name as string | null) ?? null);
        setAccountEmail(user.email ?? '');
        setCurrentTemplate((data.active_template_id as string) || 'base');
        setSiteSlug((data.site_slug as string) ?? '');
        setMusicPlaylistUrl((data.music_playlist_url as string) ?? '');
        if (visibilityDraftGuard.shouldHydrate()) {
          setPrivacyMode((data.privacy_mode as 'public' | 'password_protected' | 'invite_only') ?? 'public');
          setHideFromSearch(!!(data.hide_from_search as boolean | null | undefined));
          setGuestAccessToken((data.guest_access_token as string | null) ?? null);
        }
        const loadedLanguage = SITE_LANGUAGE_OPTIONS.some((option) => option.value === data.default_language)
          ? data.default_language as SiteLanguageCode
          : 'en';
        if (visibilityDraftGuard.shouldHydrate()) {
          setDefaultLanguage(loadedLanguage);
        }
        const prefs = data.notification_prefs as Record<string, boolean> | null;
        if (prefs && notifDraftGuard.shouldHydrate()) {
          setNotifRsvp(prefs.rsvp ?? true);
          setNotifPhotos(prefs.photos ?? true);
          setNotifDigest(prefs.digest ?? false);
          setNotifUpdates(prefs.updates ?? false);
        }

        const normalized = normalizeRsvpQuestions((data as { rsvp_custom_questions?: unknown }).rsvp_custom_questions);
        if (rsvpDraftGuard.shouldHydrate()) {
          setRsvpQuestions(normalized);

          const mealCfg = (data as { rsvp_meal_config?: unknown }).rsvp_meal_config as { enabled?: boolean; options?: unknown[] } | undefined;
          setRsvpMealEnabled(mealCfg?.enabled ?? true);
          setRsvpMealOptions(normalizeMealOptions(mealCfg?.options));
        }

        if ((data.id as string | undefined)) {
          await loadCollaboratorInvites(data.id as string);
        }

      } else {
        setWeddingSiteId(null);
        setAccountEmail(user.email ?? '');
        setSiteSlug('');
        setGuestAccessToken(null);
        setCollaboratorInvites([]);
      }
    } catch (err) {
      setAccountError(safeSettingsError(err, 'Couldn’t load settings right now.'));
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weddingSiteId) return;
    setAccountSaving(true);
    setAccountError(null);
    setAccountSuccess(null);
    try {
      const { name1, name2 } = splitCoupleNames(coupleNames);
      await updateSettingsSite(weddingSiteId, { couple_name_1: name1, couple_name_2: name2 });
      setAccountSuccess('Account information saved.');
    } catch (err) {
      setAccountError(safeSettingsError(err, 'Couldn’t save changes.'));
    } finally {
      setAccountSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (!currentPassword) { setPasswordError('Current password is required.'); return; }
    if (!newPassword) { setPasswordError('New password is required.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }
    if (newPassword.length < 8) { setPasswordError('Password must be at least 8 characters.'); return; }
    setPasswordSaving(true);
    try {
      const authUser = await requireSettingsAuthenticatedUser();
      await verifySettingsCurrentPassword(authUser.email || '', currentPassword);
      await updateSettingsAccountPassword(newPassword);
      logSettingsAction('account_password_changed', 'Account password was changed.');
      setPasswordSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(safeSettingsError(err, 'Couldn’t update password.'));
    } finally {
      setPasswordSaving(false);
    }
  };

  useEffect(() => {
    const invite = readPlannerInvite(siteSlug || user?.id || null);
    if (!invite) return;
    setPlannerInvite(invite);
    setPlannerInviteName(invite.name);
    setPlannerInviteEmail(invite.email);
    setPlannerInviteRole(invite.role);
  }, [siteSlug, user?.id]);

  const publicSiteUrl = siteSlug ? `https://${siteSlug}.dayof.love` : '';
  const plannerRoleOptions = PLANNER_ROLE_OPTIONS.filter((option) => option.value !== 'owner');
  const currentTemplateName = getAllTemplates().find((template) => template.id === currentTemplate)?.name ?? 'Current site theme';
  const weddingIdentityExportKit = useMemo(() => buildWeddingIdentityExportKit({
    coupleNames,
    publicSiteUrl,
    weddingDate,
    venueName,
    templateName: currentTemplateName,
    defaultLanguage,
  }), [coupleNames, currentTemplateName, defaultLanguage, publicSiteUrl, venueName, weddingDate]);
  const weddingIdentityPrintAssets = useMemo(() => buildWeddingIdentityPrintAssets({
    coupleNames,
    publicSiteUrl,
    weddingDate,
    venueName,
    templateName: currentTemplateName,
    defaultLanguage,
  }), [coupleNames, currentTemplateName, defaultLanguage, publicSiteUrl, venueName, weddingDate]);

  const downloadTextFile = (filename: string, content: string, type = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

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

  const tabs = getSettingsTabs(settingsRole);
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
