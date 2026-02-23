import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Select, Badge, Textarea } from '../../components/ui';
import { Save, ExternalLink, CreditCard, User, Globe, Bell, Lock, Layout, Check, Sparkles, AlertCircle, Loader2, Calendar, Repeat, Eye, EyeOff, Copy, CheckCheck, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getAllTemplates } from '../../templates/registry';
import { WeddingDataV1 } from '../../types/weddingData';
import { LayoutConfigV1 } from '../../types/layoutConfig';
import { regenerateLayout } from '../../lib/generateInitialLayout';
import { fetchBillingInfo, createSubscriptionSession, daysUntilExpiry, type BillingInfo } from '../../lib/stripeService';
import { useAuth } from '../../hooks/useAuth';


interface RSVPQuestionSetting {
  id: string;
  label: string;
  type: 'short_text' | 'long_text' | 'single_choice';
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

export const DashboardSettings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'site' | 'notifications' | 'billing'>('account');

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
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [siteSlug, setSiteSlug] = useState('');
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
  const [privacyCopied, setPrivacyCopied] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [visibilitySuccess, setVisibilitySuccess] = useState<string | null>(null);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);

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

  useEffect(() => {
    loadSiteData();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'billing' && user && !billingInfo) {
      setBillingLoading(true);
      fetchBillingInfo(user.id)
        .then(info => setBillingInfo(info))
        .catch(err => setBillingError(err.message))
        .finally(() => setBillingLoading(false));
    }
  }, [activeTab, user]);

  const loadSiteData = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('wedding_sites')
        .select('id, couple_name_1, couple_name_2, active_template_id, site_slug, site_visibility, notification_prefs, privacy_mode, hide_from_search, guest_access_token, default_language, rsvp_custom_questions')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setWeddingSiteId(data.id);
        const name1 = data.couple_name_1 ?? '';
        const name2 = data.couple_name_2 ?? '';
        setCoupleNames(name1 && name2 ? `${name1} & ${name2}` : name1 || name2 || '');
        setAccountEmail(user.email ?? '');
        setCurrentTemplate(data.active_template_id || 'base');
        setSiteSlug(data.site_slug ?? '');
        setPrivacyMode((data.privacy_mode as 'public' | 'password_protected' | 'invite_only') ?? 'public');
        setHideFromSearch(!!(data.hide_from_search));
        setGuestAccessToken((data.guest_access_token as string | null) ?? null);
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

      } else {
        setAccountEmail(user.email ?? '');
      }
    } catch {
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
    if (!newPassword) { setPasswordError('New password is required.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }
    if (newPassword.length < 8) { setPasswordError('Password must be at least 8 characters.'); return; }
    setPasswordSaving(true);
    try {
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

  const handleUpdateSlug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weddingSiteId) return;
    setSlugSaving(true);
    setSlugError(null);
    setSlugSuccess(null);
    try {
      const cleaned = siteSlug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-').replace(/^-|-$/g, '');
      if (!cleaned) { setSlugError('URL cannot be empty.'); setSlugSaving(false); return; }
      const { data: existing } = await supabase
        .from('wedding_sites')
        .select('id')
        .eq('site_slug', cleaned)
        .maybeSingle();
      if (existing && existing.id !== weddingSiteId) {
        setSlugError('That URL is already taken. Please choose another.');
        setSlugSaving(false);
        return;
      }
      const { error } = await supabase
        .from('wedding_sites')
        .update({ site_slug: cleaned })
        .eq('id', weddingSiteId);
      if (error) throw error;
      setSiteSlug(cleaned);
      setSlugSuccess('Site URL updated.');
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
        setGuestAccessToken(tokenData as string);
      }

      const { error } = await supabase
        .from('wedding_sites')
        .update(updates)
        .eq('id', weddingSiteId);
      if (error) throw error;
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
      await supabase.from('wedding_sites').update({ guest_access_token: data as string }).eq('id', weddingSiteId);
      setGuestAccessToken(data as string);
    } catch {
    }
  };

  const copyInviteLink = async () => {
    if (!guestAccessToken || !siteSlug) return;
    const url = `${window.location.origin}/site/${siteSlug}?token=${guestAccessToken}`;
    await navigator.clipboard.writeText(url);
    setPrivacyCopied(true);
    setTimeout(() => setPrivacyCopied(false), 2000);
  };


  const handleSaveRsvpQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weddingSiteId) return;

    setRsvpQuestionsSaving(true);
    setRsvpQuestionsSuccess(null);
    setRsvpQuestionsError(null);

    try {
      const cleaned = rsvpQuestions
        .map((q) => ({
          ...q,
          label: q.label.trim(),
          options: q.type === 'single_choice' ? (q.options ?? []).map((o) => o.trim()).filter(Boolean) : [],
        }))
        .filter((q) => q.label.length > 0);

      const missingOptions = cleaned.find((q) => q.type === 'single_choice' && (q.options?.length ?? 0) < 2);
      if (missingOptions) {
        setRsvpQuestionsError(`Single-choice question "${missingOptions.label}" needs at least 2 options.`);
        return;
      }

      const { error } = await supabase
        .from('wedding_sites')
        .update({ rsvp_custom_questions: cleaned })
        .eq('id', weddingSiteId);

      if (error) throw error;
      setRsvpQuestions(cleaned);
      setRsvpQuestionsSuccess('RSVP custom questions saved.');
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
      setSubscribeError(err instanceof Error ? err.message : 'Could not start subscription checkout.');
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
        .select('wedding_data, layout_config')
        .eq('id', weddingSiteId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Wedding site not found');

      const weddingData = data.wedding_data as WeddingDataV1;
      const currentLayout = data.layout_config as LayoutConfigV1;
      const newLayout = regenerateLayout(newTemplateId, weddingData, currentLayout);

      const { error: updateError } = await supabase
        .from('wedding_sites')
        .update({ active_template_id: newTemplateId, layout_config: newLayout })
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
                          type={showCurrentPw ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
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
                      <div className="flex justify-end pt-2">
                        <Button variant="primary" size="md" type="submit" disabled={passwordSaving}>
                          {passwordSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                          Update Password
                        </Button>
                      </div>
                    </form>
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
                          <p className="text-sm text-text-secondary mt-2">
                            Your site is accessible at{' '}
                            <a
                              href={`https://${siteSlug}.dayof.love`}
                              className="text-primary hover:text-primary-hover"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {siteSlug}.dayof.love
                              <ExternalLink className="inline w-3 h-3 ml-1" aria-hidden="true" />
                            </a>
                          </p>
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
                    <CardTitle>Custom Domain</CardTitle>
                    <CardDescription>Use your own domain name</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Badge variant="primary">Coming Soon</Badge>
                    <p className="text-sm text-text-secondary">
                      Custom domain support is in development. You will be able to connect your own domain once it launches.
                    </p>
                  </CardContent>
                </Card>

                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <CardTitle>RSVP Custom Questions</CardTitle>
                    <CardDescription>Add optional questions to collect extra details from guests</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveRsvpQuestions} className="space-y-4">
                      {rsvpQuestionsSuccess && (
                        <div className="p-3 bg-success-light border border-success/20 rounded-lg text-success text-sm">{rsvpQuestionsSuccess}</div>
                      )}
                      {rsvpQuestionsError && (
                        <div className="p-3 bg-error-light border border-error/20 rounded-lg text-error text-sm">{rsvpQuestionsError}</div>
                      )}

                      <div className="space-y-3">
                        {rsvpQuestions.length === 0 && (
                          <p className="text-sm text-text-secondary">No custom questions yet. Add one below.</p>
                        )}

                        {rsvpQuestions.map((q, idx) => (
                          <div key={q.id} className="p-4 border border-border rounded-xl space-y-3 bg-surface-subtle">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-text-primary">Question {idx + 1}</p>
                              <button
                                type="button"
                                onClick={() => setRsvpQuestions((prev) => prev.filter((item) => item.id !== q.id))}
                                className="text-error hover:text-error/80"
                                aria-label="Remove question"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

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
                                onChange={(e) => setRsvpQuestions((prev) => prev.map((item) => item.id === q.id ? { ...item, type: e.target.value as RSVPQuestionSetting['type'] } : item))}
                                options={[
                                  { value: 'short_text', label: 'Short text' },
                                  { value: 'long_text', label: 'Long text' },
                                  { value: 'single_choice', label: 'Single choice' },
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

                            {q.type === 'single_choice' && (
                              <Textarea
                                label="Choices (one per line)"
                                rows={3}
                                value={(q.options ?? []).join('\n')}
                                onChange={(e) => setRsvpQuestions((prev) => prev.map((item) => item.id === q.id ? { ...item, options: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) } : item))}
                                placeholder={'Chicken\\nBeef\\nVegetarian'}
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2 justify-between pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setRsvpQuestions((prev) => [...prev, makeQuestion()])}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Question
                        </Button>

                        <Button variant="primary" size="md" type="submit" disabled={rsvpQuestionsSaving}>
                          {rsvpQuestionsSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Save RSVP Questions
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <CardTitle>Privacy Settings</CardTitle>
                    <CardDescription>Control who can view your site</CardDescription>
                  </CardHeader>
                  <CardContent>
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
                                onChange={() => setDefaultLanguage(opt.value)}
                                className="text-primary focus:ring-primary"
                              />
                              <span className="text-sm font-medium text-text-primary">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {(
                          [
                            { value: 'public', label: 'Public', desc: 'Anyone with the link can view your site' },
                            { value: 'password_protected', label: 'Password protected', desc: 'Visitors must enter a password to view' },
                            { value: 'invite_only', label: 'Invite-only', desc: 'Only guests with your private link can view' },
                          ] as const
                        ).map(opt => (
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
                              <p className="text-xs text-text-secondary mt-0.5">{opt.desc}</p>
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
                          <p className="text-sm font-medium text-text-primary">Private site link</p>
                          <p className="text-xs text-text-secondary">Share this link with guests. Anyone without it will see a blocked page.</p>
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
                              Regenerate link (old link stops working)
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
                          <p className="text-xs text-text-secondary">Adds a noindex tag so your site won't appear in Google results.</p>
                        </div>
                      </label>

                      <div className="flex justify-end pt-2">
                        <Button variant="primary" size="md" type="submit" disabled={visibilitySaving}>
                          {visibilitySaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Save Privacy Settings
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layout className="w-5 h-5" />
                      Template
                    </CardTitle>
                    <CardDescription>Change your wedding site template while preserving your content</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                        Choose Template
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
                                <Badge variant="primary" className="ml-2">Active</Badge>
                              )}
                            </h3>
                            <p className="text-sm text-text-secondary">
                              {template.description}
                            </p>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-text-secondary mt-3">
                        Your wedding information will be preserved when switching templates.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === 'notifications' && (
              <Card variant="bordered" padding="lg">
                <CardHeader>
                  <CardTitle>Email Notifications</CardTitle>
                  <CardDescription>Choose what updates you want to receive</CardDescription>
                </CardHeader>
                <CardContent>
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
                                  const expDate = new Date(billingInfo.site_expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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
                                {new Date(billingInfo.paid_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
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
