import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Heart, Loader2, LogOut, ShieldCheck, UserPlus } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth, type AuthUser } from '../contexts/AuthContext';
import { readInviteTokenFromParams } from '../lib/inviteTokenParams';
import { getCollaboratorRedirectPath, getInviteSiteLabel, isInviteEmailMatch, resolveInviteValidationState } from './acceptCollaboratorInviteUtils';
import { buildCollaboratorRoleGuide } from './collaboratorRoleGuide';
import { getFlowStatusLabel } from '../lib/flowLabels';
import {
  COLLAB_INVITE_EXPIRED_ERROR,
  COLLAB_INVITE_INCOMPLETE_ERROR,
  COLLAB_INVITE_INVALID_ERROR,
  COLLAB_INVITE_REVOKED_ERROR,
  mapCollaboratorInviteAuthError,
  mapCollaboratorInviteClaimError,
  mapCollaboratorInviteLookupError,
} from './acceptCollaboratorInviteCopy';

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
  const token = readInviteTokenFromParams(searchParams);
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
  const siteLabel = useMemo(() => getInviteSiteLabel(inviteInfo), [inviteInfo]);
  const collaboratorRoleGuide = useMemo(() => buildCollaboratorRoleGuide(inviteInfo?.role), [inviteInfo?.role]);

  useEffect(() => {
    if (authMode === 'signup' && !authLoading && !claiming) {
      setAuthError(null);
    }
  }, [authMode, authLoading, claiming]);

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
      const { data: inviteRows, error } = await supabase
        .from('wedding_site_collaborator_invites')
        .select('id, wedding_site_id, invite_email, invite_name, role, status, expires_at')
        .eq('invite_token', token);

      if (cancelled) return;
      if (error) {
        setInviteInfo(null);
        setClaimError(mapCollaboratorInviteLookupError(error));
        setInviteState('invalid');
        return;
      }

      const data = Array.isArray(inviteRows) ? inviteRows[0] : null;
      if (!data) {
        setInviteInfo(null);
        setInviteState('invalid');
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

      const resolvedState = resolveInviteValidationState(nextInviteInfo);
      setInviteInfo(nextInviteInfo);
      setAuthMode((prev) => prev === 'signin' ? 'signup' : prev);
      setSignInForm((prev) => ({ ...prev, email: nextInviteInfo.invite_email }));
      setSignUpForm((prev) => ({ ...prev, email: nextInviteInfo.invite_email, fullName: prev.fullName || nextInviteInfo.invite_name || '' }));
      setInviteState(resolvedState);
    };

    void loadInvite();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const claimInvite = async (_authUser: AuthUser, currentInvite: InviteInfo) => {
    if (!currentInvite?.id || !currentInvite.wedding_site_id || !token) {
      throw new Error('Invite metadata is incomplete.');
    }
    if (!isInviteEmailMatch(_authUser.email, currentInvite.invite_email)) {
      throw new Error(`This invite was sent to ${currentInvite.invite_email}. Sign in with that email to claim access.`);
    }

    await supabase.auth.getSession();
    const { error: claimError } = await supabase.rpc('claim_collaborator_invite', {
      p_invite_token: token,
    });

    if (claimError) {
      throw new Error(`Could not claim invite: ${claimError.message}`);
    }
  };

  const finishClaim = async (authUser: AuthUser, currentInvite: InviteInfo) => {
    setClaiming(true);
    setClaimError(null);
    setClaimMessage('Claiming your collaborator access…');

    try {
      await claimInvite(authUser, currentInvite);
      setInviteState('accepted');
      setClaimMessage('Invite accepted. Redirecting to your dashboard…');
      navigate(getCollaboratorRedirectPath(currentInvite.role), { replace: true });
    } catch (err) {
      setClaimError(mapCollaboratorInviteClaimError(err));
      setClaimMessage(null);
      throw err;
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    if (!user || !inviteInfo) return;
    if (!isInviteEmailMatch(user.email, inviteInfo.invite_email)) return;

    const alreadyAccepted = inviteInfo.status === 'accepted';
    if (alreadyAccepted) {
      setInviteState('accepted');
      setClaimMessage('Invite already accepted. Redirecting to your dashboard…');
      navigate(getCollaboratorRedirectPath(inviteInfo.role), { replace: true });
    }
  }, [user, inviteInfo, navigate]);

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

      if (!inviteInfo) throw new Error('Invite metadata is incomplete.');
      await finishClaim({
        id: data.user.id,
        email: data.user.email || signInForm.email,
        name: data.user.user_metadata?.name || data.user.email || signInForm.email,
      }, inviteInfo);
    } catch (err) {
      setAuthError(mapCollaboratorInviteAuthError(err, 'Could not sign you in right now. Please try again.'));
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
          if (msg.includes('invalid login credentials')) {
            throw new Error('Account creation did not complete cleanly. Please press Create account and join team once more, or use a fresh invited email.');
          }
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

      if (!inviteInfo) throw new Error('Invite metadata is incomplete.');
      await finishClaim({
        id: signedInUser.id,
        email: signedInUser.email || signUpForm.email,
        name: signedInUser.user_metadata?.name || signUpForm.fullName.trim() || signedInUser.email || signUpForm.email,
      }, inviteInfo);
    } catch (err) {
      setAuthError(mapCollaboratorInviteAuthError(err, 'Could not create your account right now. Please try again.'));
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

  const inviteIsClaimable = !!inviteInfo && inviteState !== 'missing' && inviteState !== 'invalid' && inviteState !== 'expired' && inviteState !== 'revoked';
  const signedInWithInviteEmail = !!user && !!inviteInfo && isInviteEmailMatch(user.email, inviteInfo.invite_email);
  const signedInWithDifferentEmail = !!user && !!inviteInfo && !isInviteEmailMatch(user.email, inviteInfo.invite_email);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface-subtle to-surface p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Heart className="w-8 h-8 text-accent" aria-hidden="true" />
            <span className="text-2xl font-semibold text-text-primary">DayOf</span>
          </Link>
          <div className="rounded-full border border-border-subtle bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-text-tertiary">
            Collaborator access
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card variant="default" padding="lg" className="shadow-lg">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-text-tertiary">Invite-only access</p>
                <h1 className="mt-3 text-3xl font-bold text-text-primary">Join this wedding team</h1>
                <p className="mt-3 max-w-2xl text-text-secondary">
                  This page is only for invited collaborators like planners, coordinators, and support teammates. No payment. No demo mode. Just get into the right dashboard.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Step 1</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">Check invite</p>
                <p className="mt-2 text-sm text-text-secondary">We validate the invite link and lock to the invited email.</p>
              </div>
              <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Step 2</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">Sign in or create account</p>
                <p className="mt-2 text-sm text-text-secondary">Use the invited email to join this wedding team in a minute.</p>
              </div>
              <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Step 3</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">Get access</p>
                <p className="mt-2 text-sm text-text-secondary">We attach your access and send you straight to the dashboard.</p>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-border-subtle bg-surface-subtle/20 p-6">
              {inviteState === 'loading' && (
                <div className="flex items-center gap-3 text-text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Checking invite…</span>
                </div>
              )}

              {inviteState === 'missing' && (
                <p className="text-sm text-error">{COLLAB_INVITE_INCOMPLETE_ERROR}</p>
              )}
              {inviteState === 'invalid' && (
                <p className="text-sm text-error">{claimError || COLLAB_INVITE_INVALID_ERROR}</p>
              )}
              {inviteState === 'expired' && (
                <p className="text-sm text-error">{COLLAB_INVITE_EXPIRED_ERROR}</p>
              )}
              {inviteState === 'revoked' && (
                <p className="text-sm text-error">{COLLAB_INVITE_REVOKED_ERROR}</p>
              )}
              {inviteState === 'accepted' && (
                <p className="text-sm text-text-primary">This invite has already been claimed. If you already joined, head to your dashboard.</p>
              )}

              {inviteInfo && inviteIsClaimable && (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Wedding team</p>
                    <p className="mt-2 text-2xl font-semibold text-text-primary">{siteLabel}</p>
                    <p className="mt-2 text-sm text-text-secondary">Invited for {formatRole(inviteInfo.role)} access.</p>
                  </div>

                  <dl className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4">
                      <dt className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Invite name</dt>
                      <dd className="mt-2 text-sm font-medium text-text-primary">{inviteeLabel}</dd>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <dt className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Invited email</dt>
                      <dd className="mt-2 text-sm font-medium text-text-primary">{inviteInfo.invite_email}</dd>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <dt className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Role</dt>
                      <dd className="mt-2 text-sm font-medium text-text-primary">{formatRole(inviteInfo.role)}</dd>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <dt className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Billing</dt>
                      <dd className="mt-2 text-sm font-medium text-text-primary">No payment required</dd>
                    </div>
                  </dl>

                  <div className="grid gap-4 rounded-2xl border border-border-subtle bg-white/80 p-4 lg:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Main focus</p>
                      <p className="mt-2 text-sm font-semibold text-text-primary">{collaboratorRoleGuide.focusTitle}</p>
                      <p className="mt-2 text-sm leading-6 text-text-secondary">{collaboratorRoleGuide.focusDetail}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Best next move</p>
                      <p className="mt-2 text-sm font-semibold text-text-primary">{collaboratorRoleGuide.nextMove}</p>
                      <div className="mt-3 border-t border-border-subtle pt-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Decision rule</p>
                        <p className="mt-2 text-sm font-semibold text-text-primary">{collaboratorRoleGuide.decisionRule}</p>
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-text-tertiary">Watchout</p>
                        <p className="mt-2 text-sm font-semibold text-text-primary">{collaboratorRoleGuide.watchout}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    {collaboratorRoleGuide.sequence.map((step) => (
                      <div key={step.id} className="rounded-2xl border border-border-subtle bg-white/80 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-text-primary">{step.title}</p>
                          <span className="rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                            {getFlowStatusLabel(step.status)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-text-secondary">{step.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {claimMessage && (
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-text-primary">
                <div>{claimMessage}</div>
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
                <Button type="button" variant="accent" onClick={() => navigate(getCollaboratorRedirectPath(inviteInfo?.role))}>
                  Go to dashboard
                </Button>
              )}
              <Link to="/" className="inline-flex items-center rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-subtle">
                Back to home
              </Link>
            </div>
          </Card>

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
                  <h2 className="text-2xl font-bold text-text-primary">You’re in</h2>
                  <p className="mt-2 text-text-secondary">
                    Signed in as <span className="font-medium text-text-primary">{user.email}</span>. We’ll finish claiming the invite automatically.
                  </p>
                </div>
                <Button type="button" variant="accent" fullWidth disabled>
                  {claiming ? 'Claiming access…' : 'Redirecting…'}
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    {authMode === 'signin' ? <ShieldCheck className="h-5 w-5" aria-hidden="true" /> : <UserPlus className="h-5 w-5" aria-hidden="true" />}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Collaborator access only</p>
                    <h2 className="text-2xl font-bold text-text-primary">{authMode === 'signin' ? 'Sign in to join' : 'Create collaborator account'}</h2>
                  </div>
                </div>

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

                <div className="mb-5 rounded-2xl border border-border-subtle bg-surface-subtle/30 p-4">
                  <p className="text-sm text-text-secondary">
                    {authMode === 'signin'
                      ? 'Use the invited email and password below. We’ll attach access right away.'
                      : 'Create a lightweight collaborator account. This path skips pricing, demo mode, and owner setup.'}
                  </p>
                  {inviteIsClaimable && inviteInfo && (
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-secondary">
                      <span className="rounded-full bg-white px-3 py-1">{formatRole(inviteInfo.role)}</span>
                      <span className="rounded-full bg-white px-3 py-1">{inviteInfo.invite_email}</span>
                      <span className="rounded-full bg-white px-3 py-1">No payment</span>
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
                      label="Invited email"
                      type="email"
                      value={signInForm.email}
                      onChange={(e) => setSignInForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="planner@email.com"
                      required
                      autoComplete="email"
                      disabled={authLoading || claiming}
                    />
                    <Input
                      label="Password"
                      type="password"
                      value={signInForm.password}
                      onChange={(e) => setSignInForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      disabled={authLoading || claiming}
                    />
                    <Button type="submit" variant="accent" size="lg" fullWidth disabled={authLoading || claiming}>
                      {authLoading || claiming ? 'Signing in…' : 'Sign in and join team'}
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
                      disabled={authLoading || claiming}
                    />
                    <Input
                      label="Invited email"
                      type="email"
                      value={signUpForm.email}
                      onChange={(e) => setSignUpForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="planner@email.com"
                      required
                      autoComplete="email"
                      disabled={authLoading || claiming}
                    />
                    <Input
                      label="Create password"
                      type="password"
                      value={signUpForm.password}
                      onChange={(e) => setSignUpForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Create a password"
                      required
                      autoComplete="new-password"
                      helperText="Minimum 8 characters"
                      disabled={authLoading || claiming}
                    />
                    <Input
                      label="Confirm password"
                      type="password"
                      value={signUpForm.confirmPassword}
                      onChange={(e) => setSignUpForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Repeat your password"
                      required
                      autoComplete="new-password"
                      disabled={authLoading || claiming}
                    />
                    <Button type="submit" variant="accent" size="lg" fullWidth disabled={authLoading || claiming}>
                      {authLoading || claiming ? 'Creating account…' : 'Create account and join team'}
                    </Button>
                  </form>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AcceptCollaboratorInvite;
