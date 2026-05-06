import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { DashboardPageHero } from '../../components/dashboard/DashboardPageHero';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Select, Badge } from '../../components/ui';
import { Save, ExternalLink, Layout, Sparkles, Loader2, Eye, EyeOff, Copy, CheckCheck, Plus, Trash2, ChevronDown, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getSiteVisibilityState, getVisibilityModeOptions } from '../../lib/siteVisibilityState';
import { getAllTemplates } from '../../templates/registry';
import { WeddingDataV1 } from '../../types/weddingData';
import { LayoutConfigV1 } from '../../types/layoutConfig';
import { regenerateLayout } from '../../lib/generateInitialLayout';
import { fromExistingLayoutToBuilderProject } from '../../builder/adapters/layoutAdapter';
import { mergeGeneratedDraftIntoBuilderProject } from '../../lib/aiBuilderProjectPatch';
import { fetchBillingInfo, createSubscriptionSession, type BillingInfo } from '../../lib/stripeService';
import { useAuth } from '../../hooks/useAuth';
import { PLANNER_ROLE_OPTIONS, PLANNER_PERMISSION_GROUPS, getPlannerPermissionPreset, readPlannerInvite, writePlannerInvite, type PlannerAccessRole, type PlannerInviteRecord, type PlannerPermissionKey } from '../../lib/plannerAccess';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { useToast } from '../../components/ui/Toast';
import { formatSettingsDate } from './settingsDate';
import { ShareQrPanel } from '../../components/ui/ShareQrPanel';
import { copyTextOrDownload } from '../../lib/copyText';
import { logAppAction } from '../../lib/actionAudit';
import { demoWeddingSite } from '../../lib/demoData';
import { getSafePublicWebUrl } from '../../sections/publicLinks';
import {
  buildWeddingIdentityExportKit,
  buildWeddingIdentityManifestText,
  buildWeddingIdentityPrintAssets,
  renderWeddingIdentityPrintHtml,
} from '../../lib/weddingIdentityExports';
import {
  generateSettingsSecureToken,
  hashSettingsSitePassword,
  createSettingsCollaboratorInvite,
  findSettingsSiteBySlug,
  loadSettingsCollaboratorInvites,
  loadSettingsSite,
  loadSettingsTemplateChangeSite,
  loadSettingsTranslationStatuses,
  revokeSettingsCollaboratorInvite,
  translateSettingsSiteContent,
  updateSettingsSite,
  type SettingsCollaboratorInviteRow,
  type SettingsSiteUpdates,
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
  buildPrivacySettingsUpdates,
  cleanRsvpSettings,
  formatTranslationStatusDate,
  getSiteLanguageLabel,
  makeQuestion,
  normalizeMealOptions,
  normalizeRsvpQuestions,
  normalizeSettingsSlug,
  plannerPermissionLabel,
  safeSettingsError,
  splitCoupleNames,
} from './settings/settingsDashboardUtils';
import { readDemoRsvpSettings, writeDemoRsvpSettings } from './settings/settingsDemoStorage';
import { SettingsAccountPanel } from './settings/SettingsAccountPanel';
import { SettingsBillingPanel } from './settings/SettingsBillingPanel';
import { getSettingsTabs, SettingsNavigation, type SettingsTabId } from './settings/SettingsNavigation';
import { SettingsNotificationsPanel } from './settings/SettingsNotificationsPanel';

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
      const { data: authData } = await supabase.auth.getUser();
      const email = authData.user?.email;
      if (!email) throw new Error('Couldn’t verify your account email right now.');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) throw new Error('Current password is incorrect.');

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
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

  const handleSavePlannerInvite = () => {
    setPlannerInviteError(null);
    setPlannerInviteSuccess(null);
    const name = plannerInviteName.trim();
    const email = plannerInviteEmail.trim().toLowerCase();

    if (!name) {
      setPlannerInviteError("Add your planner's name.");
      return;
    }

    if (!email || !email.includes('@')) {
      setPlannerInviteError('Add a valid planner email.');
      return;
    }

    const invite: PlannerInviteRecord = {
      name,
      email,
      role: plannerInviteRole,
      status: plannerInvite?.status === 'active' ? 'active' : 'pending',
      invitedAtISO: plannerInvite?.invitedAtISO ?? new Date().toISOString(),
      permissions: plannerInvitePermissions,
    };

    try {
      writePlannerInvite(siteSlug || user?.id || null, invite);
      setPlannerInvite(invite);
      setPlannerInviteSuccess(plannerInvite ? 'Planner access updated.' : 'Planner invite saved.');
    } catch (err) {
      setPlannerInviteError(safeSettingsError(err, 'Couldn’t save planner invite.'));
    }
  };

  const handleCreateCollaboratorInvite = async () => {
    setPlannerInviteError(null);
    setPlannerInviteSuccess(null);
    const name = plannerInviteName.trim();
    const email = plannerInviteEmail.trim().toLowerCase();

    const targetSiteId = await resolveSettingsSiteId();
    if (!targetSiteId) {
      setPlannerInviteError(SETTINGS_SITE_MISSING_COPY);
      return;
    }
    if (!user?.id) {
      setPlannerInviteError('Sign in again before creating an invite.');
      return;
    }
    if (!name) {
      setPlannerInviteError("Add your planner's name.");
      return;
    }
    if (!email || !email.includes('@')) {
      setPlannerInviteError('Add a valid planner email.');
      return;
    }

    setCreatingCollaboratorInvite(true);
    try {
      const inviteToken = crypto.randomUUID();
      const data = await createSettingsCollaboratorInvite({
        weddingSiteId: targetSiteId,
        inviteEmail: email,
        inviteName: name,
        role: plannerInviteRole,
        inviteToken,
        invitedBy: user.id,
        permissions: plannerInvitePermissions,
      });

      await loadCollaboratorInvites(targetSiteId);
      logSettingsAction('collaborator_invite_created', 'Collaborator invite was created.', {
        role: plannerInviteRole,
        permissionCount: plannerInvitePermissions.length,
        status: 'pending',
      }, data.id as string, name, targetSiteId);
      setPlannerInviteSuccess('Collaborator invite link created. Copy it and send it to the invited teammate.');
    } catch (err) {
      setPlannerInviteError(safeSettingsError(err, 'Couldn’t create helper invite.'));
    } finally {
      setCreatingCollaboratorInvite(false);
    }
  };

  const handleRevokeCollaboratorInvite = async (inviteId: string) => {
    setPlannerInviteError(null);
    setPlannerInviteSuccess(null);
    setRevokingCollaboratorInviteId(inviteId);
    try {
      const invite = collaboratorInvites.find((row) => row.id === inviteId);
      await revokeSettingsCollaboratorInvite(inviteId);

      if (weddingSiteId) {
        await loadCollaboratorInvites(weddingSiteId);
      }
      logSettingsAction('collaborator_invite_revoked', 'Collaborator invite was revoked.', {
        role: invite?.role ?? null,
        previousStatus: invite?.status ?? null,
      }, inviteId, invite?.invite_name || invite?.invite_email || 'Collaborator invite');
      setPlannerInviteSuccess('Collaborator invite revoked.');
    } catch (err) {
      setPlannerInviteError(safeSettingsError(err, 'Couldn’t revoke helper invite.'));
    } finally {
      setRevokingCollaboratorInviteId(null);
    }
  };

  const handleCopyCollaboratorInviteLink = async (inviteToken: string | undefined) => {
    if (!inviteToken) {
      setPlannerInviteError('This invite link is not ready yet.');
      return;
    }

    const inviteUrl = `${window.location.origin}/accept-collaborator-invite?token=${inviteToken}`;
    const result = await copyTextOrDownload(inviteUrl, 'dayof-collaborator-invite-link.txt');
    if (result === 'copied') {
      setPlannerInviteSuccess('Invite link copied.');
    } else {
      setPlannerInviteSuccess('Clipboard was blocked, so the invite link downloaded.');
    }
    setPlannerInviteError(null);
  };

  const handleResendCollaboratorInvite = async (inviteToken: string | undefined) => {
    await handleCopyCollaboratorInviteLink(inviteToken);
    setPlannerInviteSuccess('Invite link copied for sending.');
  };

  const handleRemovePlannerInvite = () => {
    try {
      writePlannerInvite(siteSlug || user?.id || null, null);
      setPlannerInvite(null);
      setPlannerInviteName('');
      setPlannerInviteEmail('');
      setPlannerInviteRole('planner');
      setPlannerInviteError(null);
      setPlannerInviteSuccess('Planner invite removed.');
    } catch (err) {
      setPlannerInviteError(safeSettingsError(err, 'Couldn’t remove planner invite.'));
    }
  };

  const handleUpdateSlug = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlugSaving(true);
    setSlugError(null);
    setSlugSuccess(null);
    try {
      const cleaned = normalizeSettingsSlug(siteSlug);
      if (!cleaned) { setSlugError('URL cannot be empty.'); setSlugSaving(false); return; }

      let targetSiteId = weddingSiteId;
      if (!targetSiteId && user?.id) {
        targetSiteId = await resolveSettingsSiteId();
        if (targetSiteId) setWeddingSiteId(targetSiteId);
      }
      if (!targetSiteId) {
        setSlugError(SETTINGS_SITE_MISSING_COPY);
        setSlugSaving(false);
        return;
      }

      const existing = await findSettingsSiteBySlug(cleaned);
      if (existing && existing.id !== targetSiteId) {
        setSlugError('That URL is already taken. Please choose another.');
        setSlugSaving(false);
        return;
      }
      await updateSettingsSite(targetSiteId, { site_slug: cleaned });
      setSiteSlug(cleaned);
      logSettingsAction('site_slug_updated', 'Public site URL slug was updated.', { slug: cleaned }, targetSiteId, cleaned, targetSiteId);
      setSlugSuccess(`Site URL updated to /${cleaned}`);
    } catch (err) {
      setSlugError(safeSettingsError(err, 'Couldn’t update URL.'));
    } finally {
      setSlugSaving(false);
    }
  };

  const handleSavePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setVisibilitySaving(true);
    setVisibilityError(null);
    setVisibilitySuccess(null);
    let nextGuestAccessToken: string | null = null;
    try {
      const targetSiteId = await resolveSettingsSiteId();
      if (!targetSiteId) {
        setVisibilityError(SETTINGS_SITE_MISSING_COPY);
        return;
      }

      const sitePasswordHash = privacyMode === 'password_protected' && sitePassword
        ? await hashSettingsSitePassword(sitePassword)
        : null;

      if (privacyMode === 'invite_only' && !guestAccessToken) {
        nextGuestAccessToken = await generateSettingsSecureToken();
      }

      const updates: SettingsSiteUpdates = buildPrivacySettingsUpdates({
        privacyMode,
        hideFromSearch,
        defaultLanguage,
        sitePasswordHash,
        guestAccessToken: nextGuestAccessToken,
      });

      await updateSettingsSite(targetSiteId, updates);
      if (nextGuestAccessToken) setGuestAccessToken(nextGuestAccessToken);
      visibilityDraftGuard.markSaved();
      setSitePassword('');
      logSettingsAction('site_privacy_saved', 'Site privacy and access settings were updated.', {
        privacyMode,
        hideFromSearch,
        defaultLanguage,
        passwordChanged: privacyMode === 'password_protected' && Boolean(sitePassword),
        guestAccessTokenCreated: Boolean(nextGuestAccessToken),
      }, targetSiteId, 'Site privacy', targetSiteId);
      setVisibilitySuccess('Privacy settings saved.');
    } catch (err) {
      setVisibilityError(safeSettingsError(err, 'Couldn’t save sharing settings.'));
    } finally {
      setVisibilitySaving(false);
    }
  };

  const handleRegenerateToken = async () => {
    try {
      const targetSiteId = await resolveSettingsSiteId();
      if (!targetSiteId) {
        toast(SETTINGS_SITE_MISSING_COPY, 'error');
        return;
      }

      const data = await generateSettingsSecureToken();
      await updateSettingsSite(targetSiteId, { guest_access_token: data });
      setGuestAccessToken(data);
      logSettingsAction('guest_access_token_regenerated', 'Invite-only guest access link was regenerated.', { privacyMode }, targetSiteId, 'Guest access link', targetSiteId);
      toast('Guest access link refreshed.', 'success');
    } catch (err) {
      toast(safeSettingsError(err, 'Couldn’t refresh guest access link.'), 'error');
    }
  };

  const copyInviteLink = async () => {
    if (!guestAccessToken || !siteSlug) return;
    const url = `${window.location.origin}/site/${siteSlug}?token=${guestAccessToken}`;
    const result = await copyTextOrDownload(url, 'dayof-guest-access-link.txt');
    if (result === 'copied') {
      setPrivacyCopied(true);
      setTimeout(() => setPrivacyCopied(false), 2000);
    } else {
      toast('Clipboard was blocked, so the guest access link downloaded.', 'success');
    }
  };

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

  const copyIdentityManifest = async () => {
    const manifest = buildWeddingIdentityManifestText(weddingIdentityExportKit);
    const result = await copyTextOrDownload(manifest, 'dayof-wedding-identity-export-manifest.txt');
    toast(result === 'copied' ? 'Wedding identity manifest copied.' : 'Wedding identity manifest downloaded.', 'success');
  };

  const downloadIdentityPrintPack = () => {
    if (weddingIdentityPrintAssets.length === 0) {
      toast('Set a public site URL before saving the identity print pack.', 'error');
      return;
    }

    downloadTextFile(
      'dayof-wedding-identity-print-pack.html',
      renderWeddingIdentityPrintHtml(weddingIdentityPrintAssets),
      'text/html;charset=utf-8'
    );
    toast('Wedding identity print pack saved.', 'success');
  };

  const togglePlannerPermission = (key: PlannerPermissionKey) => {
    setPlannerInvitePermissions((prev) => prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]);
  };
  const handleDefaultLanguageChange = async (next: SiteLanguageCode) => {
    const previous = defaultLanguage;
    visibilityDraftGuard.markDirty();
    setDefaultLanguage(next);
    setVisibilityError(null);
    setVisibilitySuccess(null);
    try {
      const targetSiteId = await resolveSettingsSiteId();
      if (!targetSiteId) {
        setDefaultLanguage(previous);
        visibilityDraftGuard.markSaved();
        setVisibilityError(SETTINGS_SITE_MISSING_COPY);
        return;
      }

      await updateSettingsSite(targetSiteId, { default_language: next });
      visibilityDraftGuard.markSaved();
      logSettingsAction('default_language_updated', 'Default public-site language was updated.', { language: next }, targetSiteId, getSiteLanguageLabel(next), targetSiteId);
      setVisibilitySuccess(`Default language set to ${getSiteLanguageLabel(next)}.`);
    } catch (err) {
      setDefaultLanguage(previous);
      visibilityDraftGuard.markSaved();
      setVisibilityError(safeSettingsError(err, 'Couldn’t save default language.'));
    }
  };

  const handleAutoTranslateLanguage = async (language: TranslationLanguageCode) => {
    setTranslatingLanguage(language);
    setVisibilityError(null);
    setVisibilitySuccess(null);
    try {
      const targetSiteId = await resolveSettingsSiteId();
      if (!targetSiteId) {
        setVisibilityError(SETTINGS_SITE_MISSING_COPY);
        return;
      }

      await translateSettingsSiteContent(targetSiteId, language);
      await loadTranslationStatuses(targetSiteId);
      logSettingsAction('site_translation_generated', 'Site translation was generated.', { language }, targetSiteId, getSiteLanguageLabel(language), targetSiteId);
      setVisibilitySuccess(`${getSiteLanguageLabel(language)} translation generated. Guests can switch languages on the public site.`);
    } catch (err) {
      setVisibilityError(safeSettingsError(err, 'Couldn’t prepare translation.'));
    } finally {
      setTranslatingLanguage(null);
    }
  };

  const handleSaveMusicPlaylist = async () => {
    setVisibilityError(null);
    setVisibilitySuccess(null);
    try {
      const targetSiteId = await resolveSettingsSiteId();
      if (!targetSiteId) {
        setVisibilityError(SETTINGS_SITE_MISSING_COPY);
        return;
      }

      const value = musicPlaylistUrl.trim();
      await updateSettingsSite(targetSiteId, { music_playlist_url: value || null });
      logSettingsAction('music_playlist_saved', 'Song request playlist link was saved.', { hasPlaylist: Boolean(value) }, targetSiteId, 'Song request playlist', targetSiteId);
      setVisibilitySuccess('Song request playlist link saved.');
    } catch (err) {
      setVisibilityError(safeSettingsError(err, 'Couldn’t save playlist link.'));
    }
  };

  const saveRsvpSettings = async () => {
    setRsvpQuestionsSaving(true);
    setRsvpQuestionsSuccess(null);
    setRsvpQuestionsError(null);

    try {
      const { cleanedQuestions, cleanedMealOptions, validationError } = cleanRsvpSettings({
        questions: rsvpQuestions,
        mealEnabled: rsvpMealEnabled,
        mealOptions: rsvpMealOptions,
      });
      if (validationError) {
        setRsvpQuestionsError(validationError);
        return;
      }

      let targetSiteId = weddingSiteId;
      if (!targetSiteId && user?.id) {
        const activeSite = await resolveActiveSiteForUser(user.id);
        targetSiteId = activeSite?.id ?? null;
        if (targetSiteId) setWeddingSiteId(targetSiteId);
      }

      if (!targetSiteId) {
        if (isDemoMode) {
          writeDemoRsvpSettings({ questions: cleanedQuestions, mealEnabled: rsvpMealEnabled, mealOptions: cleanedMealOptions });
          setRsvpQuestions(cleanedQuestions);
          setRsvpQuestionsSuccess('RSVP settings saved (demo).');
          return;
        }

        setRsvpQuestionsError(SETTINGS_SITE_MISSING_COPY);
        return;
      }

      await updateSettingsSite(targetSiteId, {
        rsvp_custom_questions: cleanedQuestions,
        rsvp_meal_config: { enabled: rsvpMealEnabled, options: cleanedMealOptions },
      });
      setRsvpQuestions(cleanedQuestions);
      setRsvpMealOptions(cleanedMealOptions);
      rsvpDraftGuard.markSaved();
      logSettingsAction('rsvp_settings_saved', 'RSVP custom questions and meal settings were updated.', {
        customQuestionCount: cleanedQuestions.length,
        mealEnabled: rsvpMealEnabled,
        mealOptionCount: cleanedMealOptions.length,
      }, targetSiteId, 'RSVP settings', targetSiteId);
      setRsvpQuestionsSuccess('RSVP settings saved.');
    } catch (err) {
      setRsvpQuestionsError(safeSettingsError(err, 'Couldn’t save RSVP questions.'));
    } finally {
      setRsvpQuestionsSaving(false);
    }
  };

  const handleSaveRsvpQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveRsvpSettings();
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifSaving(true);
    setNotifError(null);
    setNotifSuccess(null);
    try {
      const targetSiteId = await resolveSettingsSiteId();
      if (!targetSiteId) {
        setNotifError(SETTINGS_SITE_MISSING_COPY);
        return;
      }

      await updateSettingsSite(targetSiteId, {
        notification_prefs: { rsvp: notifRsvp, photos: notifPhotos, digest: notifDigest, updates: notifUpdates },
      });
      notifDraftGuard.markSaved();
      logSettingsAction('notification_preferences_saved', 'Notification preferences were updated.', {
        rsvp: notifRsvp,
        photos: notifPhotos,
        digest: notifDigest,
        updates: notifUpdates,
      }, targetSiteId, 'Notification preferences', targetSiteId);
      setNotifSuccess('Preferences saved.');
    } catch (err) {
      setNotifError(safeSettingsError(err, 'Couldn’t save preferences.'));
    } finally {
      setNotifSaving(false);
    }
  };

  const handleSubscribe = async () => {
    if (!billingInfo) return;
    setSubscribeLoading(true);
    setSubscribeError(null);
    try {
      const origin = window.location.origin;
      const url = await createSubscriptionSession(
        billingInfo.wedding_site_id,
        `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        `${origin}/dashboard/settings?tab=billing&canceled=1`
      );
      void logAppAction({
        weddingSiteId: billingInfo.wedding_site_id,
        area: 'billing',
        type: 'subscription_checkout_started',
        summary: 'Subscription checkout was started.',
        targetId: billingInfo.wedding_site_id,
        targetLabel: 'Subscription checkout',
        metadata: {
          currentPaymentStatus: billingInfo.payment_status,
          currentBillingType: billingInfo.billing_type,
        },
      });
      window.location.href = url;
    } catch (err) {
      setSubscribeError(safeSettingsError(err, 'Couldn’t start checkout right now.'));
      setSubscribeLoading(false);
    }
  };

  const handleTemplateChange = async (newTemplateId: string) => {
    if (!weddingSiteId) return;
    setChangingTemplate(true);
    setTemplateError(null);
    setTemplateSuccess(null);
    try {
      const data = await loadSettingsTemplateChangeSite(weddingSiteId);
      if (!data) throw new Error(SETTINGS_SITE_MISSING_COPY);

      const weddingData = data.wedding_data as WeddingDataV1;
      const currentLayout = data.layout_config as LayoutConfigV1;
      const newLayout = regenerateLayout(newTemplateId, weddingData, currentLayout);
      const rebuiltProject = fromExistingLayoutToBuilderProject(weddingSiteId, newLayout);
      const aiDraft = ((((data.wedding_data as Record<string, unknown> | null)?.meta as Record<string, unknown> | undefined)?.aiDraft as import('../../lib/aiDraftGenerator').DraftGenerationResult | undefined) ?? null);
      const aiContent = ((((data.wedding_data as Record<string, unknown> | null)?.meta as Record<string, unknown> | undefined)?.aiContent as import('../../lib/aiCanonicalContent').AiCanonicalSectionContent | undefined) ?? null);
      const photoBuckets = ((((data.wedding_data as Record<string, unknown> | null)?.meta as Record<string, unknown> | undefined)?.photoBuckets as import('../../lib/aiPhotoBuckets').CanonicalPhotoBuckets | undefined) ?? null);
      const remappedSiteJson = aiDraft
        ? mergeGeneratedDraftIntoBuilderProject(rebuiltProject as unknown as Record<string, unknown>, aiDraft, aiContent, photoBuckets)
        : rebuiltProject;

      await updateSettingsSite(weddingSiteId, { active_template_id: newTemplateId, layout_config: newLayout, site_json: remappedSiteJson });
      setCurrentTemplate(newTemplateId);
      logSettingsAction('template_changed', 'Site template was changed.', {
        templateId: newTemplateId,
        preservedContent: true,
      }, weddingSiteId, newTemplateId, weddingSiteId);
      setTemplateSuccess('Template changed successfully. Your content has been preserved.');
    } catch (err: unknown) {
      setTemplateError(safeSettingsError(err, 'Couldn’t change design.'));
    } finally {
      setChangingTemplate(false);
    }
  };

  const tabs = getSettingsTabs(settingsRole);
  const translationStatusByLanguage = new Map(translationStatuses.map((row) => [row.language, row]));

  return (
    <DashboardLayout currentPage="settings">
      <div className="max-w-5xl mx-auto space-y-8">
        <DashboardPageHero
          eyebrow="Settings"
          title="The quiet controls behind your wedding site."
          description="Update access, language, RSVP behavior, notifications, and billing when you need to. The everyday planning tools stay out front."
          stats={[
            { label: 'Language', value: getSiteLanguageLabel(defaultLanguage), detail: 'public site default' },
            { label: 'Access', value: tabs.some((tab) => tab.id === 'team') ? 'Team ready' : 'Owner only', detail: settingsRole === 'owner' ? 'invite links available' : 'limited by role' },
            { label: 'RSVP', value: rsvpQuestions.length, detail: 'custom questions' },
          ]}
        />

        <div className="flex flex-col md:flex-row gap-8">
          <SettingsNavigation activeTab={activeTab} tabs={tabs} onTabChange={setActiveTab} />

          <div className="flex-1 space-y-6">
            {activeTab === 'account' && (
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

            {activeTab === 'team' && (
              <>

                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          Planner access
                        </CardTitle>
                        <CardDescription>Invite planners, coordinators, or trusted helpers with role-based access that stays separate from couple ownership and billing.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-4 space-y-2">
                      <p className="text-sm font-medium text-text-primary">Invite your planner, not a generic staff account</p>
                      <p className="text-sm text-text-secondary">Keep ownership with the couple while sharing the parts of dayof that help someone run the event well. Helpers claim access from a secure invite link and do not touch billing.</p>
                    </div>

                    {plannerInviteSuccess && (
                      <div className="rounded-lg border border-success/20 bg-success-light p-3 text-sm text-success">{plannerInviteSuccess}</div>
                    )}
                    {plannerInviteError && (
                      <div className="rounded-lg border border-border-subtle bg-surface-subtle p-3 text-sm text-text-secondary">{plannerInviteError}</div>
                    )}

                    <div className="grid gap-3 md:grid-cols-3">
                      {plannerRoleOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            const nextRole = option.value as 'planner' | 'coordinator' | 'viewer';
                            setPlannerInviteRole(nextRole);
                            setPlannerInvitePermissions(getPlannerPermissionPreset(nextRole));
                          }}
                          className={`rounded-lg border p-4 text-left transition-colors ${plannerInviteRole === option.value ? 'border-primary bg-primary/5' : 'border-border-subtle bg-white hover:border-primary/35'}`}
                        >
                          <p className="text-sm font-medium text-text-primary">{option.label}</p>
                          <p className="mt-1 text-xs text-text-secondary">{option.description}</p>
                        </button>
                      ))}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label htmlFor="planner-invite-name" className="block text-sm font-medium text-text-primary mb-2">Planner name</label>
                        <Input id="planner-invite-name" value={plannerInviteName} onChange={(e) => setPlannerInviteName(e.target.value)} placeholder="Your planner or coordinator" />
                      </div>
                      <div>
                        <label htmlFor="planner-invite-email" className="block text-sm font-medium text-text-primary mb-2">Planner email</label>
                        <Input id="planner-invite-email" value={plannerInviteEmail} onChange={(e) => setPlannerInviteEmail(e.target.value)} placeholder="planner@example.com" />
                      </div>
                    </div>

                    <div className="rounded-lg border border-dashed border-border bg-surface-subtle/20 p-4 space-y-3">
                      <div>
                        <p className="text-sm font-medium text-text-primary">Permissions</p>
                        <p className="mt-1 text-sm text-text-secondary">Start with a role preset, then tighten or expand access simply before you send the invite.</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {PLANNER_PERMISSION_GROUPS.map((permission) => {
                          const checked = plannerInvitePermissions.includes(permission.key);
                          return (
                            <label key={permission.key} className={`rounded-lg border p-3 cursor-pointer transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border-subtle bg-white hover:border-primary/30'}`}>
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePlannerPermission(permission.key)}
                                  className="mt-1 h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary/30"
                                />
                                <div>
                                  <p className="text-sm font-medium text-text-primary">{permission.label}</p>
                                  <p className="mt-1 text-xs text-text-secondary">{permission.description}</p>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-xs text-text-tertiary">Billing and couple ownership stay with the owner. This selector is for support access only.</p>
                    </div>

                    {plannerInvite && (
                      <div className="rounded-lg border border-border-subtle bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-text-primary">Access setup saved for {plannerInvite.name}</p>
                            <p className="mt-1 text-xs text-text-secondary">{plannerInvite.email} · {plannerRoleOptions.find((option) => option.value === plannerInvite.role)?.label} · {plannerInvite.status === 'active' ? 'Active' : 'Pending'}</p>
                          </div>
                          <Badge variant={plannerInvite.status === 'active' ? 'success' : 'secondary'}>{plannerInvite.status === 'active' ? 'Active' : 'Pending'}</Badge>
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 p-4 space-y-3">
                      <div>
                        <p className="text-sm font-medium text-text-primary">Collaborator list</p>
                        <p className="mt-1 text-xs text-text-secondary">Track pending and accepted access links, copy invite URLs, and revoke pending access before it is claimed.</p>
                      </div>

                      {plannerInvite ? (
                        <div className="rounded-lg border border-border-subtle bg-white px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-text-primary">{plannerInvite.name}</p>
                              <p className="mt-1 text-xs text-text-secondary">{plannerInvite.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{plannerRoleOptions.find((option) => option.value === plannerInvite.role)?.label || plannerInvite.role}</Badge>
                              <Badge variant={plannerInvite.status === 'active' ? 'success' : 'secondary'}>{plannerInvite.status === 'active' ? 'Active' : 'Pending'}</Badge>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border-subtle bg-white px-4 py-3 text-sm text-text-secondary">
                          No collaborator access setups saved yet.
                        </div>
                      )}

                      {collaboratorInvites.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-text-tertiary">Sent invite links</p>
                          {collaboratorInvites.map((invite) => (
                            <div key={invite.id} className="rounded-lg border border-border-subtle bg-white px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-text-primary">{invite.invite_name || invite.invite_email}</p>
                                  <p className="mt-1 text-xs text-text-secondary">{invite.invite_email} · {invite.role} · {formatSettingsDate(invite.invited_at)}{invite.expires_at ? ` · expires ${formatSettingsDate(invite.expires_at)}` : ''}</p>
                                  {invite.permissions && invite.permissions.length > 0 && <p className="mt-1 text-[11px] text-text-tertiary">{invite.permissions.map(plannerPermissionLabel).join(' · ')}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={invite.status === 'accepted' ? 'success' : invite.status === 'pending' ? 'secondary' : 'warning'}>{invite.status}</Badge>
                                  {invite.status === 'pending' && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => handleCopyCollaboratorInviteLink(invite.invite_token)}>
                                      Copy link
                                    </Button>
                                  )}
                                  {invite.status === 'pending' && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => { void handleResendCollaboratorInvite(invite.invite_token); }}>
                                      Copy again
                                    </Button>
                                  )}
                                  {invite.status === 'pending' && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => handleRevokeCollaboratorInvite(invite.id)} disabled={revokingCollaboratorInviteId === invite.id}>
                                      {revokingCollaboratorInviteId === invite.id ? 'Revoking…' : 'Revoke'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      {plannerInvite && (
                        <Button type="button" variant="outline" size="sm" onClick={handleRemovePlannerInvite}>Remove invite</Button>
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={handleCreateCollaboratorInvite} disabled={creatingCollaboratorInvite}>
                        {creatingCollaboratorInvite ? 'Creating invite…' : 'Create invite link'}
                      </Button>
                      <Button type="button" variant="primary" size="md" onClick={handleSavePlannerInvite}>
                        {plannerInvite ? 'Update planner access' : 'Save planner invite'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

              </>
            )}

            {activeTab === 'site' && (
              <>
                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <CardTitle>Site URL</CardTitle>
                    <CardDescription>Your wedding site address</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdateSlug} className="space-y-4">
                      {slugSuccess && (
                        <div className="p-3 bg-success-light border border-success/20 rounded-lg text-success text-sm">{slugSuccess}</div>
                      )}
                      {slugError && (
                        <div className="p-3 bg-surface-subtle border border-border-subtle rounded-lg text-text-secondary text-sm">{slugError}</div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Current URL
                        </label>
                        <div className="flex items-center gap-3">
                          <Input
                            value={siteSlug}
                            onChange={e => setSiteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            className="flex-1"
                            placeholder="yournames"
                          />
                          <span className="text-text-secondary flex-shrink-0">.dayof.love</span>
                        </div>
                        {siteSlug && (
                          <div className="mt-2 space-y-2">
                            <p className="text-sm text-text-secondary">
                              Your site is accessible at{' '}
                              <a
                                href={publicSiteUrl}
                                className="text-primary hover:text-primary-hover"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {siteSlug}.dayof.love
                                <ExternalLink className="inline w-3 h-3 ml-1" aria-hidden="true" />
                              </a>
                            </p>
                            <ShareQrPanel
                              title="Public site QR"
                              description="Print this or add it to signage so guests can open the wedding site quickly."
                              url={publicSiteUrl}
                              copyLabel="Copy site link"
                              className="mt-3"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button variant="primary" size="md" type="submit" disabled={slugSaving}>
                          {slugSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          Update URL
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle>Wedding identity exports</CardTitle>
                        <CardDescription>Prepare one consistent kit for QR cards, inserts, signage, and planner handoff.</CardDescription>
                      </div>
                      <Badge variant={weddingIdentityExportKit.warnings.length > 0 ? 'warning' : 'success'}>
                        {weddingIdentityExportKit.readyCount} of {weddingIdentityExportKit.items.length} ready
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {weddingIdentityExportKit.items.map((item) => (
                          <div key={item.id} className="rounded-lg border border-border-subtle bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                                <p className="mt-1 text-xs text-text-secondary">{item.description}</p>
                              </div>
                              <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                                item.status === 'ready'
                                  ? 'bg-success/10 text-success'
                                  : item.status === 'needs-info'
                                    ? 'bg-warning/10 text-warning'
                                    : 'bg-surface-subtle text-text-tertiary'
                              }`}>
                                {item.status === 'ready' ? 'Ready' : item.status === 'needs-info' ? 'Needs info' : 'Planned'}
                              </span>
                            </div>
                            <p className="mt-2 text-[11px] text-text-tertiary">{item.format}</p>
                            {item.blockers.length > 0 && (
                              <p className="mt-2 text-[11px] leading-4 text-text-secondary">{item.blockers.join(' ')}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-4">
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {weddingIdentityExportKit.manifest.map((entry) => (
                            <div key={entry.label}>
                              <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">{entry.label}</p>
                              <p className="mt-0.5 truncate text-sm text-text-primary">{entry.value}</p>
                            </div>
                          ))}
                        </div>
                        {weddingIdentityExportKit.warnings.length > 0 && (
                          <div className="mt-3 space-y-1 text-xs text-text-secondary">
                            {weddingIdentityExportKit.warnings.map((warning) => (
                              <p key={warning}>{warning}</p>
                            ))}
                          </div>
                        )}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={copyIdentityManifest}>
                            <Copy className="mr-1 h-3.5 w-3.5" />
                            Copy manifest
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={weddingIdentityPrintAssets.length === 0}
                            onClick={downloadIdentityPrintPack}
                          >
                            <Layout className="mr-1 h-3.5 w-3.5" />
                            Save print pack
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle>Privacy Settings</CardTitle>
                        <CardDescription>Control who can view your site</CardDescription>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowPrivacySettings((v) => !v)}>
                        {showPrivacySettings ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!showPrivacySettings ? (
                      <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-4 text-sm text-text-secondary">
                        Hidden by default to keep things simple. Open it when you want to choose who can see your site.
                      </div>
                    ) : (
                    <form onSubmit={handleSavePrivacy} className="space-y-5">
                      {visibilitySuccess && (
                        <div className="p-3 bg-success-light border border-success/20 rounded-lg text-success text-sm">{visibilitySuccess}</div>
                      )}
                      {visibilityError && (
                        <div className="p-3 bg-surface-subtle border border-border-subtle rounded-lg text-text-secondary text-sm">{visibilityError}</div>
                      )}

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-primary">Default site language</label>
                        <p className="text-xs text-text-secondary">Sets the default language for your public wedding site and RSVP page.</p>
                        <div className="flex gap-3">
                          {SITE_LANGUAGE_OPTIONS.map(opt => (
                            <label
                              key={opt.value}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-colors ${
                                defaultLanguage === opt.value
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/40'
                              }`}
                            >
                              <input
                                type="radio"
                                name="default_language"
                                value={opt.value}
                                checked={defaultLanguage === opt.value}
                                onChange={() => { void handleDefaultLanguageChange(opt.value); }}
                                className="text-primary focus:ring-primary"
                              />
                              <span className="text-sm font-medium text-text-primary">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                        <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-text-primary">Auto-translate public site</p>
                              <p className="text-xs text-text-secondary">Generate stored translated versions of guest-facing site copy. Review the public site after generation.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {TRANSLATION_LANGUAGE_OPTIONS.map((language) => (
                                <Button
                                  key={language.value}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleAutoTranslateLanguage(language.value)}
                                  disabled={translatingLanguage === language.value}
                                >
                                  {translatingLanguage === language.value ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                  {translatingLanguage === language.value ? 'Translating…' : language.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                            {TRANSLATION_LANGUAGE_OPTIONS.map((language) => {
                              const status = translationStatusByLanguage.get(language.value);
                              const ready = status?.status === 'ready';
                              const failed = status?.status === 'failed';
                              return (
                                <div key={language.value} className="rounded-lg border border-border bg-white px-3 py-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-semibold text-text-primary">{language.label}</p>
                                    <span className={`rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                                      ready
                                        ? 'bg-success/10 text-success'
                                        : failed
                                          ? 'bg-surface-subtle text-text-secondary'
                                          : 'bg-surface-subtle text-text-tertiary'
                                    }`}>
                                      {ready ? 'Ready' : failed ? 'Try again' : 'Not yet'}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[11px] leading-4 text-text-tertiary">
                                    {formatTranslationStatusDate(status?.translated_at ?? null)}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-4 space-y-2">
                        <p className="text-sm font-medium text-text-primary">Visibility states</p>
                        <ul className="space-y-1 text-xs text-text-secondary">
                          <li>• <span className="font-medium text-text-primary">Draft</span> means only you can see the site while editing.</li>
                          <li>• <span className="font-medium text-text-primary">Protected live access</span> lets you limit who can open the guest-facing site once it is live.</li>
                          <li>• <span className="font-medium text-text-primary">Share with guests</span> makes the site live at your dayof URL.</li>
                        </ul>
                      </div>

                      <div className="space-y-3">
                        {getVisibilityModeOptions().map(opt => (
                          <label
                            key={opt.value}
                            className={`flex items-start gap-3 p-3.5 rounded-lg border-2 cursor-pointer transition-colors ${
                              privacyMode === opt.value
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/40'
                            }`}
                          >
                            <input
                              type="radio"
                              name="privacy_mode"
                              value={opt.value}
                              checked={privacyMode === opt.value}
                              onChange={() => {
                                visibilityDraftGuard.markDirty();
                                setPrivacyMode(opt.value);
                              }}
                              className="mt-0.5 text-primary focus:ring-primary"
                            />
                            <div>
                              <p className="font-medium text-text-primary text-sm">{opt.label}</p>
                              <p className="text-xs text-text-secondary mt-0.5">{opt.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>

                      {privacyMode === 'password_protected' && (
                        <div className="p-4 bg-surface-subtle border border-border rounded-lg space-y-3">
                          <p className="text-sm font-medium text-text-primary">Site password</p>
                          <p className="text-xs text-text-secondary">Guests will be prompted to enter this before viewing the site.</p>
                          <div className="relative">
                            <input
                              type={showSitePassword ? 'text' : 'password'}
                              value={sitePassword}
                              onChange={e => {
                                visibilityDraftGuard.markDirty();
                                setSitePassword(e.target.value);
                              }}
                              placeholder="Set new password…"
                              className="w-full px-3 py-2 pr-10 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSitePassword(v => !v)}
                              className="absolute right-3 top-2.5 text-text-tertiary hover:text-text-primary"
                              aria-label={showSitePassword ? 'Hide' : 'Show'}
                            >
                              {showSitePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="text-xs text-text-tertiary">Leave blank to keep the existing password.</p>
                        </div>
                      )}

                      {privacyMode === 'invite_only' && (
                        <div className="p-4 bg-surface-subtle border border-border rounded-lg space-y-3">
                          <p className="text-sm font-medium text-text-primary">Invite-only guest access link</p>
                          <p className="text-xs text-text-secondary">Share this link with guests you want to allow through your invite-only access setting. This is a guest access control, not a separate unpublished preview product, and it is separate from search visibility.</p>
                          {guestAccessToken && siteSlug ? (
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-xs bg-background border border-border rounded-lg px-3 py-2 text-text-secondary truncate">
                                {`${window.location.origin}/site/${siteSlug}?token=${guestAccessToken.slice(0, 12)}…`}
                              </code>
                              <Button type="button" variant="outline" size="sm" onClick={copyInviteLink}>
                                {privacyCopied ? <CheckCheck className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-text-secondary">Save settings to generate the link.</p>
                          )}
                          {guestAccessToken && (
                            <button
                              type="button"
                              onClick={handleRegenerateToken}
                              className="text-xs text-text-tertiary hover:text-text-secondary hover:underline"
                            >
                              Regenerate access link (old link stops working)
                            </button>
                          )}
                        </div>
                      )}

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hideFromSearch}
                          onChange={e => {
                            visibilityDraftGuard.markDirty();
                            setHideFromSearch(e.target.checked);
                          }}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <div>
                          <p className="text-sm font-medium text-text-primary">Hide from search engines</p>
                          <p className="text-xs text-text-secondary">Adds a noindex tag so search engines should not list your site. Search visibility is separate from invite-only access links and separate from whether you have fully gone live for guests.</p>
                        </div>
                      </label>

                      <div className="flex justify-end pt-2">
                        <Button variant="primary" size="md" type="submit" disabled={visibilitySaving}>
                          {visibilitySaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Save Privacy Settings
                        </Button>
                      </div>
                    </form>
                    )}
                  </CardContent>
                </Card>

                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Layout className="w-5 h-5" />
                          Template
                        </CardTitle>
                        <CardDescription>Try a different look for your website without losing your content</CardDescription>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowTemplateSettings((v) => !v)}>
                        {showTemplateSettings ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!showTemplateSettings ? (
                      <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-4 text-sm text-text-secondary">
                        Hidden by default to keep things calm. Open it when you want to change how your site looks.
                      </div>
                    ) : (
                      <>
                        {templateSuccess && (
                          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
                            {templateSuccess}
                          </div>
                        )}
                        {templateError && (
                          <div className="p-3 bg-surface-subtle border border-border-subtle rounded-lg text-text-secondary text-sm">
                            {templateError}
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-3">
                            Choose a different design
                          </label>
                          <div className="grid md:grid-cols-3 gap-4">
                            {getAllTemplates().map((template) => (
                              <button
                                key={template.id}
                                onClick={() => handleTemplateChange(template.id)}
                                disabled={changingTemplate || currentTemplate === template.id}
                                className={`p-4 rounded-lg border-2 transition-all text-left ${
                                  currentTemplate === template.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50 hover:bg-surface-subtle'
                                } ${changingTemplate ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <h3 className="font-semibold text-text-primary mb-1">
                                  {template.name}
                                  {currentTemplate === template.id && (
                                    <Badge variant="primary" className="ml-2">Current</Badge>
                                  )}
                                </h3>
                                <p className="text-sm text-text-secondary">
                                  {template.description}
                                </p>
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-text-secondary mt-3">
                            Your names, details, and content stay in place when you switch designs.
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === 'rsvp' && (
              <>
                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle>Meal Choice</CardTitle>
                        <CardDescription>Toggle meal collection and customize options shown on RSVP</CardDescription>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowMealChoiceSettings((v) => !v)}>
                        {showMealChoiceSettings ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!showMealChoiceSettings ? (
                      <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-4 text-sm text-text-secondary">
                        Hidden by default to keep RSVP setup lighter. Open this section only if you want guests to choose a meal.
                      </div>
                    ) : (
                      <>
                        <label className="flex items-center gap-2 text-sm text-text-primary">
                          <input type="checkbox" checked={rsvpMealEnabled} onChange={(e) => { rsvpDraftGuard.markDirty(); setRsvpMealEnabled(e.target.checked); }} className="w-4 h-4 rounded border-border text-primary" />
                          Collect meal choice on RSVP form
                        </label>
                        {rsvpMealEnabled && (
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-text-primary">Meal options</label>
                            {rsvpMealOptions.map((opt, idx) => (
                              <div key={`meal-opt-${idx}`} className="flex items-center gap-2">
                                <Input value={opt} onChange={(e) => { rsvpDraftGuard.markDirty(); setRsvpMealOptions((prev) => { const n=[...prev]; n[idx]=e.target.value; return n; }); }} placeholder={`Meal option ${idx+1}`} />
                                <Button type="button" variant="ghost" size="sm" onClick={() => { rsvpDraftGuard.markDirty(); setRsvpMealOptions((prev) => prev.filter((_, i) => i !== idx)); }}><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            ))}
                            <div className="flex flex-wrap items-center gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => { rsvpDraftGuard.markDirty(); setRsvpMealOptions((prev) => [...prev, '']); }}><Plus className="w-4 h-4 mr-1" />Add meal option</Button>
                              <Button type="button" variant="primary" size="sm" onClick={() => void saveRsvpSettings()} disabled={rsvpQuestionsSaving}>
                                {rsvpQuestionsSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Save meal choices
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {!showAdvancedRsvp && rsvpQuestionsSuccess && (
                      <div className="p-3 bg-success-light border border-success/20 rounded-lg text-success text-sm">{rsvpQuestionsSuccess}</div>
                    )}
                    {!showAdvancedRsvp && rsvpQuestionsError && (
                      <div className="p-3 bg-surface-subtle border border-border-subtle rounded-lg text-text-secondary text-sm">{rsvpQuestionsError}</div>
                    )}
                  </CardContent>
                </Card>

                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle>RSVP Custom Questions</CardTitle>
                        <CardDescription>Add optional questions to collect extra details from guests</CardDescription>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowAdvancedRsvp((v) => !v)}>
                        {showAdvancedRsvp ? 'Hide advanced RSVP' : 'Show advanced RSVP'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!showAdvancedRsvp ? (
                      <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-4 text-sm text-text-secondary">
                        Hidden by default to keep RSVP setup simple. Open this section if you want to ask extra questions or let guests share song requests.
                      </div>
                    ) : (
                    <form onSubmit={handleSaveRsvpQuestions} className="space-y-4">
                      {rsvpQuestionsSuccess && (
                        <div className="p-3 bg-success-light border border-success/20 rounded-lg text-success text-sm">{rsvpQuestionsSuccess}</div>
                      )}
                      {rsvpQuestionsError && (
                        <div className="p-3 bg-surface-subtle border border-border-subtle rounded-lg text-text-secondary text-sm">{rsvpQuestionsError}</div>
                      )}

                      <div className="space-y-3">
                        {rsvpQuestions.length === 0 && (
                          <p className="text-sm text-text-secondary">No custom questions yet. Add one below if you need something beyond the standard RSVP flow.</p>
                        )}

                        {rsvpQuestions.map((q, idx) => {
                          const isCollapsed = collapsedQuestionIds.has(q.id);
                          return (
                          <div key={q.id} className="p-4 border border-border rounded-lg space-y-3 bg-surface-subtle">
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => setCollapsedQuestionIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(q.id)) next.delete(q.id); else next.add(q.id);
                                  return next;
                                })}
                                className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary"
                              >
                                <ChevronDown className={`w-4 h-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                Question {idx + 1}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  rsvpDraftGuard.markDirty();
                                  setRsvpQuestions((prev) => prev.filter((item) => item.id !== q.id));
                                  setCollapsedQuestionIds((prev) => {
                                    const next = new Set(prev);
                                    next.delete(q.id);
                                    return next;
                                  });
                                }}
                                className="text-text-tertiary hover:text-text-primary"
                                aria-label="Remove question"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {!isCollapsed && (
                              <>
                            <Input
                              label="Prompt"
                              value={q.label}
                              onChange={(e) => { rsvpDraftGuard.markDirty(); setRsvpQuestions((prev) => prev.map((item) => item.id === q.id ? { ...item, label: e.target.value } : item)); }}
                              placeholder="e.g., Song request"
                            />

                            <div className="grid md:grid-cols-3 gap-3">
                              <Select
                                label="Type"
                                value={q.type}
                                onChange={(e) => { rsvpDraftGuard.markDirty(); setRsvpQuestions((prev) => prev.map((item) => {
                                  if (item.id !== q.id) return item;
                                  const nextType = e.target.value as RSVPQuestionSetting['type'];
                                  if (nextType === 'single_choice' || nextType === 'multi_choice') {
                                    const current = item.options ?? [];
                                    return { ...item, type: nextType, options: current.length > 0 ? current : ['', ''] };
                                  }
                                  return { ...item, type: nextType, options: [] };
                                })); }}
                                options={[
                                  { value: 'short_text', label: 'Short text' },
                                  { value: 'long_text', label: 'Long text' },
                                  { value: 'single_choice', label: 'Single choice' },
                                  { value: 'multi_choice', label: 'Multiple choice' },
                                ]}
                              />

                              <Select
                                label="Applies to"
                                value={q.appliesTo}
                                onChange={(e) => { rsvpDraftGuard.markDirty(); setRsvpQuestions((prev) => prev.map((item) => item.id === q.id ? { ...item, appliesTo: e.target.value as RSVPQuestionSetting['appliesTo'] } : item)); }}
                                options={[
                                  { value: 'all', label: 'All attendees' },
                                  { value: 'ceremony', label: 'Ceremony attendees' },
                                  { value: 'reception', label: 'Reception attendees' },
                                ]}
                              />

                              <label className="flex items-center gap-2 mt-7 text-sm text-text-primary">
                                <input
                                  type="checkbox"
                                  checked={q.required}
                                  onChange={(e) => { rsvpDraftGuard.markDirty(); setRsvpQuestions((prev) => prev.map((item) => item.id === q.id ? { ...item, required: e.target.checked } : item)); }}
                                  className="w-4 h-4 rounded border-border text-primary"
                                />
                                Required
                              </label>
                            </div>

                            {(q.type === 'single_choice' || q.type === 'multi_choice') && (
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-text-primary">Choices</label>
                                {(q.options ?? []).map((opt, optIdx) => (
                                  <div key={`${q.id}-opt-${optIdx}`} className="flex items-center gap-2">
                                    <Input
                                      value={opt}
                                      onChange={(e) => { rsvpDraftGuard.markDirty(); setRsvpQuestions((prev) => prev.map((item) => {
                                        if (item.id !== q.id) return item;
                                        const next = [...(item.options ?? [])];
                                        next[optIdx] = e.target.value;
                                        return { ...item, options: next };
                                      })); }}
                                      placeholder={`Option ${optIdx + 1}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => { rsvpDraftGuard.markDirty(); setRsvpQuestions((prev) => prev.map((item) => {
                                        if (item.id !== q.id) return item;
                                        const next = [...(item.options ?? [])];
                                        next.splice(optIdx, 1);
                                        return { ...item, options: next };
                                      })); }}
                                      aria-label="Remove choice"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => { rsvpDraftGuard.markDirty(); setRsvpQuestions((prev) => prev.map((item) => item.id === q.id ? { ...item, options: [...(item.options ?? []), ''] } : item)); }}
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Add choice
                                </Button>
                                <p className="text-xs text-text-tertiary">Add at least 2 options so guests can choose clearly.</p>
                              </div>
                            )}
                              </>
                            )}
                          </div>
                          );
                        })}
                      </div>

                      <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-4 space-y-3">
                        <p className="text-sm font-medium text-text-primary">Song request playlist (Spotify collaborative)</p>
                        <Input
                          label="Playlist URL"
                          value={musicPlaylistUrl}
                          onChange={(e) => setMusicPlaylistUrl(e.target.value)}
                          placeholder="https://open.spotify.com/playlist/..."
                        />
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={handleSaveMusicPlaylist}>
                            Save playlist link
                          </Button>
                          {safeMusicPlaylistUrl && (
                            <Button type="button" variant="outline" size="sm" onClick={() => window.open(safeMusicPlaylistUrl, '_blank', 'noopener,noreferrer')}>
                              Open
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-between pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => { rsvpDraftGuard.markDirty(); const q = makeQuestion(); setRsvpQuestions((prev) => [...prev, q]); setCollapsedQuestionIds((prev) => { const next = new Set(prev); next.delete(q.id); return next; }); }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Question
                        </Button>

                        <Button variant="primary" size="md" type="submit" disabled={rsvpQuestionsSaving}>
                          {rsvpQuestionsSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Save RSVP Settings
                        </Button>
                      </div>
                    </form>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === 'notifications' && (
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

            {activeTab === 'billing' && (
              <SettingsBillingPanel
                billingInfo={billingInfo}
                billingLoading={billingLoading}
                billingError={billingError}
                subscribeError={subscribeError}
                subscribeLoading={subscribeLoading}
                onSubscribe={handleSubscribe}
              />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
