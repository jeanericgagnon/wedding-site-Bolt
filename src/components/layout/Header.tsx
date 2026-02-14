import React, { useState } from 'react';
import { Heart, Menu, X } from 'lucide-react';
import { Button } from '../ui';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  variant?: 'marketing' | 'dashboard';
}

export const Header: React.FC<HeaderProps> = ({ variant = 'marketing' }) => {
  const { signIn } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleStartFree = () => {
    signIn();
    window.location.hash = '#overview';
  };

  const handleLogin = () => {
    window.location.hash = '#login';
  };

  if (variant === 'dashboard') {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-surface-raised/95 border-b border-border-subtle backdrop-blur-md shadow-sm">
      <nav className="container-custom" aria-label="Main navigation">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <Heart className="w-5 h-5 text-accent" aria-hidden="true" />
            <span className="text-lg font-semibold text-text-primary tracking-tight">Dayof</span>
          </div>

          <div className="hidden md:flex items-center gap-7">
            <a href="#features" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors no-underline">
              Features
            </a>
            <a href="#templates" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors no-underline">
              Templates
            </a>
            <a href="#pricing" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors no-underline">
              Pricing
            </a>
            <a href="#faq" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors no-underline">
              FAQ
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleLogin}>
              Login
            </Button>
            <Button variant="accent" size="sm" onClick={handleStartFree}>
              Start Free
            </Button>
          </div>

          <button
            className="md:hidden p-2 text-text-primary hover:bg-surface-subtle rounded-lg transition-colors min-h-[44px] min-w-[44px]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border-subtle">
            <div className="flex flex-col gap-3">
              <a href="#features" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors py-2 no-underline">
                Features
              </a>
              <a href="#templates" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors py-2 no-underline">
                Templates
              </a>
              <a href="#pricing" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors py-2 no-underline">
                Pricing
              </a>
              <a href="#faq" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors py-2 no-underline">
                FAQ
              </a>
              <div className="flex flex-col gap-2 pt-3 mt-3 border-t border-border-subtle">
                <Button variant="ghost" size="md" fullWidth onClick={handleLogin}>
                  Login
                </Button>
                <Button variant="accent" size="md" fullWidth onClick={handleStartFree}>
                  Start Free
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
