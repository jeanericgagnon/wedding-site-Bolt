import React from 'react';
import { Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-surface-subtle border-t border-border-subtle mt-auto">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-6 h-6 text-accent" aria-hidden="true" />
              <span className="text-xl font-semibold text-text-primary">Dayof</span>
            </div>
            <p className="text-sm text-text-secondary">
              Your wedding site, done without the stress.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-text-primary mb-4">Product</h4>
            <ul className="space-y-3">
              <li>
                <a href="#features" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">
                  Features
                </a>
              </li>
              <li>
                <a href="#templates" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">
                  Templates
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#examples" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">
                  Examples
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-text-primary mb-4">Resources</h4>
            <ul className="space-y-3">
              <li>
                <a href="#help" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#guides" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">
                  Guides
                </a>
              </li>
              <li>
                <a href="#faq" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#contact" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-text-primary mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <a href="#privacy" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#cookies" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border-subtle">
          <p className="text-sm text-text-secondary text-center">
            &copy; {new Date().getFullYear()} Dayof. Easy to set up, easy to manage, easy for guests.
          </p>
        </div>
      </div>
    </footer>
  );
};
