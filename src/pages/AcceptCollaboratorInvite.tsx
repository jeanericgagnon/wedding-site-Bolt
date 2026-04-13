import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams, createSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Heart, Loader2, LogOut } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth, type AuthUser } from '../contexts/AuthContext';
import { getCollaboratorRedirectPath, isInviteEmailMatch, resolveInviteValidationState } from './acceptCollaboratorInviteUtils';

type InviteState = 'loading' | 'valid' | 'invalid' | 'expired' | 'accepted' | 'revoked' | 'missing';
type AuthMode = 'signin' | 'signup';

type InviteInfo = {
  id: string;
  wedding_site_id: string;
  invite_email: string;
  invite_name: string | null;
  role: string;
  status: string;
  expires_at?: string | null;
  site_slug?: string | null;
  couple_name_1?: string | null;
  couple_name_2?: string | null;
};

const initialSignInForm = {
  email: '',
  password: '',
};

const initialSignUpForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const formatRole = (role: string) => role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export const AcceptCollaboratorInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { user, signOut } = useAuth();

  const [inviteState, setInviteState] = useState<InviteState>('loading');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signInForm, setSignInForm] = useState(initialSignInForm);
  const [signUpForm, setSignUpForm] = useState(initialSignUpForm);

  const inviteeLabel = useMemo(() => inviteInfo?.invite_name || inviteInfo?.invite_email || 'your collaborator', [inviteInfo]);
  const siteLabel = useMemo(() => {
    if (!inviteInfo) return 'this wedding site';
    const names = [inviteInfo.couple_name_1, inviteInfo.couple_name_2].filter(Boolean).join(' & ');
    if (names) return `${names}' wedding site`;
    if (inviteInfo.site_slug) return `${inviteInfo.site_slug}.dayof.love`;
    return 'this wedding site';
  }, [inviteInfo]);

  const authHandoffSearch = useMemo(() => {
    if (!inviteInfo || !token) return '';

    return `?${createSearchParams({
      inviteToken: token,
      inviteEmail: inviteInfo.invite_email,
      inviteRole: inviteInfo.role,
      inviteSite: siteLabel,
    }).toString()}`;
  }, [inviteInfo, token, siteLabel]);

  useEffect(() => {
    let cancelled = false;

    const loadInvite = async () => {
      if (!token) {
        if (!cancelled) setInviteState('missing');
        return;
      }

      setInviteState('loading');
      setClaimError(null);
      setClaimMessage(null);

      const { data, error } = await supabase
        .from('wedding_site_collaborator_invites')
        .select('id, wedding_site_id, invite_email, invite_name, role, status, expires_at')
        .eq('invite_token', token)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setInviteInfo(null);
        setInviteState('invalid');
        return;
      }

      const resolvedState = resolveInviteValidationState(data);
      if (resolvedState !== 'valid') {
        setInviteInfo(null);
        setInviteState(resolvedState);
        return;
      }

      let siteDetails: Pick<InviteInfo, 'site_slug' | 'couple_name_1' | 'couple_name_2'> = {};
      if (data.wedding_site_id) {
        const { data: siteData } = await supabase
          .from('wedding_sites')
          .select('site_slug, couple_name_1, couple_name_2')
          .eq('id', data.wedding_site_id)
          .maybeSingle();

        if (!cancelled && siteData) {
          siteDetails = {
            site_slug: siteData.site_slug,
            couple_name_1: siteData.couple_name_1,
            couple_name_2: siteData.couple_name_2,
          };
        }
      }

      if (cancelled) return;

      const nextInviteInfo = {
        ...(data as InviteInfo),
        ...siteDetails,
      };

      setInviteInfo(nextInviteInfo);
      setInviteState('valid');
      setSignInForm((prev) => ({ ...prev, email: nextInviteInfo.invite_email }));
      setSignUpForm((prev) => ({ ...prev, email: nextInviteInfo.invite_email, fullName: prev.fullName || nextInviteInfo.invite_name || '' }));
    };

    void loadInvite();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const claimInvite = async (authUser: AuthUser) => {
    if (!inviteInfo?.id || !inviteInfo.wedding_site_id) {
      throw new Error('Invite metadata is incomplete.');
    }
    if (!isInviteEmailMatch(authUser.email, inviteInfo.invite_email)) {
      throw new Error(`This invite was sent to ${inviteInfo.invite_email}. Sign in with that email to claim access.`);
    }

    const { error: collaboratorError } = await supabase
      .from('wedding_site_collaborators')
      .upsert({
        wedding_site_id: inviteInfo.wedding_site_id,
        user_id: authUser.id,
        role: inviteInfo.role,
      }, { onConflict: 'wedding_site_id,user_id' });

    if (collaboratorError) throw collaboratorError;

    const { error: inviteError } = await supabase
      .from('wedding_site_collaborator_invites')
      .update({ status: 'accepted', accepted_user_id: authUser.id, accepted_at: new Date().toISOString() })
      .eq('id', inviteInfo.id);

    if (inviteError) throw inviteError;
  };

  const finishClaim = async (authUser: AuthUser) => {
    setClaiming(true);
    setClaimError(null);
    setClaimMessage('Claiming your collaborator access…');

    try {
      await claimInvite(authUser);
      setInviteState('accepted');
      setClaimMessage('Invite accepted. Redirecting to your dashboard…');
      navigate(getCollaboratorRedirectPath(), { replace: true });
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Could not claim invite.');
      setClaimMessage(null);
      throw err;
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    if (!user || inviteState !== 'valid' || !inviteInfo) return;
    if (!isInviteEmailMatch(user.email, inviteInfo.invite_email)) return;
    if (claiming) return;

    void finishClaim(user).catch(() => undefined);
  }, [user, inviteState, inviteInfo, claiming]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setClaimError(null);
    setClaimMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInForm.email,
        password: signInForm.password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Signed in, but your user session was not ready. Please try again.');

      await finishClaim({
        id: data.user.id,
        email: data.user.email || signInForm.email,
        name: data.user.user_metadata?.name || data.user.email || signInForm.email,
      });
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Could not sign you in right now.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setClaimError(null);
    setClaimMessage(null);

    if (signUpForm.password.length < 8) {
      setAuthError('Use a password with at least 8 characters.');
      setAuthLoading(false);
      return;
    }

    if (signUpForm.password !== signUpForm.confirmPassword) {
      setAuthError('Passwords do not match.');
      setAuthLoading(false);
      return;
    }

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: signUpForm.email,
        password: signUpForm.password,
        options: {
          data: {
            name: signUpForm.fullName.trim(),
            full_name: signUpForm.fullName.trim(),
          },
        },
      });

      if (signUpError) throw signUpError;

      let signedInUser = authData.user;
      if (!authData.session) {
        const signInRes = await supabase.auth.signInWithPassword({
          email: signUpForm.email,
          password: signUpForm.password,
        });

        if (signInRes.error) {
          const msg = signInRes.error.message.toLowerCase();
          if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
            throw new Error(`Account created for ${signUpForm.email}. Check your email to confirm your address, then come back to this invite link to finish joining.`);
          }
          throw signInRes.error;
        }

        signedInUser = signInRes.data.user;
      }

      if (!signedInUser) {
        throw new Error('Account created. Please sign in from this page to finish accepting the invite.');
      }

      await finishClaim({
        id: signedInUser.id,
        email: signedInUser.email || signUpForm.email,
        name: signedInUser.user_metadata?.name || signUpForm.fullName.trim() || signedInUser.email || signUpForm.email,
      });
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Could not create your account right now.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    setClaimError(null);
    setClaimMessage(null);
    setAuthError(null);
    await signOut();
  };

  const inviteIsClaimable = inviteState === 'valid' && !!inviteInfo;
  const signedInWithInviteEmail = !!user && !!inviteInfo && isInviteEmailMatch(user.email, inviteInfo.invite_email);
  const signedInWithDifferentEmail = !!user && !!inviteInfo && !isInviteEmailMatch(user.email, inviteInfo.invite_email);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-surface-subtle to-surface p-4">
      <div className="w-full max-w-5xl grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="text-center lg:text-left">
            <Link to="/" className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
              <Heart className="w-8 h-8 text-accent" aria-hidden="true" />
              <span className="text-2xl font-semibold text-text-primary">WeddingSite</span>
            </Link>
            <p className="text-xs uppercase tracking-[0.24em] text-text-tertiary">DayOf collaborator invite</p>
            <h1 className="mt-3 text-3xl font-bold text-text-primary">Join as a collaborator</h1>
            <p className="mt-3 text-text-secondary">
              Accept your invite, get into the right wedding dashboard, and skip the owner payment flow.
            </p>
          </div>

          <Card variant="default" padding="lg" className="shadow-lg">
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-full bg-primary/10 p-2 text-primary">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text-primary">Invite details</h2>
                <p className="mt-1 text-sm text-text-secondary">We’ll validate the token first, then connect the invited email to the wedding site.</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border-subtle bg-surface-subtle/20 p-5">
              {inviteState === 'loading' && (
                <div className="flex items-center gap-3 text-text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Checking invite…</span>
                </div>
              )}

              {inviteState === 'missing' && (
                <p className="text-sm text-error">This invite link is incomplete. Ask the owner to send the full invite URL again.</p>
              )}
              {inviteState === 'invalid' && (
                <p className="text-sm text-error">This invite could not be found. Double-check the link or ask for a fresh invite.</p>
              )}
              {inviteState === 'expired' && (
                <p className="text-sm text-error">This invite has expired. Ask the owner for a fresh invite link.</p>
              )}
              {inviteState === 'revoked' && (
                <p className="text-sm text-error">This invite is no longer active.</p>
              )}
              {inviteState === 'accepted' && (
                <p className="text-sm text-text-primary">This invite has already been claimed. If you already joined, head to your dashboard.</p>
              )}

              {inviteInfo && inviteIsClaimable && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-text-secondary">You were invited to collaborate on</p>
                    <p className="mt-1 text-lg font-semibold text-text-primary">{siteLabel}</p>
                  </div>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Invited name</dt>
                      <dd className="mt-1 text-sm font-medium text-text-primary">{inviteeLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Email</dt>
                      <dd className="mt-1 text-sm font-medium text-text-primary">{inviteInfo.invite_email}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Role</dt>
                      <dd className="mt-1 text-sm font-medium text-text-primary">{formatRole(inviteInfo.role)}</dd>
                    </div>
                    {inviteInfo.expires_at && (
                      <div>
                        <dt className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Expires</dt>
                        <dd className="mt-1 text-sm font-medium text-text-primary">{new Date(inviteInfo.expires_at).toLocaleDateString()}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>

            {claimMessage && (
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-text-primary">
                {claimMessage}
              </div>
            )}

            {claimError && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-error/20 bg-error-light px-4 py-3 text-sm text-error">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>{claimError}</span>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {inviteState === 'accepted' && (
                <Button type="button" variant="accent" onClick={() => navigate(getCollaboratorRedirectPath())}>
                  Go to dashboard
                </Button>
              )}
              <Link to="/" className="inline-flex items-center rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-subtle">
                Back to home
              </Link>
            </div>
          </Card>
        </div>

        <Card variant="default" padding="lg" className="shadow-lg h-fit">
          {signedInWithDifferentEmail && user && inviteInfo ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Wrong account signed in</h2>
                <p className="mt-2 text-text-secondary">
                  You’re signed in as <span className="font-medium text-text-primary">{user.email}</span>, but this invite is for <span className="font-medium text-text-primary">{inviteInfo.invite_email}</span>.
                </p>
              </div>
              <Button type="button" variant="outline" fullWidth onClick={() => { void handleSwitchAccount(); }}>
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out and use the invited email
              </Button>
            </div>
          ) : signedInWithInviteEmail && user ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-text-primary">You’re good</h2>
                <p className="mt-2 text-text-secondary">
                  Signed in as <span className="font-medium text-text-primary">{user.email}</span>. We’ll finish claiming the invite automatically.
                </p>
              </div>
              <Button type="button" variant="accent" fullWidth disabled>
                {claiming ? 'Claiming access…' : 'Access ready'}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex rounded-xl bg-surface-subtle p-1 mb-6">
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setAuthError(null); }}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${authMode === 'signin' ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${authMode === 'signup' ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Create account
                </button>
              </div>

              <div className="mb-5 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary">{authMode === 'signin' ? 'Sign in to accept' : 'Create your collaborator account'}</h2>
                  <p className="mt-2 text-text-secondary">
                    {authMode === 'signin'
                      ? 'Use the invited email and we’ll attach this invite immediately.'
                      : 'Create a lightweight collaborator account. No owner billing step on this path.'}
                  </p>
                </div>

                {inviteIsClaimable && inviteInfo && (
                  <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">You’re joining</p>
                    <p className="mt-2 text-base font-semibold text-text-primary">{siteLabel}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
                      <span className="rounded-full bg-white px-3 py-1">{formatRole(inviteInfo.role)}</span>
                      <span className="rounded-full bg-white px-3 py-1">{inviteInfo.invite_email}</span>
                    </div>
                  </div>
                )}
              </div>

              {authError && (
                <div className="mb-5 flex items-start gap-2 rounded-lg border border-error/20 bg-error-light px-4 py-3 text-sm text-error">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>{authError}</span>
                </div>
              )}

              {authMode === 'signin' ? (
                <form onSubmit={handleEmailSignIn} className="space-y-5">
                  <Input
                    label="Email"
                    type="email"
                    value={signInForm.email}
                    onChange={(e) => setSignInForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="planner@email.com"
                    required
                    autoComplete="email"
                    disabled={!inviteIsClaimable || authLoading || claiming}
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={signInForm.password}
                    onChange={(e) => setSignInForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    disabled={!inviteIsClaimable || authLoading || claiming}
                  />
                  <Button type="submit" variant="accent" size="lg" fullWidth disabled={!inviteIsClaimable || authLoading || claiming}>
                    {authLoading || claiming ? 'Signing in…' : 'Sign in and accept invite'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleEmailSignUp} className="space-y-5">
                  <Input
                    label="Full name"
                    type="text"
                    value={signUpForm.fullName}
                    onChange={(e) => setSignUpForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Your name"
                    required
                    autoComplete="name"
                    disabled={!inviteIsClaimable || authLoading || claiming}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={signUpForm.email}
                    onChange={(e) => setSignUpForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="planner@email.com"
                    required
                    autoComplete="email"
                    disabled={!inviteIsClaimable || authLoading || claiming}
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={signUpForm.password}
                    onChange={(e) => setSignUpForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Create a password"
                    required
                    autoComplete="new-password"
                    helperText="Minimum 8 characters"
                    disabled={!inviteIsClaimable || authLoading || claiming}
                  />
                  <Input
                    label="Confirm password"
                    type="password"
                    value={signUpForm.confirmPassword}
                    onChange={(e) => setSignUpForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Repeat your password"
                    required
                    autoComplete="new-password"
                    disabled={!inviteIsClaimable || authLoading || claiming}
                  />
                  <Button type="submit" variant="accent" size="lg" fullWidth disabled={!inviteIsClaimable || authLoading || claiming}>
                    {authLoading || claiming ? 'Creating account…' : 'Create account and accept invite'}
                  </Button>
                </form>
              )}

              <div className="mt-6 space-y-3 text-center text-sm text-text-secondary">
                <p>Need the regular auth pages instead?</p>
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                  <Link to={`/login${authHandoffSearch}`} className="font-medium text-primary hover:text-primary-hover transition-colors">
                    Open sign in
                  </Link>
                  <span className="hidden text-text-tertiary sm:inline">•</span>
                  <Link to={`/signup${authHandoffSearch}`} className="font-medium text-primary hover:text-primary-hover transition-colors">
                    Open create account
                  </Link>
                </div>
                <p className="text-xs text-text-tertiary">We’ll carry your invite details with you so you can come right back and finish.</p>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AcceptCollaboratorInvite;
