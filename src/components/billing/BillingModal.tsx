import React, { useState } from 'react';
import { X, Check, CreditCard, Sparkles, Shield, Zap } from 'lucide-react';
import { Button } from '../ui';

type CheckoutState = 'idle' | 'processing' | 'success' | 'error';

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
  const [checkoutState, setCheckoutState] = useState<CheckoutState>('idle');
  const [selectedPlan, setSelectedPlan] = useState<'pro'>('pro');

  const handleUpgrade = () => {
    if (selectedPlan !== 'pro') return;
    setCheckoutState('processing');

    setTimeout(() => {
      setCheckoutState('success');
    }, 1800);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (checkoutState === 'success') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="billing-success-title"
      >
        <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-fade-in">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check className="w-10 h-10 text-success" aria-hidden="true" />
          </div>
          <h2 id="billing-success-title" className="text-2xl font-bold text-text-primary mb-3">
            You're on Pro!
          </h2>
          <p className="text-text-secondary mb-2">
            Welcome to WeddingSite Pro. All features are now unlocked.
          </p>
          <p className="text-xs text-text-tertiary mb-6 p-3 bg-surface-subtle rounded-lg">
            Note: This is a prototype — no real payment was processed. Stripe integration is in test mode.
          </p>
          <Button variant="accent" size="lg" fullWidth onClick={onClose}>
            Start using Pro features
          </Button>
        </div>
      </div>
    );
  }

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
              Choose your plan
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              Upgrade anytime. Cancel anytime.
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-warning/10 text-warning text-xs font-medium rounded-full mb-6">
            <Zap className="w-3.5 h-3.5" aria-hidden="true" />
            Stripe integration in test / placeholder mode
          </div>

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

            <button
              onClick={() => setSelectedPlan('pro')}
              className={`rounded-xl border-2 p-5 text-left transition-all relative ${
                selectedPlan === 'pro'
                  ? 'border-accent bg-accent/5 shadow-md'
                  : 'border-border hover:border-accent/50 bg-surface'
              }`}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="flex items-center gap-1 px-3 py-1 bg-accent text-white text-xs font-semibold rounded-full shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  Most popular
                </span>
              </div>
              <div className="flex items-center justify-between mb-1 mt-2">
                <h3 className="font-bold text-text-primary text-lg">Pro</h3>
                {selectedPlan === 'pro' && (
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" aria-hidden="true" />
                  </div>
                )}
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
            </button>
          </div>

          <div className="p-4 bg-surface-subtle rounded-xl mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-text-secondary" aria-hidden="true" />
              <span className="text-sm font-medium text-text-primary">Secure checkout via Stripe</span>
            </div>
            <p className="text-xs text-text-secondary">
              Your payment info is never stored on our servers. Processed securely by Stripe.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" size="lg" onClick={onClose} className="flex-1">
              Maybe later
            </Button>
            <Button
              variant="accent"
              size="lg"
              onClick={handleUpgrade}
              disabled={checkoutState === 'processing' || currentPlan === 'pro'}
              className="flex-2"
            >
              <CreditCard className="w-4 h-4 mr-2" aria-hidden="true" />
              {checkoutState === 'processing'
                ? 'Processing...'
                : currentPlan === 'pro'
                ? 'Already on Pro'
                : 'Upgrade to Pro — $49'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
