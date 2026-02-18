import React from 'react';
import { X, Check, Sparkles, Clock } from 'lucide-react';
import { Button } from '../ui';

interface BillingModalProps {
  onClose: () => void;
  currentPlan?: 'free' | 'pro';
}

const PRO_FEATURES = [
  'Unlimited guests and RSVPs',
  'Custom domain support',
  'Photo & video vault (5 GB)',
  'Priority email support',
  'Advanced analytics',
  'Remove WeddingSite branding',
  'Scheduled messaging',
  'Seating chart tools',
];

const FREE_FEATURES = [
  'Up to 50 guests',
  'Basic RSVP collection',
  'Public wedding site',
  'Registry links',
  '1 GB photo vault',
];

export const BillingModal: React.FC<BillingModalProps> = ({ onClose, currentPlan = 'free' }) => {
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="billing-modal-title"
    >
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border-subtle">
          <div>
            <h2 id="billing-modal-title" className="text-xl font-bold text-text-primary">
              Plans & Pricing
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              Everything you need for a beautiful wedding website.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-subtle rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-text-secondary" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className={`rounded-xl border-2 p-5 transition-all ${currentPlan === 'free' ? 'border-border bg-surface' : 'border-border bg-surface opacity-60'}`}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-text-primary text-lg">Free</h3>
                {currentPlan === 'free' && (
                  <span className="text-xs font-medium px-2 py-0.5 bg-surface-subtle text-text-secondary rounded-full">
                    Current plan
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold text-text-primary">$0</span>
                <span className="text-text-secondary text-sm">forever</span>
              </div>
              <ul className="space-y-2.5">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                    <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border-2 border-accent/30 bg-accent/3 p-5 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="flex items-center gap-1 px-3 py-1 bg-accent text-white text-xs font-semibold rounded-full shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  Most popular
                </span>
              </div>
              <div className="flex items-center justify-between mb-1 mt-2">
                <h3 className="font-bold text-text-primary text-lg">Pro</h3>
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold text-text-primary">$49</span>
                <span className="text-text-secondary text-sm">one-time</span>
              </div>
              <ul className="space-y-2.5">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                    <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl mb-5 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Paid upgrades coming soon</p>
              <p className="text-sm text-amber-700 mt-0.5">
                We are finalising our payment integration. Pro features will be available to purchase very soon.
                In the meantime, all features are free to use.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" size="lg" onClick={onClose} className="flex-1">
              Close
            </Button>
            <Button
              variant="accent"
              size="lg"
              disabled
              className="flex-2 opacity-60 cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
              Upgrade to Pro — Coming Soon
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
