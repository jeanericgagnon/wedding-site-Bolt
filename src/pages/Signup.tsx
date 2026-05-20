import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams, createSearchParams } from 'react-router-dom';
import { Chrome, Heart } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { createSignupAccount, ensureMinimalWeddingSite, startSignupWithGoogle } from './signupService';
import { isPaymentGateEnabled } from '../lib/paymentGate';
import { consumeSignupReturnPath, writeSignupReturnPath } from '../lib/signupContinuation';
import { clearAuthEntryReturnPath } from '../lib/authEntryCleanup';
import { resolveSignupReturnPath } from '../lib/signupReturnResolver';
import { normalizeMeaningfulQuickStartDraftSnapshot, persistQuickStartDraftSnapshot } from '../lib/quickStartStateTransfer';
import { safeAuthError } from '../lib/authErrorCopy';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const paymentGateEnabled = isPaymentGateEnabled();
  const inviteToken = searchParams.get('inviteToken');
  const inviteEmail = searchParams.get('inviteEmail');
  const inviteRole = searchParams.get('inviteRole');
  const inviteSite = searchParams.get('inviteSite');
  const hasInviteContext = Boolean(inviteToken && inviteEmail);
  const signupStorageScope = (inviteEmail || formData.email || '').trim().toLowerCase() || null;

  const clearSignupFeedback = () => {
    setLoading(false);
    setError('');
  };


  const explicitReturnPath = (location.state as { returnTo?: string } | null)?.returnTo || null;
  const quickStartDraft = (location.state as { quickStartDraft?: unknown } | null)?.quickStartDraft;
  const normalizedQuickStartDraft = useMemo(
    () => normalizeMeaningfulQuickStartDraftSnapshot(quickStartDraft),
    [quickStartDraft],
  );

  useEffect(() => {
    if (!explicitReturnPath && !normalizedQuickStartDraft && !hasInviteContext) {
      clearAuthEntryReturnPath(signupStorageScope);
    }
  }, [explicitReturnPath, normalizedQuickStartDraft, hasInviteContext, signupStorageScope]);

  useEffect(() => {
    if (explicitReturnPath) writeSignupReturnPath(explicitReturnPath, signupStorageScope);
    if (normalizedQuickStartDraft) persistQuickStartDraftSnapshot(normalizedQuickStartDraft, signupStorageScope);
  }, [explicitReturnPath, normalizedQuickStartDraft, signupStorageScope]);

  const inviteReturnSearch = useMemo(() => {
    if (!inviteToken) return '';
    return `?${createSearchParams({ token: inviteToken }).toString()}`;
  }, [inviteToken]);

  useEffect(() => {
    clearSignupFeedback();
    setFormData({
      email: inviteEmail ?? '',
      password: '',
      confirmPassword: '',
    });
  }, [inviteEmail, inviteRole, inviteSite, inviteToken]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearSignupFeedback();
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      if (explicitReturnPath) writeSignupReturnPath(explicitReturnPath, signupStorageScope);
      if (normalizedQuickStartDraft) persistQuickStartDraftSnapshot(normalizedQuickStartDraft, signupStorageScope);
      const fallbackRedirectPath = paymentGateEnabled ? '/payment-required?oauth=google' : '/onboarding?oauth=google';
      const redirectPath = hasInviteContext
        ? `/accept-collaborator-invite${inviteReturnSearch}&oauth=google`
        : resolveSignupReturnPath(explicitReturnPath, fallbackRedirectPath, signupStorageScope);

      await startSignupWithGoogle(`${window.location.origin}${redirectPath}`);
    } catch (err: unknown) {
      setError(safeAuthError(err, 'Couldn’t start Google sign-in right now. Please try again.'));
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password.length < 8) {
      setError('Use a password with at least 8 characters.');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const userId = await createSignupAccount(formData.email, formData.password);

      if (hasInviteContext) {
        navigate(`/accept-collaborator-invite${inviteReturnSearch}`, { replace: true });
        return;
      }

      await ensureMinimalWeddingSite(userId, formData.email);
      navigate(consumeSignupReturnPath(formData.email) || resolveSignupReturnPath(explicitReturnPath, paymentGateEnabled ? '/payment-required?signup=1' : '/onboarding?signup=1', formData.email));
    } catch (err: unknown) {
      setError(safeAuthError(err, 'Couldn’t create your account right now. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-surface-subtle to-surface p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
            <Heart className="w-8 h-8 text-accent" aria-hidden="true" />
            <span className="text-2xl font-semibold text-text-primary">dayof</span>
          </Link>
          <h1 className="text-3xl font-semibold text-text-primary mb-2">Start your wedding</h1>
          <p className="text-text-secondary">
            {hasInviteContext ? 'Create your collaborator account, then return to the invite.' : (paymentGateEnabled ? 'Create your account first. Then we’ll help you start your wedding site.' : 'Create your account, then we’ll help you start the first version.')}
          </p>
        </div>

        <Card variant="default" padding="lg">
          {hasInviteContext && (
            <div className="mb-5 rounded-xl border border-border-subtle bg-surface-subtle/30 p-4 text-left">
              <p className="text-xs font-medium text-text-tertiary">Wedding invite</p>
              <p className="mt-2 text-base font-semibold text-text-primary">{inviteSite || 'Wedding access'}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
                {inviteRole && <span className="rounded-full bg-white px-3 py-1">{inviteRole.replace(/_/g, ' ')}</span>}
                {inviteEmail && <span className="rounded-full bg-white px-3 py-1">{inviteEmail}</span>}
              </div>
              <p className="mt-3 text-xs text-text-tertiary">No payment needed. We’ll take you back to the invite after your account is created.</p>
            </div>
          )}

          <Button
            variant="outline"
            size="lg"
            fullWidth
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mb-5"
          >
            <Chrome className="w-5 h-5 mr-2" aria-hidden="true" />
            Continue with Google
          </Button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-subtle" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-surface text-text-secondary">or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              required
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password"
              required
              helperText="Minimum 8 characters"
            />

            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat your password"
              required
            />

            {error && (
              <div className="p-3 rounded-xl text-sm bg-surface-secondary border border-border-subtle text-text-secondary">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="accent"
              size="lg"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Creating account...' : hasInviteContext ? 'Create account and continue' : 'Create account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              Already have an account?{' '}
              <button
                onClick={() => navigate(
                  hasInviteContext
                    ? `/login?${createSearchParams({ inviteToken: inviteToken || '', inviteEmail: inviteEmail || '', inviteRole: inviteRole || '', inviteSite: inviteSite || '' }).toString()}`
                    : '/login',
                  explicitReturnPath || normalizedQuickStartDraft ? {
                    state: {
                      ...(explicitReturnPath ? { returnTo: explicitReturnPath } : {}),
                      ...(normalizedQuickStartDraft ? { quickStartDraft: normalizedQuickStartDraft } : {}),
                    },
                  } : undefined,
                )}
                className="text-primary hover:text-primary-hover font-medium transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
