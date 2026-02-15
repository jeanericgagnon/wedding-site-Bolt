import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Button, Card } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleDemoLogin = () => {
    signIn();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-surface-subtle to-surface p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
            <Heart className="w-8 h-8 text-accent" aria-hidden="true" />
            <span className="text-2xl font-bold text-text-primary tracking-tight">WeddingSite</span>
          </Link>
          <h1 className="text-3xl font-bold text-text-primary mb-2 tracking-tight">Welcome back</h1>
          <p className="text-text-secondary">Sign in to manage your wedding site</p>
        </div>

        <Card variant="default" padding="lg" className="shadow-lg">
          <div className="space-y-5">
            <div className="text-center py-4">
              <p className="text-text-secondary mb-6">
                Try the demo experience with sample wedding data
              </p>
              <Button variant="accent" size="lg" fullWidth className="shadow-md hover:shadow-lg" onClick={handleDemoLogin}>
                View Demo Dashboard
              </Button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border-subtle text-center">
            <p className="text-sm text-text-secondary">
              Don't have an account?{' '}
              <button onClick={handleDemoLogin} className="text-primary hover:text-primary-hover font-semibold transition-colors">
                Start Free
              </button>
            </p>
          </div>
        </Card>

        <p className="text-center text-xs text-text-tertiary mt-6 leading-relaxed max-w-sm mx-auto">
          Demo mode with sample data for exploration
        </p>
      </div>
    </div>
  );
};
