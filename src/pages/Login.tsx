import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
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
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in. Please try again.');
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
    } catch (err: any) {
      console.error('Demo login error:', err);
      setError(err.message || 'Failed to access demo. Please try again.');
    } finally {
      setDemoLoading(false);
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
          <h1 className="text-3xl font-bold text-text-primary mb-2">Welcome back</h1>
          <p className="text-text-secondary">Sign in to manage your wedding site</p>
        </div>

        <Card variant="default" padding="lg" className="shadow-lg">
          <form onSubmit={handleLogin} className="space-y-5">
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
              placeholder="Enter your password"
              required
            />

            {error && (
              <div className="p-3 bg-error-light text-error rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="accent"
              size="lg"
              fullWidth
              disabled={loading || demoLoading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-subtle"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-surface text-text-secondary">or</span>
            </div>
          </div>

          <Button
            variant="default"
            size="lg"
            fullWidth
            onClick={handleDemoLogin}
            disabled={loading || demoLoading}
          >
            {demoLoading ? 'Loading Demo...' : 'Try Demo'}
          </Button>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/signup')}
                className="text-primary hover:text-primary-hover font-medium transition-colors"
              >
                Sign up
              </button>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
