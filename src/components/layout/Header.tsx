import React, { useState } from 'react';
import { Heart, Menu, X } from 'lucide-react';
import { Button } from '../ui';

interface HeaderProps {
  variant?: 'marketing' | 'dashboard';
}

export const Header: React.FC<HeaderProps> = ({ variant = 'marketing' }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (variant === 'dashboard') {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border-subtle backdrop-blur-sm">
      <nav className="container-custom" aria-label="Main navigation">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-accent" aria-hidden="true" />
            <span className="text-xl font-semibold text-text-primary">Dayof</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-base text-text-secondary hover:text-text-primary transition-colors no-underline">
              Features
            </a>
            <a href="#templates" className="text-base text-text-secondary hover:text-text-primary transition-colors no-underline">
              Templates
            </a>
            <a href="#pricing" className="text-base text-text-secondary hover:text-text-primary transition-colors no-underline">
              Pricing
            </a>
            <a href="#faq" className="text-base text-text-secondary hover:text-text-primary transition-colors no-underline">
              FAQ
            </a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" size="md">
              Login
            </Button>
            <Button variant="accent" size="md">
              Start Free
            </Button>
          </div>

          <button
            className="md:hidden p-2 text-text-primary hover:bg-surface-subtle rounded-lg transition-colors min-h-[44px] min-w-[44px]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border-subtle">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-base text-text-secondary hover:text-text-primary transition-colors py-2 no-underline">
                Features
              </a>
              <a href="#templates" className="text-base text-text-secondary hover:text-text-primary transition-colors py-2 no-underline">
                Templates
              </a>
              <a href="#pricing" className="text-base text-text-secondary hover:text-text-primary transition-colors py-2 no-underline">
                Pricing
              </a>
              <a href="#faq" className="text-base text-text-secondary hover:text-text-primary transition-colors py-2 no-underline">
                FAQ
              </a>
              <div className="flex flex-col gap-3 pt-4 border-t border-border-subtle">
                <Button variant="ghost" size="md" fullWidth>
                  Login
                </Button>
                <Button variant="accent" size="md" fullWidth>
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
