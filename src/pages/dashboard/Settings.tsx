import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Select, Badge } from '../../components/ui';
import { Save, ExternalLink, CreditCard, User, Globe, Bell, Lock, Layout, Check, Sparkles, AlertCircle, Loader2, Calendar, Repeat, Eye, EyeOff, Copy, CheckCheck, Plus, Trash2, ChevronDown, LogOut, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getSiteVisibilityState, getVisibilityModeOptions } from '../../lib/siteVisibilityState';
import { getAllTemplates } from '../../templates/registry';
import { WeddingDataV1 } from '../../types/weddingData';
import { LayoutConfigV1 } from '../../types/layoutConfig';
import { regenerateLayout } from '../../lib/generateInitialLayout';
import { fromExistingLayoutToBuilderProject } from '../../builder/adapters/layoutAdapter';
import { mergeGeneratedDraftIntoBuilderProject } from '../../lib/aiBuilderProjectPatch';
import { fetchBillingInfo, createSubscriptionSession, daysUntilExpiry, type BillingInfo } from '../../lib/stripeService';
import { useAuth } from '../../hooks/useAuth';
import { PLANNER_ROLE_OPTIONS, PLANNER_PERMISSION_GROUPS, getPlannerPermissionPreset, readPlannerInvite, writePlannerInvite, type PlannerInviteRecord, type PlannerPermissionKey } from '../../lib/plannerAccess';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { useToast } from '../../components/ui/Toast';
import { formatSettingsDate } from './settingsDate';
import { SETTINGS_SITE_SELECT } from './settingsSiteSelect';


interface RSVPQuestionSetting {
  id: string;
  label: string;
  type: 'short_text' | 'long_text' | 'single_choice' | 'multi_choice';
  required: boolean;
  appliesTo: 'all' | 'ceremony' | 'reception';
  options?: string[];
}

const makeQuestion = (): RSVPQuestionSetting => ({
  id: `q_${Math.random().toString(36).slice(2, 10)}`,
  label: '',
  type: 'short_text',
  required: false,
  appliesTo: 'all',
  options: [],
});

const LOCAL_RSVP_QUESTIONS_KEY = 'dayof_demo_rsvp_custom_questions_v1';
const LOCAL_RSVP_MEAL_KEY = 'dayof_demo_rsvp_meal_config_v1';

