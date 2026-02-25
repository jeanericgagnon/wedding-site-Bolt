import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Chrome, ArrowLeft, Mail, AlertCircle } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

type AuthView = 'login' | 'forgot-password' | 'forgot-sent';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn } = useAuth();
  const [view, setView] = useState<AuthView>('login');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });

  useEffect(() => {
    if (searchParams.get('reason') === 'session_expired') {
      setNotice('Your session expired. Please sign in again.');
    }

    let mounted = true;
    const oauthSource = searchParams.get('oauth');

    const primeSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session && oauthSource === 'google') {
        setNotice('Google sign-in successful. Redirecting to your dashboard…');
        navigate('/dashboard', { replace: true });
      }
    };

    primeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN') {
        if (oauthSource === 'google') {
          setNotice('Google sign-in successful. Redirecting to your dashboard…');
        }
        navigate('/dashboard', { replace: true });
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [searchParams, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (signInError) throw signInError;
      navigate('/dashboard');
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setError('');
    try {
      await signIn();
      navigate('/dashboard');
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to access demo. Please try again.');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login?oauth=google`,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to start Google sign-in. Please try again.');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (resetError) throw resetError;
      setView('forgot-sent');
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (view === 'forgot-sent') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-surface-subtle to-surface p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
              <Heart className="w-8 h-8 text-accent" aria-hidden="true" />
              <span className="text-2xl font-semibold text-text-primary">WeddingSite</span>
            </Link>
          </div>
          <Card variant="default" padding="lg" className="shadow-lg text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <Mail className="w-8 h-8 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Check your email</h1>
            <p className="text-text-secondary mb-2">
              We sent a password reset link to
            </p>
            <p className="font-medium text-text-primary mb-6">{resetEmail}</p>
            <p className="text-sm text-text-secondary mb-6">
              Didn't receive it? Check your spam folder or try again with a different email address.
            </p>
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => { setView('forgot-password'); setResetEmail(''); setError(''); }}
            >
              Try a different email
            </Button>
            <button
              onClick={() => setView('login')}
              className="mt-4 text-sm text-primary hover:text-primary-hover font-medium transition-colors w-full text-center"
            >
              Back to sign in
            </button>
          </Card>
        </div>
      </div>
    );
  }

  if (view === 'forgot-password') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-surface-subtle to-surface p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
              <Heart className="w-8 h-8 text-accent" aria-hidden="true" />
              <span className="text-2xl font-semibold text-text-primary">WeddingSite</span>
            </Link>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Reset your password</h1>
            <p className="text-text-secondary">Enter your email and we'll send you a reset link</p>
          </div>
          <Card variant="default" padding="lg" className="shadow-lg">
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <Input
                label="Email address"
                type="email"
                name="resetEmail"
                value={resetEmail}
                onChange={(e) => { setResetEmail(e.target.value); setError(''); }}
                placeholder="your@email.com"
                required
              />
              {error && (
                <div className="p-3 bg-error-light text-error rounded-lg text-sm" role="alert">
                  {error}
                </div>
              )}
              <Button type="submit" variant="accent" size="lg" fullWidth disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
            <button
              onClick={() => { setView('login'); setError(''); }}
              className="mt-5 flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mx-auto"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to sign in
            </button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-surface-subtle to-surface p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
            <Heart className="w-8 h-8 text-accent" aria-hidden="true" />
            <span className="text-2xl font-semibold text-text-primary">WeddingSite</span>
          </Link>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Welcome back</h1>
          <p className="text-text-secondary">Sign in to manage your wedding site</p>
        </div>

        <Card variant="default" padding="lg" className="shadow-lg">
          {notice && (
            <div className="flex items-start gap-2 p-3 bg-warning-light rounded-lg text-sm text-warning border border-warning/20 mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>{notice}</span>
            </div>
          )}
          <Button
            variant="outline"
            size="lg"
            fullWidth
            onClick={handleGoogleSignIn}
            disabled={loading || demoLoading}
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

          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              required
              autoComplete="email"
            />

            <div>
              <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={() => { setView('forgot-password'); setError(''); }}
                  className="text-xs text-primary hover:text-primary-hover transition-colors font-medium"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-error-light text-error rounded-lg text-sm" role="alert">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="accent"
              size="lg"
              fullWidth
              disabled={loading || demoLoading }
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-subtle" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-surface text-text-secondary">or</span>
            </div>
          </div>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={handleDemoLogin}
            disabled={loading || demoLoading }
          >
            {demoLoading ? 'Loading demo...' : 'Try Demo — no account needed'}
          </Button>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:text-primary-hover font-medium transition-colors">
                Get started — $49
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
