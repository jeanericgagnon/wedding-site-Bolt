import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-brand/20 mt-auto">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-6 h-6 text-accent" aria-hidden="true" />
              <span className="text-xl font-serif font-semibold text-ink">WeddingSite</span>
            </div>
            <p className="text-sm text-ink/70">
              Your wedding site, done without the stress.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-ink mb-4">Product</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/product" className="text-sm text-ink/70 hover:text-ink transition-colors">
                  Product Tour
                </Link>
              </li>
              <li>
                <Link to="/product#templates" className="text-sm text-ink/70 hover:text-ink transition-colors">
                  Templates
                </Link>
              </li>
              <li>
                <Link to="/#pricing" className="text-sm text-ink/70 hover:text-ink transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-ink mb-4">Company</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/#why" className="text-sm text-ink/70 hover:text-ink transition-colors">
                  Why We Built This
                </Link>
              </li>
              <li>
                <span className="text-sm text-ink/40">
                  Trust (coming soon)
                </span>
              </li>
              <li>
                <a href="mailto:hello@weddingsite.example" className="text-sm text-ink/70 hover:text-ink transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-ink mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <span className="text-sm text-ink/40">
                  Privacy Policy (coming soon)
                </span>
              </li>
              <li>
                <span className="text-sm text-ink/40">
                  Terms of Service (coming soon)
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-brand/20">
          <p className="text-sm text-ink/70 text-center">
            &copy; {new Date().getFullYear()} WeddingSite. Built for trust, not tricks.
          </p>
        </div>
      </div>
    </footer>
  );
};
