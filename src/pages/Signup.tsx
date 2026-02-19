import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Chrome } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { supabase } from '../lib/supabase';
import { sendSignupWelcome } from '../lib/emailService';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [addSuffix, setAddSuffix] = useState(true);
  const [urlTaken, setUrlTaken] = useState(false);
  const [checkingUrl, setCheckingUrl] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    secondName: '',
    secondLastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const handleGooglePlaceholder = () => {
    setGoogleLoading(true);
    setTimeout(() => {
      setGoogleLoading(false);
      setError('Google sign-up is coming soon. Create an account with email/password to get started.');
    }, 800);
  };

  useEffect(() => {
    const checkUrlAvailability = async () => {
      if (isCustomizing) return;

      if (!formData.firstName || !formData.secondName) {
        setUrlTaken(false);
        return;
      }

      setCheckingUrl(true);

      const firstName = formData.firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const secondName = formData.secondName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const suffix = addSuffix ? 's' : '';
      const subdomain = `${firstName}and${secondName}${suffix}.dayof.love`;

      const { data } = await supabase
        .from('wedding_sites')
        .select('site_url')
        .eq('site_url', subdomain)
        .maybeSingle();

      setUrlTaken(!!data);
      setCheckingUrl(false);
    };

    const debounceTimer = setTimeout(checkUrlAvailability, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.firstName, formData.secondName, formData.lastName, formData.secondLastName, addSuffix, isCustomizing]);

  useEffect(() => {
    const checkCustomUrlAvailability = async () => {
      if (!isCustomizing || !customUrl) return;

      setCheckingUrl(true);
      const cleanUrl = customUrl.toLowerCase().replace(/[^a-z0-9]/g, '');
      const subdomain = `${cleanUrl}.dayof.love`;

      const { data } = await supabase
        .from('wedding_sites')
        .select('site_url')
        .eq('site_url', subdomain)
        .maybeSingle();

      setUrlTaken(!!data);
      setCheckingUrl(false);
    };

    const debounceTimer = setTimeout(checkCustomUrlAvailability, 500);
    return () => clearTimeout(debounceTimer);
  }, [customUrl, isCustomizing]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
      if (!authData.user) throw new Error('No user returned from signup');

      let session = authData.session;

      if (!session?.access_token) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError) {
          const isEmailNotConfirmed =
            signInError.message.toLowerCase().includes('email not confirmed') ||
            signInError.message.toLowerCase().includes('email_not_confirmed');

          if (isEmailNotConfirmed) {
            throw new Error(
              'Account created! Check your email to confirm your address, then sign in.'
            );
          }
          throw new Error('Account created! Please sign in to continue.');
        }

        session = signInData.session;
      }

      if (!session?.access_token) {
        throw new Error('Account created! Check your email to confirm your address, then sign in.');
      }

      let subdomain: string;

      if (isCustomizing && customUrl) {
        const cleanUrl = customUrl.toLowerCase().replace(/[^a-z0-9]/g, '');
        subdomain = `${cleanUrl}.dayof.love`;
      } else {
        const firstName = formData.firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const secondName = formData.secondName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const lastName = formData.lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const secondLastName = formData.secondLastName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const suffix = addSuffix ? 's' : '';

        subdomain = `${firstName}and${secondName}${suffix}.dayof.love`;

        const { data: existingUrl } = await supabase
          .from('wedding_sites')
          .select('site_url')
          .eq('site_url', subdomain)
          .maybeSingle();

        if (existingUrl) {
          subdomain = `${firstName}${lastName}and${secondName}${secondLastName}${suffix}.dayof.love`;
        }
      }

      const firstName = formData.firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const secondName = formData.secondName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const coupleEmail = `${firstName}-${secondName}@dayof.love`;

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

      sendSignupWelcome({
        email: formData.email,
        coupleName1: formData.firstName,
        coupleName2: formData.secondName,
        siteUrl: subdomain,
      }).catch(() => {});

      navigate('/payment-required');
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to create account. Please try again.');
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
          <p className="text-text-secondary">One-time payment of $49 — yours forever</p>
        </div>

        <Card variant="default" padding="lg" className="shadow-lg">
          <Button
            variant="outline"
            size="lg"
            fullWidth
            onClick={handleGooglePlaceholder}
            disabled={loading || googleLoading}
            className="mb-5"
          >
            <Chrome className="w-5 h-5 mr-2" aria-hidden="true" />
            {googleLoading ? 'Loading...' : 'Sign up with Google'}
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
                  {checkingUrl ? (
                    <p className="text-sm text-text-secondary">Checking availability...</p>
                  ) : (
                    <>
                      {isCustomizing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={customUrl}
                            onChange={(e) => setCustomUrl(e.target.value)}
                            placeholder="yourcustomurl"
                            className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <span className="text-sm text-text-secondary">.dayof.love</span>
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-primary">
                          {urlTaken && formData.lastName && formData.secondLastName ? (
                            <>
                              {formData.firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}
                              {formData.lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}
                              and
                              {formData.secondName.toLowerCase().replace(/[^a-z0-9]/g, '')}
                              {formData.secondLastName.toLowerCase().replace(/[^a-z0-9]/g, '')}
                              {addSuffix ? 's' : ''}.dayof.love
                            </>
                          ) : (
                            <>
                              {formData.firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}
                              and
                              {formData.secondName.toLowerCase().replace(/[^a-z0-9]/g, '')}
                              {addSuffix ? 's' : ''}.dayof.love
                            </>
                          )}
                        </p>
                      )}

                      {urlTaken && !isCustomizing && (
                        <div className="mt-2 space-y-2">
                          {formData.lastName && formData.secondLastName && (
                            <p className="text-xs text-warning">
                              First names URL taken, using full names
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomizing(true);
                              const firstName = formData.firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
                              const lastName = formData.lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
                              const secondName = formData.secondName.toLowerCase().replace(/[^a-z0-9]/g, '');
                              const secondLastName = formData.secondLastName.toLowerCase().replace(/[^a-z0-9]/g, '');
                              const suffix = addSuffix ? 's' : '';
                              setCustomUrl(`${firstName}${lastName}and${secondName}${secondLastName}${suffix}`);
                            }}
                            className="text-xs text-primary hover:text-primary/80 underline"
                          >
                            Customize URL
                          </button>
                        </div>
                      )}

                      {isCustomizing && urlTaken && (
                        <p className="text-xs text-error mt-1">
                          This URL is already taken
                        </p>
                      )}

                      {isCustomizing && !urlTaken && customUrl && (
                        <p className="text-xs text-success mt-1">
                          This URL is available!
                        </p>
                      )}
                    </>
                  )}
                </div>

                {!isCustomizing && (
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
                )}

                {isCustomizing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomizing(false);
                      setCustomUrl('');
                    }}
                    className="text-xs text-text-secondary hover:text-text-primary"
                  >
                    ← Use auto-generated URL
                  </button>
                )}
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
