import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams, createSearchParams } from 'react-router-dom';
import { Chrome, Heart } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { supabase } from '../lib/supabase';
import { isPaymentGateEnabled } from '../lib/paymentGate';
import { consumeSignupReturnPath, writeSignupReturnPath } from '../lib/signupContinuation';
import { clearAuthEntryReturnPath } from '../lib/authEntryCleanup';
import { resolveSignupReturnPath } from '../lib/signupReturnResolver';
import { buildQuickStartEntryPath } from '../lib/quickStartContinuation';
import { normalizeMeaningfulQuickStartDraftSnapshot, persistQuickStartDraftSnapshot } from '../lib/quickStartStateTransfer';

const makeBaseSlug = (email: string) => {
  const local = (email.split('@')[0] || 'ourwedding').toLowerCase();
  const cleaned = local.replace(/[^a-z0-9]/g, '').slice(0, 20);
  return cleaned || 'ourwedding';
};

async function ensureMinimalWeddingSite(userId: string, email: string): Promise<void> {
  const existing = await supabase
    .from('wedding_sites')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing.data?.id) return;

  const base = makeBaseSlug(email);

  for (let i = 0; i < 6; i += 1) {
    const suffix = i === 0 ? '' : `-${Math.floor(1000 + Math.random() * 9000)}`;
    const siteSlug = `${base}${suffix}`;
    const siteUrl = `${siteSlug}.dayof.love`;

    const { error } = await supabase.from('wedding_sites').insert({
      user_id: userId,
      couple_name_1: 'You',
      couple_name_2: 'Partner',
      site_slug: siteSlug,
      site_url: siteUrl,
    });

    if (!error) return;

    const collision = /duplicate key|already exists|unique/i.test(error.message || '');
    if (!collision) throw error;
  }

  throw new Error('Could not reserve a website URL right now. Please try again.');
}

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


  const explicitReturnPath = (location.state as { returnTo?: string } | null)?.returnTo || null;
  const quickStartDraft = (location.state as { quickStartDraft?: unknown } | null)?.quickStartDraft;
  const normalizedQuickStartDraft = useMemo(
    () => normalizeMeaningfulQuickStartDraftSnapshot(quickStartDraft),
    [quickStartDraft],
  );

  useEffect(() => {
    if (!explicitReturnPath && !normalizedQuickStartDraft && !hasInviteContext) {
      clearAuthEntryReturnPath();
    }
  }, [explicitReturnPath, normalizedQuickStartDraft, hasInviteContext]);

  useEffect(() => {
    if (explicitReturnPath) writeSignupReturnPath(explicitReturnPath);
    if (normalizedQuickStartDraft) persistQuickStartDraftSnapshot(normalizedQuickStartDraft);
  }, [explicitReturnPath, normalizedQuickStartDraft]);

  const inviteReturnSearch = useMemo(() => {
    if (!inviteToken) return '';
    return `?${createSearchParams({ token: inviteToken }).toString()}`;
  }, [inviteToken]);

  useEffect(() => {
    if (inviteEmail) {
      setFormData((prev) => ({ ...prev, email: inviteEmail }));
    }
  }, [inviteEmail]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      if (explicitReturnPath) writeSignupReturnPath(explicitReturnPath);
      if (normalizedQuickStartDraft) persistQuickStartDraftSnapshot(normalizedQuickStartDraft);
      const fallbackRedirectPath = paymentGateEnabled ? '/payment-required?oauth=google' : '/onboarding?oauth=google';
      const redirectPath = hasInviteContext
        ? `/accept-collaborator-invite${inviteReturnSearch}&oauth=google`
        : resolveSignupReturnPath(explicitReturnPath, fallbackRedirectPath);

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${redirectPath}`,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err: unknown) {
      setError((err as Error).message || 'Couldn’t start Google sign-in right now. Please try again.');
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
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (signUpError) throw signUpError;

      let userId = authData.user?.id;

      if (!userId) {
        const signInRes = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInRes.error) {
          const msg = signInRes.error.message.toLowerCase();
          if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
            throw new Error('Account created! Check your email to confirm your address, then sign in.');
          }
          throw signInRes.error;
        }

        userId = signInRes.data.user?.id;
      }

      if (!userId) {
        throw new Error('Account created! Please sign in to continue.');
      }

      if (hasInviteContext) {
        navigate(`/accept-collaborator-invite${inviteReturnSearch}`, { replace: true });
        return;
      }

      await ensureMinimalWeddingSite(userId, formData.email);
      navigate(consumeSignupReturnPath() || resolveSignupReturnPath(explicitReturnPath, paymentGateEnabled ? '/payment-required?signup=1' : '/onboarding?signup=1'));
    } catch (err: unknown) {
      setError((err as Error).message || 'Couldn’t create your account right now. Please try again.');
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
            <span className="text-2xl font-semibold text-text-primary">WeddingSite</span>
          </Link>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Create your account</h1>
          <p className="text-text-secondary">
            {hasInviteContext ? 'Create a collaborator account, then jump straight back into this invite.' : (paymentGateEnabled ? 'Step 1: account setup. Step 2: site details after payment.' : 'Create your account, then go straight into setup.')}
          </p>
        </div>

        <Card variant="default" padding="lg" className="shadow-lg">
          {hasInviteContext && (
            <div className="mb-5 rounded-2xl border border-border-subtle bg-surface-subtle/30 p-4 text-left">
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Collaborator invite</p>
              <p className="mt-2 text-base font-semibold text-text-primary">{inviteSite || 'Wedding dashboard access'}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
                {inviteRole && <span className="rounded-full bg-white px-3 py-1">{inviteRole.replace(/_/g, ' ')}</span>}
                {inviteEmail && <span className="rounded-full bg-white px-3 py-1">{inviteEmail}</span>}
              </div>
              <p className="mt-3 text-xs text-text-tertiary">This path skips owner checkout. We’ll send you back to the invite after account creation.</p>
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
              <span className="px-2 bg-surface text-text-secondary">or continue with email</span>
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
              <div className={`p-3 rounded-lg text-sm ${
                error.startsWith('Account created!')
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-error-light text-error'
              }`}>
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
              {loading ? 'Creating Account...' : hasInviteContext ? 'Create account and continue invite' : 'Create Account'}
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
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-text-tertiary">
          <Link to="/support" className="hover:text-text-primary transition-colors">Support</Link>
          <Link to="/privacy" className="hover:text-text-primary transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-text-primary transition-colors">Terms</Link>
          <Link to="/refund" className="hover:text-text-primary transition-colors">Refund</Link>
        </div>
      </div>
    </div>
  );
};