export const DashboardSettings: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isDemoMode, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'team' | 'site' | 'rsvp' | 'notifications' | 'billing'>('account');

  const [coupleNames, setCoupleNames] = useState('');
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

  const [defaultLanguage, setDefaultLanguage] = useState<'en' | 'es'>('en');
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
  const [collaboratorInvites, setCollaboratorInvites] = useState<Array<{ id: string; invite_email: string; invite_name: string | null; role: string; status: string; invited_at: string; expires_at?: string | null; permissions?: PlannerPermissionKey[] }>>([]);
  const [revealedInviteLinks, setRevealedInviteLinks] = useState<Record<string, string>>({});
  const [creatingCollaboratorInvite, setCreatingCollaboratorInvite] = useState(false);
  const [plannerInvitePermissions, setPlannerInvitePermissions] = useState<PlannerPermissionKey[]>(getPlannerPermissionPreset('planner'));
  const [revokingCollaboratorInviteId, setRevokingCollaboratorInviteId] = useState<string | null>(null);
  const [rsvpMealOptions, setRsvpMealOptions] = useState<string[]>(['Chicken','Beef','Fish','Vegetarian','Vegan']);
  const [privacyCopied, setPrivacyCopied] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [visibilitySuccess, setVisibilitySuccess] = useState<string | null>(null);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);

  const [notifRsvp, setNotifRsvp] = useState(true);
  const [notifPhotos, setNotifPhotos] = useState(true);
  const [notifDigest, setNotifDigest] = useState(false);
  const [notifUpdates, setNotifUpdates] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState<string | null>(null);
  const [notifError, setNotifError] = useState<string | null>(null);

  const [currentTemplate, setCurrentTemplate] = useState<string>('base');
  const [changingTemplate, setChangingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSuccess, setTemplateSuccess] = useState<string | null>(null);

  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  const privacySummary = privacyMode === 'invite_only'
    ? 'Invite only'
    : privacyMode === 'password_protected'
      ? 'Password protected'
      : 'Public';
  const visibilityState = getSiteVisibilityState({ isPublished, privacyMode });

  useEffect(() => {
    loadSiteData();
  }, [user, isDemoMode]);

  useEffect(() => {
    if (activeTab === 'billing' && user && !billingInfo) {
      setBillingLoading(true);
      fetchBillingInfo(user.id)
        .then(info => setBillingInfo(info))
        .catch(err => setBillingError(err.message))
        .finally(() => setBillingLoading(false));
    }
  }, [activeTab, user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const loadCollaboratorInvites = async (siteId: string) => {
    const { data: inviteRows, error: inviteLoadError } = await supabase
      .from('wedding_site_collaborator_invites')
      .select('id, invite_email, invite_name, role, status, invited_at, expires_at, permissions')
      .eq('wedding_site_id', siteId)
      .order('invited_at', { ascending: false });
    if (inviteLoadError) throw inviteLoadError;
    setCollaboratorInvites((inviteRows as Array<{ id: string; invite_email: string; invite_name: string | null; role: string; status: string; invited_at: string; expires_at?: string | null; permissions?: PlannerPermissionKey[] }> | null) ?? []);
    setRevealedInviteLinks({});
  };

  const loadSiteData = async () => {
    if (!user) {
      setWeddingSiteId(null);
      setCoupleNames('');
      setAccountEmail('');
      setSiteSlug('');
      setGuestAccessToken(null);
      setIsPublished(false);
      setCollaboratorInvites([]);
      return;
    }

    if (isDemoMode) {
      try {
        const raw = localStorage.getItem(LOCAL_RSVP_QUESTIONS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map((q) => q as Partial<RSVPQuestionSetting>)
            .filter((q) => typeof q?.id === 'string' && typeof q?.label === 'string')
            .map((q) => ({
              id: q.id as string,
              label: (q.label as string) || '',
              type: (q.type as RSVPQuestionSetting['type']) || 'short_text',
              required: !!q.required,
              appliesTo: (q.appliesTo as RSVPQuestionSetting['appliesTo']) || 'all',
              options: Array.isArray(q.options) ? q.options.filter((x) => typeof x === 'string') as string[] : [],
            }));
          setRsvpQuestions(normalized);
        }

        const rawMeal = localStorage.getItem(LOCAL_RSVP_MEAL_KEY);
        const parsedMeal = rawMeal ? JSON.parse(rawMeal) : null;
        if (parsedMeal && typeof parsedMeal === 'object') {
          setRsvpMealEnabled(typeof parsedMeal.enabled === 'boolean' ? parsedMeal.enabled : true);
          setRsvpMealOptions(Array.isArray(parsedMeal.options) ? parsedMeal.options.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0) : ['Chicken','Beef','Fish','Vegetarian','Vegan']);
        }
      } catch {
        // ignore local parse issues
      }
    }

    try {
      const { data: queryData, error: siteLoadError } = await supabase
        .from('wedding_sites')
        .select(SETTINGS_SITE_SELECT)
        .eq('id', (await resolveActiveSiteForUser(user.id))?.id ?? '')
        .maybeSingle();
      if (siteLoadError) throw siteLoadError;

      const data = (queryData as Record<string, unknown> | null) ?? null;

      if (data) {
        setWeddingSiteId((data.id as string) ?? null);
        const name1 = (data.couple_name_1 as string) ?? '';
        const name2 = (data.couple_name_2 as string) ?? '';
        setCoupleNames(name1 && name2 ? `${name1} & ${name2}` : name1 || name2 || '');
        setAccountEmail(user.email ?? '');
        setCurrentTemplate((data.active_template_id as string) || 'base');
        setSiteSlug((data.site_slug as string) ?? '');
        setMusicPlaylistUrl((data.music_playlist_url as string) ?? '');
        setPrivacyMode((data.privacy_mode as 'public' | 'password_protected' | 'invite_only') ?? 'public');
        setHideFromSearch(!!(data.hide_from_search as boolean | null | undefined));
        setGuestAccessToken((data.guest_access_token as string | null) ?? null);
        setIsPublished((data.is_published as boolean | null | undefined) === true);
        setDefaultLanguage(((data.default_language as string) === 'es' ? 'es' : 'en'));
        const prefs = data.notification_prefs as Record<string, boolean> | null;
        if (prefs) {
          setNotifRsvp(prefs.rsvp ?? true);
          setNotifPhotos(prefs.photos ?? true);
          setNotifDigest(prefs.digest ?? false);
          setNotifUpdates(prefs.updates ?? false);
        }

        const loadedQuestions = Array.isArray((data as { rsvp_custom_questions?: unknown }).rsvp_custom_questions)
          ? ((data as { rsvp_custom_questions?: unknown[] }).rsvp_custom_questions || [])
          : [];

        const normalized = loadedQuestions
          .map((q) => q as Partial<RSVPQuestionSetting>)
          .filter((q) => typeof q?.id === 'string' && typeof q?.label === 'string')
          .map((q) => ({
            id: q.id as string,
            label: (q.label as string) || '',
            type: (q.type as RSVPQuestionSetting['type']) || 'short_text',
            required: !!q.required,
            appliesTo: (q.appliesTo as RSVPQuestionSetting['appliesTo']) || 'all',
            options: Array.isArray(q.options) ? q.options.filter((x) => typeof x === 'string') as string[] : [],
          }));
        setRsvpQuestions(normalized);

        const mealCfg = (data as { rsvp_meal_config?: unknown }).rsvp_meal_config as { enabled?: boolean; options?: unknown[] } | undefined;
        setRsvpMealEnabled(mealCfg?.enabled ?? true);
        setRsvpMealOptions(Array.isArray(mealCfg?.options) ? mealCfg!.options.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : ['Chicken','Beef','Fish','Vegetarian','Vegan']);

        if ((data.id as string | undefined)) {
          await loadCollaboratorInvites(data.id as string);
        }

      } else {
        setWeddingSiteId(null);
        setAccountEmail(user.email ?? '');
        setSiteSlug('');
        setGuestAccessToken(null);
        setIsPublished(false);
        setCollaboratorInvites([]);
      }
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'Could not load settings right now.');
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weddingSiteId) return;
    setAccountSaving(true);
    setAccountError(null);
    setAccountSuccess(null);
    try {
      const parts = coupleNames.split('&').map(s => s.trim()).filter(Boolean);
      const name1 = parts[0] ?? coupleNames.trim();
      const name2 = parts[1] ?? '';
      const { error } = await supabase
        .from('wedding_sites')
        .update({ couple_name_1: name1, couple_name_2: name2 })
        .eq('id', weddingSiteId);
      if (error) throw error;
      setAccountSuccess('Account information saved.');
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'Failed to save changes.');
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
      if (!email) throw new Error('Unable to verify current user email.');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) throw new Error('Current password is incorrect.');

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password.');
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
    };

    try {
      writePlannerInvite(siteSlug || user?.id || null, invite);
      setPlannerInvite(invite);
      setPlannerInviteSuccess(plannerInvite ? 'Planner access updated.' : 'Planner invite saved.');
    } catch (err) {
      setPlannerInviteError(err instanceof Error ? err.message : 'Failed to save planner invite.');
    }
  };

  const handleCreateCollaboratorInvite = async () => {
    setPlannerInviteError(null);
    setPlannerInviteSuccess(null);
    const name = plannerInviteName.trim();
    const email = plannerInviteEmail.trim().toLowerCase();

    if (!weddingSiteId) {
      setPlannerInviteError('Missing wedding site context.');
      return;
    }
    if (!user?.id) {
      setPlannerInviteError('Missing owner context.');
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
      const { data, error } = await supabase.rpc('settings_collaborator_invite_write', {
        p_wedding_site_id: weddingSiteId,
        p_payload: {
          invite_email: email,
          invite_name: name,
          role: plannerInviteRole,
          status: 'pending',
          invite_token: inviteToken,
          invited_by: user.id,
          permissions: plannerInvitePermissions,
        },
      });
      if (error) throw error;

      await loadCollaboratorInvites(weddingSiteId);
      setPlannerInviteSuccess('Collaborator invite created in the database.');
    } catch (err) {
      setPlannerInviteError(err instanceof Error ? err.message : 'Failed to create collaborator invite.');
    } finally {
      setCreatingCollaboratorInvite(false);
    }
  };

  const handleRevokeCollaboratorInvite = async (inviteId: string) => {
    setPlannerInviteError(null);
    setPlannerInviteSuccess(null);
    setRevokingCollaboratorInviteId(inviteId);
    try {
      const { error } = await supabase.rpc('settings_collaborator_invite_revoke', {
        p_invite_id: inviteId,
        p_revoked_at: new Date().toISOString(),
      });

      if (error) throw error;

      if (weddingSiteId) {
        await loadCollaboratorInvites(weddingSiteId);
      }
      setPlannerInviteSuccess('Collaborator invite revoked.');
    } catch (err) {
      setPlannerInviteError(err instanceof Error ? err.message : 'Failed to revoke collaborator invite.');
    } finally {
      setRevokingCollaboratorInviteId(null);
    }
  };

  const handleCopyCollaboratorInviteLink = async (inviteId: string) => {
    try {
      const { data: inviteToken, error } = await supabase.rpc('settings_collaborator_invite_token_read', {
        p_invite_id: inviteId,
      });
      if (error) throw error;
      if (!inviteToken) throw new Error('This invite link is not ready yet.');
      const inviteUrl = `${window.location.origin}/accept-collaborator-invite?token=${String(inviteToken)}`;
      await navigator.clipboard.writeText(inviteUrl);
      setPlannerInviteSuccess('Invite link copied.');
      setPlannerInviteError(null);
    } catch (err) {
      setPlannerInviteError(err instanceof Error ? err.message : 'Failed to copy collaborator invite.');
    }
  };

  const handleResendCollaboratorInvite = async (inviteId: string) => {
    await handleCopyCollaboratorInviteLink(inviteId);
    setPlannerInviteSuccess('Invite link copied again for resend.');
  };

  const handleRevealCollaboratorInviteLink = async (inviteId: string) => {
    try {
      const { data: inviteToken, error } = await supabase.rpc('settings_collaborator_invite_token_read', {
        p_invite_id: inviteId,
      });
      if (error) throw error;
      if (!inviteToken) throw new Error('This invite link is not ready yet.');
      const inviteUrl = `${window.location.origin}/accept-collaborator-invite?token=${String(inviteToken)}`;
      setRevealedInviteLinks((current) => ({ ...current, [inviteId]: inviteUrl }));
    } catch (err) {
      setPlannerInviteError(err instanceof Error ? err.message : 'Failed to reveal collaborator invite.');
    }
  };

  const handleClearCollaboratorInviteTestFixtures = async () => {
    if (!weddingSiteId) return;
    setPlannerInviteError(null);
    setPlannerInviteSuccess(null);
    try {
      const { data, error } = await supabase.rpc('settings_collaborator_invite_clear_test_fixtures', {
        p_wedding_site_id: weddingSiteId,
      });
      if (error) throw error;
      await loadCollaboratorInvites(weddingSiteId);
      const deletedCount = Number(data ?? 0);
      setPlannerInviteSuccess(
        deletedCount > 0
          ? `Cleared ${deletedCount} test invite${deletedCount === 1 ? '' : 's'}.`
          : 'No test invites found to clear.',
      );
    } catch (err) {
      setPlannerInviteError(err instanceof Error ? err.message : 'Failed to clear test invites.');
    }
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
      setPlannerInviteError(err instanceof Error ? err.message : 'Failed to remove planner invite.');
    }
  };

  const handleUpdateSlug = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlugSaving(true);
    setSlugError(null);
    setSlugSuccess(null);
    try {
      const raw = siteSlug.trim().toLowerCase();
      const fromUrl = raw.includes('/') ? raw.split('/').filter(Boolean).pop() || '' : raw;
      const cleaned = fromUrl.replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-').replace(/^-|-$/g, '');
      if (!cleaned) { setSlugError('URL cannot be empty.'); setSlugSaving(false); return; }

      let targetSiteId = weddingSiteId;
      if (!targetSiteId && user?.id) {
        const { data: fallbackSite, error: fallbackSiteError } = await supabase
          .from('wedding_sites')
          .select('id')
          .eq('id', (await resolveActiveSiteForUser(user.id))?.id ?? '')
          .maybeSingle();
        if (fallbackSiteError) throw fallbackSiteError;
        targetSiteId = (fallbackSite?.id as string | null) ?? null;
        if (targetSiteId) setWeddingSiteId(targetSiteId);
      }
      if (!targetSiteId) {
        setSlugError('Could not find your website right now. Refresh and try again.');
        setSlugSaving(false);
        return;
      }

      const { data: existing, error: existingError } = await supabase
        .from('wedding_sites')
        .select('id')
        .eq('site_slug', cleaned)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing && existing.id !== targetSiteId) {
        setSlugError('That URL is already taken. Please choose another.');
        setSlugSaving(false);
        return;
      }
      const { error } = await supabase
        .from('wedding_sites')
        .update({ site_slug: cleaned })
        .eq('id', targetSiteId);
      if (error) throw error;
      setSiteSlug(cleaned);
      setSlugSuccess(`Site URL updated to /${cleaned}`);
    } catch (err) {
      setSlugError(err instanceof Error ? err.message : 'Failed to update URL.');
    } finally {
      setSlugSaving(false);
    }
  };

  const handleSavePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weddingSiteId) return;
    setVisibilitySaving(true);
    setVisibilityError(null);
    setVisibilitySuccess(null);
    let nextGuestAccessToken: string | null = null;
    try {
      const updates: Record<string, unknown> = {
        privacy_mode: privacyMode,
        hide_from_search: hideFromSearch,
        default_language: defaultLanguage,
      };

      if (privacyMode === 'password_protected' && sitePassword) {
        const { data: hashData, error: hashErr } = await supabase.rpc('hash_site_password', {
          p_password: sitePassword,
        });
        if (hashErr) throw hashErr;
        updates.site_password_hash = hashData as string;
      }

      if (privacyMode === 'invite_only' && !guestAccessToken) {
        const { data: tokenData, error: tokenErr } = await supabase.rpc('generate_secure_token', { byte_length: 32 });
        if (tokenErr) throw tokenErr;
        updates.guest_access_token = tokenData as string;
        nextGuestAccessToken = tokenData as string;
      }

      const { error } = await supabase
        .from('wedding_sites')
        .update(updates)
        .eq('id', weddingSiteId);
      if (error) throw error;
      if (nextGuestAccessToken) setGuestAccessToken(nextGuestAccessToken);
      setSitePassword('');
      setVisibilitySuccess('Privacy settings saved.');
    } catch (err) {
      setVisibilityError(err instanceof Error ? err.message : 'Failed to save privacy settings.');
    } finally {
      setVisibilitySaving(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!weddingSiteId) return;
    try {
      const { data, error } = await supabase.rpc('generate_secure_token', { byte_length: 32 });
      if (error) throw error;
      const { error: updateError } = await supabase
        .from('wedding_sites')
        .update({ guest_access_token: data as string })
        .eq('id', weddingSiteId);
      if (updateError) throw updateError;
      setGuestAccessToken(data as string);
      toast('Guest access token regenerated.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not regenerate guest access token.', 'error');
    }
  };

  const copyInviteLink = async () => {
    if (!guestAccessToken || !siteSlug) return;
    const url = `${window.location.origin}/site/${siteSlug}?token=${guestAccessToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setPrivacyCopied(true);
      setTimeout(() => setPrivacyCopied(false), 2000);
    } catch {
      window.prompt('Copy guest access link:', url);
      toast('Guest access link ready to copy.', 'success');
    }
  };

  const publicSiteUrl = siteSlug ? `https://${siteSlug}.dayof.love` : '';
  const plannerRoleOptions = PLANNER_ROLE_OPTIONS.filter((option) => option.value !== 'owner');

  const togglePlannerPermission = (key: PlannerPermissionKey) => {
    setPlannerInvitePermissions((prev) => prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]);
  };
  const publicSiteQrUrl = publicSiteUrl && import.meta.env.VITE_ENABLE_THIRD_PARTY_QR === 'true'
    ? `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(publicSiteUrl)}`
    : '';

  const handleDefaultLanguageChange = async (next: 'en' | 'es') => {
    const previous = defaultLanguage;
    setDefaultLanguage(next);
    setVisibilityError(null);
    setVisibilitySuccess(null);
    if (!weddingSiteId) return;
    try {
      const { error } = await supabase
        .from('wedding_sites')
        .update({ default_language: next })
        .eq('id', weddingSiteId);
      if (error) throw error;
      setVisibilitySuccess(`Default language set to ${next === 'es' ? 'Español' : 'English'}.`);
    } catch (err) {
      setDefaultLanguage(previous);
      setVisibilityError(err instanceof Error ? err.message : 'Failed to save default language.');
    }
  };

  const handleSaveMusicPlaylist = async () => {
    if (!weddingSiteId) return;
    setVisibilityError(null);
    setVisibilitySuccess(null);
    try {
      const value = musicPlaylistUrl.trim();
      const { error } = await supabase
        .from('wedding_sites')
        .update({ music_playlist_url: value || null })
        .eq('id', weddingSiteId);
      if (error) throw error;
      setVisibilitySuccess('Song request playlist link saved.');
    } catch (err) {
      setVisibilityError(err instanceof Error ? err.message : 'Failed to save playlist link.');
    }
  };

  const handleSaveRsvpQuestions = async (e: React.FormEvent) => {
    e.preventDefault();

    setRsvpQuestionsSaving(true);
    setRsvpQuestionsSuccess(null);
    setRsvpQuestionsError(null);

    try {
      const cleaned = rsvpQuestions
        .map((q) => ({
          ...q,
          label: q.label.trim(),
          options: (q.type === 'single_choice' || q.type === 'multi_choice')
            ? (q.options ?? []).map((o) => o.trim()).filter(Boolean)
            : [],
        }))
        .filter((q) => q.label.length > 0);

      const missingOptions = cleaned.find((q) => (q.type === 'single_choice' || q.type === 'multi_choice') && (q.options?.length ?? 0) < 2);
      if (missingOptions) {
        setRsvpQuestionsError(`Choice question "${missingOptions.label}" needs at least 2 options.`);
        return;
      }

      const mealOptions = rsvpMealOptions.map((o) => o.trim()).filter(Boolean);
      if (rsvpMealEnabled && mealOptions.length < 2) {
        setRsvpQuestionsError('Meal choices need at least 2 options when enabled.');
        return;
      }

      if (!weddingSiteId) {
        if (isDemoMode) {
          localStorage.setItem(LOCAL_RSVP_QUESTIONS_KEY, JSON.stringify(cleaned));
          localStorage.setItem(LOCAL_RSVP_MEAL_KEY, JSON.stringify({ enabled: rsvpMealEnabled, options: mealOptions }));
          setRsvpQuestions(cleaned);
          setRsvpQuestionsSuccess('RSVP settings saved (demo).');
          return;
        }

        setRsvpQuestionsError('Could not find your website record right now. Refresh and try again.');
        return;
      }

      const { error } = await supabase
        .from('wedding_sites')
        .update({ rsvp_custom_questions: cleaned, rsvp_meal_config: { enabled: rsvpMealEnabled, options: mealOptions } })
        .eq('id', weddingSiteId);

      if (error) throw error;
      setRsvpQuestions(cleaned);
      setRsvpQuestionsSuccess('RSVP settings saved.');
    } catch (err) {
      setRsvpQuestionsError(err instanceof Error ? err.message : 'Failed to save RSVP custom questions.');
    } finally {
      setRsvpQuestionsSaving(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weddingSiteId) return;
    setNotifSaving(true);
    setNotifError(null);
    setNotifSuccess(null);
    try {
      const { error } = await supabase
        .from('wedding_sites')
        .update({ notification_prefs: { rsvp: notifRsvp, photos: notifPhotos, digest: notifDigest, updates: notifUpdates } })
        .eq('id', weddingSiteId);
      if (error) throw error;
      setNotifSuccess('Preferences saved.');
    } catch (err) {
      setNotifError(err instanceof Error ? err.message : 'Failed to save preferences.');
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
      window.location.href = url;
    } catch (err) {
      setSubscribeError(err instanceof Error ? err.message : 'Could not start checkout right now.');
      setSubscribeLoading(false);
    }
  };

  const handleTemplateChange = async (newTemplateId: string) => {
    if (!weddingSiteId) return;
    setChangingTemplate(true);
    setTemplateError(null);
    setTemplateSuccess(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('wedding_sites')
        .select('wedding_data, layout_config, site_json')
        .eq('id', weddingSiteId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Wedding site not found');

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

      const { error: updateError } = await supabase
        .from('wedding_sites')
        .update({ active_template_id: newTemplateId, layout_config: newLayout, site_json: remappedSiteJson })
        .eq('id', weddingSiteId);

      if (updateError) throw updateError;
      setCurrentTemplate(newTemplateId);
      setTemplateSuccess('Template changed successfully. Your content has been preserved.');
    } catch (err: unknown) {
      setTemplateError((err as Error).message || 'Failed to change template');
    } finally {
      setChangingTemplate(false);
    }
  };

  const tabs = [
    { id: 'account' as const, label: 'Account', icon: User },
    { id: 'team' as const, label: 'Team Access', icon: Users },
    { id: 'site' as const, label: 'Site Settings', icon: Globe },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'billing' as const, label: 'Billing', icon: CreditCard },
  ];

  return (
    <DashboardLayout currentPage="settings">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Settings</h1>
          <p className="text-text-secondary">Manage your account and wedding site preferences</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-tertiary">
            <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">
              Status: {visibilityState.label}
            </span>
            <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">
              Privacy preset: {privacySummary}{isPublished ? '' : ' (applies when live)'}
            </span>
            <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">
              Search: {hideFromSearch ? 'Hidden' : 'Visible'}
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <nav className="md:w-48 flex-shrink-0" aria-label="Settings navigation">
            <div className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors
                      ${activeTab === tab.id
                        ? 'bg-primary-light text-primary font-medium'
                        : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="flex-1 space-y-6">
            {activeTab === 'account' && (
              <>
                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>Update your account details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveAccount} className="space-y-4">
                      {accountSuccess && (
                        <div className="p-3 bg-success-light border border-success/20 rounded-lg text-success text-sm">{accountSuccess}</div>
                      )}
                      {accountError && (
                        <div className="p-3 bg-error-light border border-error/20 rounded-lg text-error text-sm">{accountError}</div>
                      )}
                      <Input
                        label="Partner names"
                        value={coupleNames}
                        onChange={e => setCoupleNames(e.target.value)}
                        placeholder="e.g. Alex & Jordan"
                        helperText="Separate names with &"
                      />
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
                        <p className="text-sm text-text-secondary px-3 py-2 bg-surface-subtle border border-border rounded-lg">{accountEmail}</p>
                        <p className="text-xs text-text-tertiary mt-1">Contact support to change your email address.</p>
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button variant="primary" size="md" type="submit" disabled={accountSaving}>
                          {accountSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <CardTitle>Password</CardTitle>
                    <CardDescription>Change your password</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                      {passwordSuccess && (
                        <div className="p-3 bg-success-light border border-success/20 rounded-lg text-success text-sm">{passwordSuccess}</div>
                      )}
                      {passwordError && (
                        <div className="p-3 bg-error-light border border-error/20 rounded-lg text-error text-sm">{passwordError}</div>
                      )}
                      <div className="relative">
                        <Input
                          label="Current password"
                          type={showCurrentPw ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPw(v => !v)}
                          className="absolute right-3 top-8 text-text-tertiary hover:text-text-primary"
                          aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
                        >
                          {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          label="New password"
                          type={showNewPw ? 'text' : 'password'}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          helperText="Minimum 8 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(v => !v)}
                          className="absolute right-3 top-8 text-text-tertiary hover:text-text-primary"
                          aria-label={showNewPw ? 'Hide password' : 'Show password'}
                        >
                          {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          label="Confirm new password"
                          type={showConfirmPw ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPw(v => !v)}
                          className="absolute right-3 top-8 text-text-tertiary hover:text-text-primary"
                          aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button variant="primary" size="md" type="submit" disabled={passwordSaving}>
                          {passwordSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                          Update Password
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <CardTitle>Session</CardTitle>
                    <CardDescription>Log out of your account on this device</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-end">
                    <Button variant="outline" size="md" onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Log out
                    </Button>
                  </CardContent>
                </Card>
              </>
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
                        <CardDescription>Set up planner or coordinator access from the couple side, with calm boundaries around what they can help manage. Full collaborator persistence is still being tightened.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-4 space-y-2">
                      <p className="text-sm font-medium text-text-primary">Invite your planner, not a generic staff account</p>
                      <p className="text-sm text-text-secondary">Keep ownership with the couple while sharing the parts of DayOf that help someone run the event well. Treat this as access setup, not a fully finished multi-admin system yet.</p>
                    </div>

                    {plannerInviteSuccess && (
                      <div className="rounded-xl border border-success/20 bg-success-light p-3 text-sm text-success">{plannerInviteSuccess}</div>
                    )}
                    {plannerInviteError && (
                      <div className="rounded-xl border border-error/20 bg-error-light p-3 text-sm text-error">{plannerInviteError}</div>
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
                          className={`rounded-xl border p-4 text-left transition-colors ${plannerInviteRole === option.value ? 'border-primary bg-primary/5' : 'border-border-subtle bg-white hover:border-primary/35'}`}
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

                    <div className="rounded-xl border border-dashed border-border bg-surface-subtle/20 p-4 space-y-3">
                      <div>
                        <p className="text-sm font-medium text-text-primary">Permissions</p>
                        <p className="mt-1 text-sm text-text-secondary">Start with a role preset, then tighten or expand access simply before you send the invite.</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {PLANNER_PERMISSION_GROUPS.map((permission) => {
                          const checked = plannerInvitePermissions.includes(permission.key);
                          return (
                            <label key={permission.key} className={`rounded-xl border p-3 cursor-pointer transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border-subtle bg-white hover:border-primary/30'}`}>
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
                      <div className="rounded-xl border border-border-subtle bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-text-primary">Access setup saved for {plannerInvite.name}</p>
                            <p className="mt-1 text-xs text-text-secondary">{plannerInvite.email} · {plannerRoleOptions.find((option) => option.value === plannerInvite.role)?.label} · {plannerInvite.status === 'active' ? 'Active' : 'Pending'}</p>
                          </div>
                          <Badge variant={plannerInvite.status === 'active' ? 'success' : 'secondary'}>{plannerInvite.status === 'active' ? 'Active' : 'Pending'}</Badge>
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 p-4 space-y-3">
                      <div>
                        <p className="text-sm font-medium text-text-primary">Collaborator list</p>
                        <p className="mt-1 text-xs text-text-secondary">This is the current lightweight view of who has access configured. Real multi-user collaborator persistence is still the next layer.</p>
                      </div>

                      {plannerInvite ? (
                        <div className="rounded-xl border border-border-subtle bg-white px-4 py-3">
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
                        <div className="rounded-xl border border-dashed border-border-subtle bg-white px-4 py-3 text-sm text-text-secondary">
                          No collaborator access setups saved yet.
                        </div>
                      )}

                      {collaboratorInvites.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">DB-backed invites</p>
                          {collaboratorInvites.map((invite) => (
                            <div key={invite.id} className="rounded-xl border border-border-subtle bg-white px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-text-primary">{invite.invite_name || invite.invite_email}</p>
                                  <p className="mt-1 text-xs text-text-secondary">{invite.invite_email} · {invite.role} · {formatSettingsDate(invite.invited_at)}{invite.expires_at ? ` · expires ${formatSettingsDate(invite.expires_at)}` : ''}</p>
                                  {invite.permissions && invite.permissions.length > 0 && <p className="mt-1 text-[11px] text-text-tertiary">{invite.permissions.join(' · ')}</p>}
                                  <p className="mt-1 text-[11px] text-text-tertiary">
                                    Invite URL: {revealedInviteLinks[invite.id] ? revealedInviteLinks[invite.id] : '/accept-collaborator-invite?token=••••••••••'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={invite.status === 'accepted' ? 'success' : invite.status === 'pending' ? 'secondary' : 'warning'}>{invite.status}</Badge>
                                  {invite.status === 'pending' && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => { void handleCopyCollaboratorInviteLink(invite.id); }}>
                                      Copy link
                                    </Button>
                                  )}
                                  {invite.status === 'pending' && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => { void handleResendCollaboratorInvite(invite.id); }}>
                                      Resend
                                    </Button>
                                  )}
                                  {invite.status === 'pending' && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        if (revealedInviteLinks[invite.id]) {
                                          setRevealedInviteLinks((current) => {
                                            const next = { ...current };
                                            delete next[invite.id];
                                            return next;
                                          });
                                          return;
                                        }
                                        void handleRevealCollaboratorInviteLink(invite.id);
                                      }}
                                    >
                                      {revealedInviteLinks[invite.id] ? 'Hide link' : 'Reveal link'}
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
                      <Button type="button" variant="outline" size="sm" onClick={() => { void handleClearCollaboratorInviteTestFixtures(); }}>
                        Clear test invites
                      </Button>
                      {plannerInvite && (
                        <Button type="button" variant="outline" size="sm" onClick={handleRemovePlannerInvite}>Remove invite</Button>
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={handleCreateCollaboratorInvite} disabled={creatingCollaboratorInvite}>
                        {creatingCollaboratorInvite ? 'Creating DB invite…' : 'Create DB invite'}
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
                        <div className="p-3 bg-error-light border border-error/20 rounded-lg text-error text-sm">{slugError}</div>
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
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => publicSiteQrUrl ? window.open(publicSiteQrUrl, '_blank') : undefined}
                                disabled={!publicSiteQrUrl}
                              >
                                Open QR
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  if (!publicSiteQrUrl) return;
                                  try {
                                    await navigator.clipboard.writeText(publicSiteQrUrl);
                                    setSlugSuccess('QR image link copied.');
                                    setSlugError(null);
                                  } catch {
                                    window.prompt('Copy QR image link:', publicSiteQrUrl);
                                    setSlugSuccess('QR image link ready to copy.');
                                    setSlugError(null);
                                  }
                                }}
                              >
                                Copy QR link
                              </Button>
                              {!publicSiteQrUrl && (
                                <p className="text-xs text-text-tertiary">Third-party QR is disabled by default.</p>
                              )}
                            </div>
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
                      <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-4 text-sm text-text-secondary">
                        Hidden by default to keep things simple. Open it when you want to choose who can see your site.
                      </div>
                    ) : (
                    <form onSubmit={handleSavePrivacy} className="space-y-5">
                      {visibilitySuccess && (
                        <div className="p-3 bg-success-light border border-success/20 rounded-lg text-success text-sm">{visibilitySuccess}</div>
                      )}
                      {visibilityError && (
                        <div className="p-3 bg-error-light border border-error/20 rounded-lg text-error text-sm">{visibilityError}</div>
                      )}

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-primary">Default site language</label>
                        <p className="text-xs text-text-secondary">Sets the default language for your public wedding site and RSVP page.</p>
                        <div className="flex gap-3">
                          {([
                            { value: 'en', label: 'English' },
                            { value: 'es', label: 'Español' },
                          ] as const).map(opt => (
                            <label
                              key={opt.value}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-colors ${
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
                      </div>

                      <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-4 space-y-2">
                        <p className="text-sm font-medium text-text-primary">Visibility states</p>
                        <ul className="space-y-1 text-xs text-text-secondary">
                          <li>• <span className="font-medium text-text-primary">Draft</span> means only you can see the site while editing.</li>
                          <li>• <span className="font-medium text-text-primary">Protected live access</span> lets you limit who can open the guest-facing site once it is live.</li>
                          <li>• <span className="font-medium text-text-primary">Guest-facing launch</span> makes the site live at your DayOf URL.</li>
                        </ul>
                      </div>

                      <div className="space-y-3">
                        {getVisibilityModeOptions().map(opt => (
                          <label
                            key={opt.value}
                            className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-colors ${
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
                              onChange={() => setPrivacyMode(opt.value)}
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
                        <div className="p-4 bg-surface-subtle border border-border rounded-xl space-y-3">
                          <p className="text-sm font-medium text-text-primary">Site password</p>
                          <p className="text-xs text-text-secondary">Guests will be prompted to enter this before viewing the site.</p>
                          <div className="relative">
                            <input
                              type={showSitePassword ? 'text' : 'password'}
                              value={sitePassword}
                              onChange={e => setSitePassword(e.target.value)}
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
                        <div className="p-4 bg-surface-subtle border border-border rounded-xl space-y-3">
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
                          onChange={e => setHideFromSearch(e.target.checked)}
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
                      <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-4 text-sm text-text-secondary">
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
                          <div className="p-3 bg-error-light border border-error rounded-lg text-error text-sm">
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
                      <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-4 text-sm text-text-secondary">
                        Hidden by default to keep RSVP setup lighter. Open this section only if you want guests to choose a meal.
                      </div>
                    ) : (
                      <>
                        <label className="flex items-center gap-2 text-sm text-text-primary">
                          <input type="checkbox" checked={rsvpMealEnabled} onChange={(e) => setRsvpMealEnabled(e.target.checked)} className="w-4 h-4 rounded border-border text-primary" />
                          Collect meal choice on RSVP form
                        </label>
                        {rsvpMealEnabled && (
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-text-primary">Meal options</label>
                            {rsvpMealOptions.map((opt, idx) => (
                              <div key={`meal-opt-${idx}`} className="flex items-center gap-2">
                                <Input value={opt} onChange={(e) => setRsvpMealOptions((prev) => { const n=[...prev]; n[idx]=e.target.value; return n; })} placeholder={`Meal option ${idx+1}`} />
                                <Button type="button" variant="ghost" size="sm" onClick={() => setRsvpMealOptions((prev) => prev.filter((_, i) => i !== idx))}><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => setRsvpMealOptions((prev) => [...prev, ''])}><Plus className="w-4 h-4 mr-1" />Add meal option</Button>
                          </div>
                        )}
                      </>
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
                      <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-4 text-sm text-text-secondary">
                        Hidden by default to keep RSVP setup simple. Open this section if you want to ask extra questions or let guests share song requests.
                      </div>
                    ) : (
                    <form onSubmit={handleSaveRsvpQuestions} className="space-y-4">
                      {rsvpQuestionsSuccess && (
                        <div className="p-3 bg-success-light border border-success/20 rounded-lg text-success text-sm">{rsvpQuestionsSuccess}</div>
                      )}
                      {rsvpQuestionsError && (
                        <div className="p-3 bg-error-light border border-error/20 rounded-lg text-error text-sm">{rsvpQuestionsError}</div>
                      )}

                      <div className="space-y-3">
                        {rsvpQuestions.length === 0 && (
                          <p className="text-sm text-text-secondary">No custom questions yet. Add one below if you need something beyond the standard RSVP flow.</p>
                        )}

                        {rsvpQuestions.map((q, idx) => {
                          const isCollapsed = collapsedQuestionIds.has(q.id);
                          return (
                          <div key={q.id} className="p-4 border border-border rounded-xl space-y-3 bg-surface-subtle">
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
                                  setRsvpQuestions((prev) => prev.filter((item) => item.id !== q.id));
                                  setCollapsedQuestionIds((prev) => {
                                    const next = new Set(prev);
                                    next.delete(q.id);
                                    return next;
                                  });
                                }}
                                className="text-error hover:text-error/80"
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
                              onChange={(e) => setRsvpQuestions((prev) => prev.map((item) => item.id === q.id ? { ...item, label: e.target.value } : item))}
                              placeholder="e.g., Song request"
                            />

                            <div className="grid md:grid-cols-3 gap-3">
                              <Select
                                label="Type"
                                value={q.type}
                                onChange={(e) => setRsvpQuestions((prev) => prev.map((item) => {
                                  if (item.id !== q.id) return item;
                                  const nextType = e.target.value as RSVPQuestionSetting['type'];
                                  if (nextType === 'single_choice' || nextType === 'multi_choice') {
                                    const current = item.options ?? [];
                                    return { ...item, type: nextType, options: current.length > 0 ? current : ['', ''] };
                                  }
                                  return { ...item, type: nextType, options: [] };
                                }))}
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
                                onChange={(e) => setRsvpQuestions((prev) => prev.map((item) => item.id === q.id ? { ...item, appliesTo: e.target.value as RSVPQuestionSetting['appliesTo'] } : item))}
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
                                  onChange={(e) => setRsvpQuestions((prev) => prev.map((item) => item.id === q.id ? { ...item, required: e.target.checked } : item))}
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
                                      onChange={(e) => setRsvpQuestions((prev) => prev.map((item) => {
                                        if (item.id !== q.id) return item;
                                        const next = [...(item.options ?? [])];
                                        next[optIdx] = e.target.value;
                                        return { ...item, options: next };
                                      }))}
                                      placeholder={`Option ${optIdx + 1}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setRsvpQuestions((prev) => prev.map((item) => {
                                        if (item.id !== q.id) return item;
                                        const next = [...(item.options ?? [])];
                                        next.splice(optIdx, 1);
                                        return { ...item, options: next };
                                      }))}
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
                                  onClick={() => setRsvpQuestions((prev) => prev.map((item) => item.id === q.id ? { ...item, options: [...(item.options ?? []), ''] } : item))}
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

                      <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-4 space-y-3">
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
                          {musicPlaylistUrl && (
                            <Button type="button" variant="outline" size="sm" onClick={() => window.open(musicPlaylistUrl, '_blank')}>
                              Open
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-between pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => { const q = makeQuestion(); setRsvpQuestions((prev) => [...prev, q]); setCollapsedQuestionIds((prev) => { const next = new Set(prev); next.delete(q.id); return next; }); }}
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
              <Card variant="bordered" padding="lg">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>Email Notifications</CardTitle>
                      <CardDescription>Choose what updates you want to receive</CardDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowNotificationSettings((v) => !v)}>
                      {showNotificationSettings ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!showNotificationSettings ? (
                    <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-4 text-sm text-text-secondary">
                      Hidden by default to keep this page easy to scan. Open it when you want to choose which updates you get.
                    </div>
                  ) : (
                  <form onSubmit={handleSaveNotifications} className="space-y-4">
                    {notifSuccess && (
                      <div className="p-3 bg-success-light border border-success/20 rounded-lg text-success text-sm">{notifSuccess}</div>
                    )}
                    {notifError && (
                      <div className="p-3 bg-error-light border border-error/20 rounded-lg text-error text-sm">{notifError}</div>
                    )}
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifRsvp}
                        onChange={e => setNotifRsvp(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-text-primary">New RSVPs</p>
                        <p className="text-sm text-text-secondary">Get notified when guests respond</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPhotos}
                        onChange={e => setNotifPhotos(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-text-primary">Photo uploads</p>
                        <p className="text-sm text-text-secondary">Get notified when guests upload photos</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifDigest}
                        onChange={e => setNotifDigest(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-text-primary">Weekly digest</p>
                        <p className="text-sm text-text-secondary">Summary of activity on your site</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifUpdates}
                        onChange={e => setNotifUpdates(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-text-primary">Product updates</p>
                        <p className="text-sm text-text-secondary">New features and improvements</p>
                      </div>
                    </label>

                    <div className="flex justify-end pt-2">
                      <Button variant="primary" size="md" type="submit" disabled={notifSaving}>
                        {notifSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Preferences
                      </Button>
                    </div>
                  </form>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'billing' && (
              <>
                {billingLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
                  </div>
                )}

                {billingError && (
                  <div className="flex items-start gap-2 p-4 bg-error-light border border-error/20 rounded-lg text-error text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{billingError}</span>
                  </div>
                )}

                {!billingLoading && billingInfo && (
                  <>
                    <Card variant="bordered" padding="lg">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Site Access</CardTitle>
                            <CardDescription>Your current plan and access period</CardDescription>
                          </div>
                          <Badge variant={billingInfo.billing_type === 'recurring' ? 'success' : 'primary'}>
                            {billingInfo.billing_type === 'recurring' ? 'Annual Plan' : '2-Year Access'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {billingInfo.billing_type === 'one_time' ? (
                          <>
                            <div className="flex items-start gap-4 p-4 bg-surface-subtle rounded-xl border border-border">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Calendar className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-text-primary">One-time purchase — 2 years access</p>
                                {billingInfo.site_expires_at && (() => {
                                  const days = daysUntilExpiry(billingInfo.site_expires_at);
                                  const expDate = formatSettingsDate(billingInfo.site_expires_at, { year: 'numeric', month: 'long', day: 'numeric' });
                                  const isExpiringSoon = days !== null && days <= 90;
                                  return (
                                    <p className={`text-sm mt-0.5 ${isExpiringSoon ? 'text-warning font-medium' : 'text-text-secondary'}`}>
                                      {isExpiringSoon && days !== null && days > 0
                                        ? `Expires in ${days} days — ${expDate}`
                                        : days !== null && days <= 0
                                          ? 'Site access has expired'
                                          : `Active until ${expDate}`}
                                    </p>
                                  );
                                })()}
                              </div>
                            </div>

                            <div className="border border-border rounded-xl overflow-hidden">
                              <div className="px-5 py-4 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border">
                                <div className="flex items-center gap-2 mb-1">
                                  <Repeat className="w-4 h-4 text-accent" />
                                  <p className="font-semibold text-text-primary">Switch to Annual Billing</p>
                                </div>
                                <p className="text-sm text-text-secondary">Never worry about renewals — your site stays live as long as you're subscribed.</p>
                              </div>
                              <div className="px-5 py-4 space-y-3">
                                <div className="space-y-2">
                                  {['Automatic annual renewal', 'Site stays live indefinitely', 'Cancel anytime', 'Same price as a 1-year renewal'].map(f => (
                                    <p key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                                      <Check className="w-4 h-4 text-success flex-shrink-0" />
                                      {f}
                                    </p>
                                  ))}
                                </div>

                                {subscribeError && (
                                  <div className="flex items-start gap-2 p-3 bg-error-light border border-error/20 rounded-lg text-error text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <span>{subscribeError}</span>
                                  </div>
                                )}

                                <Button
                                  variant="accent"
                                  size="md"
                                  onClick={handleSubscribe}
                                  disabled={subscribeLoading}
                                >
                                  {subscribeLoading ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Redirecting...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-4 h-4 mr-2" />
                                      Switch to Annual Billing
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-start gap-4 p-4 bg-surface-subtle rounded-xl border border-border">
                            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                              <Repeat className="w-5 h-5 text-success" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-text-primary">Annual subscription — site stays live</p>
                              <p className="text-sm text-text-secondary mt-0.5">Your site renews automatically each year. Cancel anytime from your Stripe customer portal.</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {billingInfo.paid_at && (
                      <Card variant="bordered" padding="lg">
                        <CardHeader>
                          <CardTitle>Billing History</CardTitle>
                          <CardDescription>Your payment records</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                            <div>
                              <p className="font-medium text-text-primary">
                                {billingInfo.billing_type === 'recurring' ? 'Annual Plan' : 'DayOf.Love — 2-Year Access'}
                              </p>
                              <p className="text-sm text-text-secondary">
                                {formatSettingsDate(billingInfo.paid_at, { year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="success">Paid</Badge>
                              <span className="font-semibold text-text-primary">$49.00</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
