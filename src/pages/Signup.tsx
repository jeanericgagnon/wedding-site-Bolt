import React from 'react';
import { Heart } from 'lucide-react';
import { Button, Card } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

export const Signup: React.FC = () => {
  const { signIn } = useAuth();

  const handleStartDemo = () => {
    signIn();
    window.location.hash = '#onboarding';
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
          <div className="space-y-5">
            <div className="text-center py-4">
              <p className="text-text-secondary mb-6">
                Start exploring with a demo wedding site
              </p>
              <Button variant="accent" size="lg" fullWidth onClick={handleStartDemo}>
                Get Started
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              Already have an account?{' '}
              <button onClick={() => window.location.hash = '#login'} className="text-primary hover:text-primary-hover font-medium transition-colors">
                Sign in
              </button>
            </p>
          </div>
        </Card>

        <p className="text-center text-xs text-text-tertiary mt-8">
          Demo mode with sample data for exploration
        </p>
      </div>
    </div>
  );
};
