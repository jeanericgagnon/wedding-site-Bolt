import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { supabase } from '../lib/supabase';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    secondName: '',
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('No user returned from signup');

      const firstName = formData.firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const secondName = formData.secondName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const coupleEmail = `${firstName}-${secondName}@dayof.love`;
      const subdomain = `${firstName}and${secondName}.dayof.love`;

      const { error: siteError } = await supabase
        .from('wedding_sites')
        .insert({
          user_id: authData.user.id,
          couple_name_1: formData.firstName,
          couple_name_2: formData.secondName,
          couple_first_name: formData.firstName,
          couple_second_name: formData.secondName,
          couple_email: coupleEmail,
          site_url: subdomain,
        });

      if (siteError) throw siteError;

      navigate('/dashboard');
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
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
          <p className="text-text-secondary">Start building your wedding site in minutes</p>
        </div>

        <Card variant="default" padding="lg" className="shadow-lg">
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Alex"
                required
              />
              <Input
                label="Second Name"
                name="secondName"
                value={formData.secondName}
                onChange={handleChange}
                placeholder="Jordan"
                required
              />
            </div>

            {formData.firstName && formData.secondName && (
              <div className="p-3 bg-surface-subtle rounded-lg">
                <p className="text-xs text-text-secondary mb-1">Your wedding site will be:</p>
                <p className="text-sm font-medium text-primary">
                  {formData.firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}and{formData.secondName.toLowerCase().replace(/[^a-z0-9]/g, '')}.dayof.love
                </p>
              </div>
            )}

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
              helperText="Minimum 6 characters"
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
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
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
