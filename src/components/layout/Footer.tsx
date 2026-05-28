import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-brand/20 mt-auto">
      <div className="container-custom py-10 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-6 h-6 text-accent" aria-hidden="true" />
              <span className="text-[1.25rem] font-serif font-semibold text-ink leading-snug tracking-tight">DayOf</span>
            </div>
            <p className="text-[0.875rem] text-ink/70 leading-normal">
              Your wedding site, done without the stress.
            </p>
          </div>

          <div>
            <h4 className="text-[0.875rem] font-semibold text-ink mb-4 leading-normal">Product</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/product" className="text-[0.875rem] text-ink/70 hover:text-ink transition-colors leading-normal">
                  Product Tour
                </Link>
              </li>
              <li>
                <Link to="/templates" className="text-[0.875rem] text-ink/70 hover:text-ink transition-colors leading-normal">
                  Templates
                </Link>
              </li>
              <li>
                <Link to="/#pricing" className="text-[0.875rem] text-ink/70 hover:text-ink transition-colors leading-normal">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[0.875rem] font-semibold text-ink mb-4 leading-normal">Company</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/#why" className="text-[0.875rem] text-ink/70 hover:text-ink transition-colors leading-normal">
                  Why We Built This
                </Link>
              </li>
              <li>
                <Link to="/trust" className="text-[0.875rem] text-ink/70 hover:text-ink transition-colors leading-normal">
                  Trust
                </Link>
              </li>
              <li>
                <a href="mailto:support@dayof.love" className="text-[0.875rem] text-ink/70 hover:text-ink transition-colors leading-normal">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[0.875rem] font-semibold text-ink mb-4 leading-normal">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/support" className="text-[0.875rem] text-ink/70 hover:text-ink transition-colors leading-normal">
                  Support
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-[0.875rem] text-ink/70 hover:text-ink transition-colors leading-normal">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-[0.875rem] text-ink/70 hover:text-ink transition-colors leading-normal">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/refund" className="text-[0.875rem] text-ink/70 hover:text-ink transition-colors leading-normal">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-brand/20">
          <p className="text-[0.875rem] text-ink/70 text-center leading-normal">
            &copy; {new Date().getFullYear()} DayOf. Built for trust, not tricks.
          </p>
        </div>
      </div>
    </footer>
  );
};
