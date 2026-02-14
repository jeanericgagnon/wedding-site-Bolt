import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button, Input, Card } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

export const Signup: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    couple_name_1: '',
    couple_name_2: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    const { error } = await signUp(formData.email, formData.password, {
      couple_name_1: formData.couple_name_1,
      couple_name_2: formData.couple_name_2,
    });

    if (error) {
      setError(error.message || 'Failed to create account');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-surface-subtle to-surface p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <Heart className="w-8 h-8 text-accent" aria-hidden="true" />
            <span className="text-2xl font-semibold text-text-primary">Dayof</span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Create your account</h1>
          <p className="text-text-secondary">Start building your wedding site in minutes</p>
        </div>

        <Card variant="default" padding="lg" className="shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-error-light border border-error/20 text-error text-sm">
                {error}
              </div>
            )}

            <Input
              label="First partner name"
              name="couple_name_1"
              placeholder="Alex"
              value={formData.couple_name_1}
              onChange={handleChange}
              required
            />

            <Input
              label="Second partner name"
              name="couple_name_2"
              placeholder="Jordan"
              value={formData.couple_name_2}
              onChange={handleChange}
              required
            />

            <Input
              label="Email"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={handleChange}
              helperText="At least 8 characters"
              required
            />

            <Input
              label="Confirm password"
              type="password"
              name="confirmPassword"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />

            <Button type="submit" variant="accent" size="lg" fullWidth disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              Already have an account?{' '}
              <a href="#login" className="text-primary hover:text-primary-hover font-medium transition-colors">
                Sign in
              </a>
            </p>
          </div>
        </Card>

        <p className="text-center text-xs text-text-tertiary mt-8">
          By creating an account, you agree to our{' '}
          <a href="#terms" className="text-text-secondary hover:text-text-primary transition-colors">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#privacy" className="text-text-secondary hover:text-text-primary transition-colors">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};
