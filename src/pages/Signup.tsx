import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { supabase } from '../lib/supabase';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addSuffix, setAddSuffix] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    secondName: '',
    secondLastName: '',
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
      const suffix = addSuffix ? 's' : '';
      const subdomain = `${firstName}and${secondName}${suffix}.dayof.love`;

      const { error: siteError } = await supabase
        .from('wedding_sites')
        .insert({
          user_id: authData.user.id,
          couple_name_1: formData.firstName,
          couple_name_2: formData.secondName,
          couple_first_name: formData.firstName,
          couple_second_name: formData.secondName,
          couple_last_name: formData.lastName && formData.secondLastName
            ? `${formData.lastName} & ${formData.secondLastName}`
            : formData.lastName || formData.secondLastName || '',
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
                placeholder="John"
                required
              />
              <Input
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Smith"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Partner's Name"
                name="secondName"
                value={formData.secondName}
                onChange={handleChange}
                placeholder="Jane"
                required
              />
              <Input
                label="Last Name"
                name="secondLastName"
                value={formData.secondLastName}
                onChange={handleChange}
                placeholder="Doe"
                required
              />
            </div>

            {formData.firstName && formData.secondName && (
              <div className="p-4 bg-surface-subtle rounded-lg space-y-3">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Your wedding site URL:</p>
                  <p className="text-sm font-medium text-primary">
                    {formData.firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}and{formData.secondName.toLowerCase().replace(/[^a-z0-9]/g, '')}{addSuffix ? 's' : ''}.dayof.love
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-text-secondary">Add 's' at the end:</label>
                  <button
                    type="button"
                    onClick={() => setAddSuffix(!addSuffix)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      addSuffix ? 'bg-primary' : 'bg-border'
                    }`}
                    role="switch"
                    aria-checked={addSuffix}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        addSuffix ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-xs font-medium text-text-primary">
                    {addSuffix ? 'johnandjanes' : 'johnandjane'}
                  </span>
                </div>
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
