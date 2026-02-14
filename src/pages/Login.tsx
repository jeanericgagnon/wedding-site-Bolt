import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button, Input, Card } from '../components/ui';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', { email, password });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-surface-subtle to-surface p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="#/" className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
            <Heart className="w-8 h-8 text-accent" aria-hidden="true" />
            <span className="text-2xl font-bold text-text-primary tracking-tight">Dayof</span>
          </a>
          <h1 className="text-3xl font-bold text-text-primary mb-2 tracking-tight">Welcome back</h1>
          <p className="text-text-secondary">Sign in to manage your wedding site</p>
        </div>

        <Card variant="default" padding="lg" className="shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-2"
                />
                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">Remember me</span>
              </label>
              <a href="#forgot" className="text-sm text-primary hover:text-primary-hover font-medium transition-colors">
                Forgot password?
              </a>
            </div>

            <div className="pt-2">
              <Button type="submit" variant="accent" size="lg" fullWidth className="shadow-md hover:shadow-lg">
                Sign In
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-border-subtle text-center">
            <p className="text-sm text-text-secondary">
              Don't have an account?{' '}
              <a href="#signup" className="text-primary hover:text-primary-hover font-semibold transition-colors">
                Sign up
              </a>
            </p>
          </div>
        </Card>

        <p className="text-center text-xs text-text-tertiary mt-6 leading-relaxed max-w-sm mx-auto">
          By signing in, you agree to our{' '}
          <a href="#terms" className="text-text-secondary hover:text-text-primary transition-colors underline underline-offset-2">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#privacy" className="text-text-secondary hover:text-text-primary transition-colors underline underline-offset-2">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};
