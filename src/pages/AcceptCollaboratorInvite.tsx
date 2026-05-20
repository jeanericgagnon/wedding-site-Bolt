import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Heart, Loader2, LogOut, ShieldCheck, UserPlus } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { useAuth, type AuthUser } from '../contexts/AuthContext';
import { getCollaboratorRedirectPath, getInviteSiteLabel, isInviteEmailMatch, resolveInviteValidationState } from './acceptCollaboratorInviteUtils';
import {
  claimCollaboratorInviteByToken,
  createCollaboratorInviteAccount,
  fetchCollaboratorInviteInfo,
  hasCollaboratorInviteSession,
  signInCollaboratorInviteAccount,
  type CollaboratorInviteInfo,
} from './acceptCollaboratorInviteService';
import { logAppAction } from '../lib/actionAudit';
import { safeAuthError, safeCollaboratorInviteError } from '../lib/authErrorCopy';

type InviteState = 'loading' | 'valid' | 'invalid' | 'expired' | 'accepted' | 'revoked' | 'missing';
type AuthMode = 'signin' | 'signup';

type InviteInfo = CollaboratorInviteInfo;

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
  const showInviteDebug = import.meta.env.DEV && searchParams.get('inviteDebug') === '1';
  const { user, signOut } = useAuth();

  const [inviteState, setInviteState] = useState<InviteState>('loading');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimStep, setClaimStep] = useState<string | null>(null);
  const [claimTrace, setClaimTrace] = useState<string[]>([]);
  const claimAttemptKeyRef = useRef<string | null>(null);
  const claimRunRef = useRef(0);
  const authRunRef = useRef(0);
  const activeInviteTokenRef = useRef<string | null>(token);
  const [inviteLookupDebug, setInviteLookupDebug] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signInForm, setSignInForm] = useState(initialSignInForm);
  const [signUpForm, setSignUpForm] = useState(initialSignUpForm);

  const inviteeLabel = useMemo(() => inviteInfo?.invite_name || inviteInfo?.invite_email || 'your collaborator', [inviteInfo]);
  const siteLabel = useMemo(() => getInviteSiteLabel(inviteInfo), [inviteInfo]);

  const clearTransientAuthState = () => {
    setAuthError(null);
    setClaimError(null);
    setClaimMessage(null);
  };

  useEffect(() => {
    activeInviteTokenRef.current = token;
    claimRunRef.current += 1;
    authRunRef.current += 1;
    setInviteInfo(null);
    setInviteState('loading');
    setClaiming(false);
    setClaimMessage(null);
    setClaimError(null);
    setClaimStep(null);
    setClaimTrace([]);
    claimAttemptKeyRef.current = null;
    setInviteLookupDebug(null);
    setAuthMode('signin');
    setAuthLoading(false);
    setAuthError(null);
    setSignInForm(initialSignInForm);
    setSignUpForm(initialSignUpForm);
  }, [token]);

  const updateSignInForm = (patch: Partial<typeof initialSignInForm>) => {
    clearTransientAuthState();
    setSignInForm((prev) => ({ ...prev, ...patch }));
  };

  const updateSignUpForm = (patch: Partial<typeof initialSignUpForm>) => {
    clearTransientAuthState();
    setSignUpForm((prev) => ({ ...prev, ...patch }));
  };

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
      setInviteLookupDebug(null);

      let nextInviteInfo: InviteInfo | null = null;
      try {
        nextInviteInfo = await fetchCollaboratorInviteInfo(token);
      } catch {
        if (!cancelled) {
          setInviteInfo(null);
          setInviteLookupDebug('Invite lookup needs retry');
          setInviteState('invalid');
        }
        return;
      }

      if (cancelled) return;

      if (!nextInviteInfo) {
        setInviteInfo(null);
        setInviteLookupDebug('No invite row matched this token.');
        setInviteState('invalid');
        return;
      }

      const resolvedState = resolveInviteValidationState(nextInviteInfo);
      setInviteInfo(nextInviteInfo);
      setAuthMode((prev) => prev === 'signin' ? 'signup' : prev);
      setSignInForm({
        ...initialSignInForm,
        email: nextInviteInfo.invite_email,
      });
      setSignUpForm({
        ...initialSignUpForm,
        email: nextInviteInfo.invite_email,
        fullName: nextInviteInfo.invite_name || '',
      });
      setInviteLookupDebug(`Invite loaded: status=${nextInviteInfo.status}`);
      setInviteState(resolvedState);
    };

    void loadInvite();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const trace = (msg: string) => {
    setClaimTrace((prev) => [...prev.slice(-11), `${new Date().toISOString()} ${msg}`]);
  };

  const claimInvite = async (authUser: AuthUser, currentInvite: InviteInfo, isActiveClaim: () => boolean = () => true) => {
    if (!currentInvite?.id || !currentInvite.wedding_site_id || !token) {
      throw new Error('Invite details are incomplete.');
    }
    if (!isInviteEmailMatch(authUser.email, currentInvite.invite_email)) {
      throw new Error(`This invite was sent to ${currentInvite.invite_email}. Sign in with that email to claim access.`);
    }

    trace('claimInvite:start');
    const rpcStart = Date.now();
    trace('claimInvite:rpc:start');
    const hasSession = await hasCollaboratorInviteSession();
    if (!isActiveClaim()) return;
    trace(`claimInvite:session:${hasSession ? 'yes' : 'no'}`);
    try {
      await claimCollaboratorInviteByToken(token);
    } catch (error) {
      if (!isActiveClaim()) return;
      const message = error instanceof Error ? error.message : String(error);
      trace(`claimInvite:rpc:error:${message}`);
      throw new Error('Couldn’t accept this invite right now. Please try again.');
    }

    if (!isActiveClaim()) return;
    const rpcMs = Date.now() - rpcStart;
    trace(`claimInvite:rpc:done:${rpcMs}ms`);
    void logAppAction({
      weddingSiteId: currentInvite.wedding_site_id,
      area: 'settings',
      type: 'collaborator_invite_claimed',
      summary: 'Collaborator invite was claimed.',
      targetId: currentInvite.id,
      targetLabel: currentInvite.invite_name || 'Collaborator invite',
      metadata: {
        role: currentInvite.role,
        claimDurationMs: rpcMs,
      },
    });
    setClaimStep(`Invite claimed in ${rpcMs}ms.`);
  };

  const finishClaim = async (authUser: AuthUser, currentInvite: InviteInfo, currentToken = token) => {
    const claimRun = claimRunRef.current + 1;
    claimRunRef.current = claimRun;
    const isActiveClaim = () => claimRunRef.current === claimRun && activeInviteTokenRef.current === currentToken;

    trace('finishClaim:start');
    setClaiming(true);
    setClaimError(null);
    setClaimStep('Preparing claim…');
    setClaimMessage('Claiming your collaborator access…');

    try {
      setClaimStep('Adding collaborator membership…');
      await claimInvite(authUser, currentInvite, isActiveClaim);
      if (!isActiveClaim()) return;
      trace('finishClaim:accepted');
      setInviteState('accepted');
      setClaimStep('Invite accepted. Opening…');
      setClaimMessage('Invite accepted. Opening your wedding…');
      trace(`finishClaim:navigate:${getCollaboratorRedirectPath(currentInvite.role)}`);
      navigate(getCollaboratorRedirectPath(currentInvite.role), { replace: true });
    } catch (err) {
      if (!isActiveClaim()) return;
      trace('finishClaim:error:invite-claim-needs-retry');
      setClaimError(safeCollaboratorInviteError(err));
      setClaimStep(null);
      setClaimMessage(null);
      throw err;
    } finally {
      if (isActiveClaim()) setClaiming(false);
    }
  };

  useEffect(() => {
    if (!user || !inviteInfo) return;
    if (!isInviteEmailMatch(user.email, inviteInfo.invite_email)) return;

    const alreadyAccepted = inviteInfo.status === 'accepted';
    if (alreadyAccepted) {
      trace('finishClaim:accepted');
      setInviteState('accepted');
      setClaimMessage('Invite already accepted. Redirecting to your wedding home…');
      navigate(getCollaboratorRedirectPath(inviteInfo.role), { replace: true });
      return;
    }

    if (inviteInfo.status !== 'pending' || claiming) return;

    const claimAttemptKey = `${user.id}:${inviteInfo.id}:${inviteInfo.status}`;
    if (claimAttemptKeyRef.current === claimAttemptKey) return;
    claimAttemptKeyRef.current = claimAttemptKey;

    void finishClaim(user, inviteInfo).catch(() => {
      claimAttemptKeyRef.current = null;
    });
  }, [user, inviteInfo, claiming, navigate]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const authRun = authRunRef.current + 1;
    authRunRef.current = authRun;
    const submitToken = token;
    const isActiveAuth = () => authRunRef.current === authRun && activeInviteTokenRef.current === submitToken;
    setAuthLoading(true);
    setAuthError(null);
    setClaimError(null);
    setClaimMessage(null);

    try {
      const authResult = await signInCollaboratorInviteAccount(signInForm.email, signInForm.password);
      if (!isActiveAuth()) return;

      if (!inviteInfo) throw new Error('Invite details are incomplete.');
      await finishClaim({
        id: authResult.user.id,
        email: authResult.user.email || signInForm.email,
        name: authResult.user.user_metadata?.name as string | undefined || authResult.user.email || signInForm.email,
      }, inviteInfo);
    } catch (err) {
      if (isActiveAuth()) setAuthError(safeAuthError(err, 'Couldn’t sign you in right now.'));
    } finally {
      if (isActiveAuth()) setAuthLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const authRun = authRunRef.current + 1;
    authRunRef.current = authRun;
    const submitToken = token;
    const isActiveAuth = () => authRunRef.current === authRun && activeInviteTokenRef.current === submitToken;
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
      const signedInUser = await createCollaboratorInviteAccount(
        signUpForm.email,
        signUpForm.password,
        signUpForm.fullName,
      );
      if (!isActiveAuth()) return;

      if (!inviteInfo) throw new Error('Invite details are incomplete.');
      await finishClaim({
        id: signedInUser.id,
        email: signedInUser.email || signUpForm.email,
        name: signedInUser.user_metadata?.name as string | undefined || signUpForm.fullName.trim() || signedInUser.email || signUpForm.email,
      }, inviteInfo);
    } catch (err) {
      if (isActiveAuth()) setAuthError(safeCollaboratorInviteError(err, 'Couldn’t create your account right now.'));
    } finally {
      if (isActiveAuth()) setAuthLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    setClaimError(null);
    setClaimMessage(null);
    setAuthError(null);
    await signOut();
  };

  const inviteIsClaimable = !!inviteInfo && inviteState !== 'missing' && inviteState !== 'invalid' && inviteState !== 'expired' && inviteState !== 'revoked';
  const debugFlags = [
    `state ${inviteState}`,
    `info ${inviteInfo ? 'yes' : 'no'}`,
    `auth ${authLoading ? 'loading' : 'idle'}`,
    `claim ${claiming ? 'active' : 'idle'}`,
  ].join(' · ');
  const signedInWithInviteEmail = !!user && !!inviteInfo && isInviteEmailMatch(user.email, inviteInfo.invite_email);
  const signedInWithDifferentEmail = !!user && !!inviteInfo && !isInviteEmailMatch(user.email, inviteInfo.invite_email);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface-subtle to-surface p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Heart className="w-8 h-8 text-accent" aria-hidden="true" />
            <span className="text-2xl font-semibold text-text-primary">dayof</span>
          </Link>
          <div className="rounded-xl border border-border-subtle bg-white/70 px-4 py-2 text-sm font-medium text-text-tertiary">
            Collaborator access
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card variant="default" padding="lg">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-surface-secondary p-3 text-primary">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-text-tertiary">Wedding invite</p>
                <h1 className="mt-3 text-3xl font-bold text-text-primary">Join this wedding</h1>
                <p className="mt-3 max-w-2xl text-text-secondary">
                  You’ve been invited to help with this wedding. Sign in or create an account to continue. No payment needed.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border-subtle bg-surface-subtle/30 p-4">
                <p className="text-xs font-medium text-text-tertiary">Step 1</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">Check invite</p>
                <p className="mt-2 text-sm text-text-secondary">We’ll confirm the invite and invited email.</p>
              </div>
              <div className="rounded-xl border border-border-subtle bg-surface-subtle/30 p-4">
                <p className="text-xs font-medium text-text-tertiary">Step 2</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">Sign in or create account</p>
                <p className="mt-2 text-sm text-text-secondary">Use the invited email to join this wedding.</p>
              </div>
              <div className="rounded-xl border border-border-subtle bg-surface-subtle/30 p-4">
                <p className="text-xs font-medium text-text-tertiary">Step 3</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">Join wedding</p>
                <p className="mt-2 text-sm text-text-secondary">We’ll add you to the wedding and take you there.</p>
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-border-subtle bg-surface-subtle/20 p-6">
              {inviteState === 'loading' && (
                <div className="flex items-center gap-3 text-text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Checking invite…</span>
                </div>
              )}

              {showInviteDebug && inviteLookupDebug && inviteState === 'valid' && (
                <p className="text-xs text-text-tertiary">Invite check: {inviteLookupDebug}</p>
              )}

              {inviteState === 'missing' && (
                <p className="text-sm text-text-secondary">This invite link is incomplete. Ask the owner to send the full invite URL again.</p>
              )}
              {inviteState === 'invalid' && (
                <div className="space-y-2">
                  <p className="text-sm text-text-secondary">This invite could not be found. Double-check the link or ask for a fresh invite.</p>
                  {showInviteDebug && inviteLookupDebug && <p className="text-xs text-text-tertiary">Invite check: {inviteLookupDebug}</p>}
                </div>
              )}
              {inviteState === 'expired' && (
                <div className="space-y-2">
                  <p className="text-sm text-text-secondary">This invite has expired. Ask the owner for a fresh invite link.</p>
                  {showInviteDebug && inviteLookupDebug && <p className="text-xs text-text-tertiary">Invite check: {inviteLookupDebug}</p>}
                </div>
              )}
              {inviteState === 'revoked' && (
                <div className="space-y-2">
                  <p className="text-sm text-text-secondary">This invite is no longer active.</p>
                  {showInviteDebug && inviteLookupDebug && <p className="text-xs text-text-tertiary">Invite check: {inviteLookupDebug}</p>}
                </div>
              )}
              {inviteState === 'accepted' && (
                <div className="space-y-2">
                  <p className="text-sm text-text-primary">This invite has already been claimed. If you already joined, we’ll open your wedding.</p>
                  {showInviteDebug && inviteLookupDebug && <p className="text-xs text-text-tertiary">Invite check: {inviteLookupDebug}</p>}
                </div>
              )}

              {inviteInfo && inviteIsClaimable && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm text-text-tertiary">Wedding team</p>
                    <p className="mt-2 text-2xl font-semibold text-text-primary">{siteLabel}</p>
                    <p className="mt-2 text-sm text-text-secondary">Invited for {formatRole(inviteInfo.role)} access.</p>
                  </div>

                  <dl className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-white p-4">
                      <dt className="text-xs font-medium text-text-tertiary">Invite name</dt>
                      <dd className="mt-2 text-sm font-medium text-text-primary">{inviteeLabel}</dd>
                    </div>
                    <div className="rounded-xl bg-white p-4">
                      <dt className="text-xs font-medium text-text-tertiary">Invited email</dt>
                      <dd className="mt-2 text-sm font-medium text-text-primary">{inviteInfo.invite_email}</dd>
                    </div>
                    <div className="rounded-xl bg-white p-4">
                      <dt className="text-xs font-medium text-text-tertiary">Role</dt>
                      <dd className="mt-2 text-sm font-medium text-text-primary">{formatRole(inviteInfo.role)}</dd>
                    </div>
                    <div className="rounded-xl bg-white p-4">
                      <dt className="text-xs font-medium text-text-tertiary">Billing</dt>
                      <dd className="mt-2 text-sm font-medium text-text-primary">No payment required</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>

            {claimMessage && (
              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-text-primary">
                <div>{claimMessage}</div>
                {showInviteDebug && claimStep && <div className="mt-1 text-xs text-text-tertiary">Claim stage: {claimStep}</div>}
                {showInviteDebug && claimTrace.length > 0 && (
                  <div className="mt-2 rounded border border-border-subtle bg-white/60 p-2 text-[11px] text-text-tertiary">
                    {claimTrace.map((line, idx) => <div key={`${idx}-${line}`}>{line}</div>)}
                  </div>
                )}
              </div>
            )}

            {claimError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-border-subtle bg-surface-secondary px-4 py-3 text-sm text-text-secondary">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>{claimError}</span>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {inviteState === 'accepted' && (
                <Button type="button" variant="accent" onClick={() => navigate(getCollaboratorRedirectPath(inviteInfo?.role))}>
                  Continue to your wedding
                </Button>
              )}
              <Link to="/" className="inline-flex items-center rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-subtle">
                Back to dayof
              </Link>
            </div>
          </Card>

          <Card variant="default" padding="lg" className="h-fit">
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
                    Signed in as <span className="font-medium text-text-primary">{user.email}</span>. We’ll finish joining automatically.
                  </p>
                </div>
                <Button type="button" variant="accent" fullWidth disabled>
                  {claiming ? 'Joining…' : 'Opening…'}
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-xl bg-surface-secondary p-3 text-primary">
                    {authMode === 'signin' ? <ShieldCheck className="h-5 w-5" aria-hidden="true" /> : <UserPlus className="h-5 w-5" aria-hidden="true" />}
                  </div>
                  <div>
                    <p className="text-sm text-text-tertiary">Collaborator invite</p>
                    <h2 className="text-2xl font-bold text-text-primary">{authMode === 'signin' ? 'Sign in and join' : 'Create account to join'}</h2>
                  </div>
                </div>

                <div className="flex rounded-xl bg-surface-subtle p-1 mb-6">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signin'); clearTransientAuthState(); }}
                    className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${authMode === 'signin' ? 'bg-white text-text-primary border border-border-subtle' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); clearTransientAuthState(); }}
                    className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${authMode === 'signup' ? 'bg-white text-text-primary border border-border-subtle' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    Create account
                  </button>
                </div>

                <div className="mb-5 rounded-xl border border-border-subtle bg-surface-subtle/30 p-4">
                  <p className="text-sm text-text-secondary">
                    {authMode === 'signin'
                      ? 'Use the invited email and password below. We’ll add you to the wedding right away.'
                      : 'Create an account to help with this wedding. No payment needed.'}
                  </p>
                  {showInviteDebug && <div className="mt-4 text-[11px] text-text-tertiary">{debugFlags}</div>}
                  {inviteIsClaimable && inviteInfo && (
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-secondary">
                      <span className="rounded-xl bg-white px-3 py-1 border border-border-subtle">{formatRole(inviteInfo.role)}</span>
                      <span className="rounded-xl bg-white px-3 py-1 border border-border-subtle">{inviteInfo.invite_email}</span>
                      <span className="rounded-xl bg-white px-3 py-1 border border-border-subtle">No payment</span>
                    </div>
                  )}
                </div>

                {authError && (
                  <div className="mb-5 flex items-start gap-2 rounded-xl border border-border-subtle bg-surface-secondary px-4 py-3 text-sm text-text-secondary">
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
                      onChange={(e) => updateSignInForm({ email: e.target.value })}
                      placeholder="planner@email.com"
                      required
                      autoComplete="email"
                      disabled={authLoading || claiming}
                    />
                    <Input
                      label="Password"
                      type="password"
                      value={signInForm.password}
                      onChange={(e) => updateSignInForm({ password: e.target.value })}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      disabled={authLoading || claiming}
                    />
                    <Button type="submit" variant="accent" size="lg" fullWidth disabled={authLoading || claiming}>
                      {authLoading || claiming ? 'Signing in…' : 'Sign in and join'}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleEmailSignUp} className="space-y-5">
                    <Input
                      label="Full name"
                      type="text"
                      value={signUpForm.fullName}
                      onChange={(e) => updateSignUpForm({ fullName: e.target.value })}
                      placeholder="Your name"
                      required
                      autoComplete="name"
                      disabled={authLoading || claiming}
                    />
                    <Input
                      label="Invited email"
                      type="email"
                      value={signUpForm.email}
                      onChange={(e) => updateSignUpForm({ email: e.target.value })}
                      placeholder="planner@email.com"
                      required
                      autoComplete="email"
                      disabled={authLoading || claiming}
                    />
                    <Input
                      label="Create password"
                      type="password"
                      value={signUpForm.password}
                      onChange={(e) => updateSignUpForm({ password: e.target.value })}
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
                      onChange={(e) => updateSignUpForm({ confirmPassword: e.target.value })}
                      placeholder="Repeat your password"
                      required
                      autoComplete="new-password"
                      disabled={authLoading || claiming}
                    />
                    <Button type="submit" variant="accent" size="lg" fullWidth disabled={authLoading || claiming}>
                      {authLoading || claiming ? 'Creating account…' : 'Create account and continue'}
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
