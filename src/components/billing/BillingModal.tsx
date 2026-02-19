import React, { useState } from 'react';
import { X, Check, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { createCheckoutSession } from '../../lib/stripeService';

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
  'Remove Dayof branding',
  'Scheduled messaging',
  'Seating chart tools',
];

export const BillingModal: React.FC<BillingModalProps> = ({ onClose, currentPlan = 'free' }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleUpgrade = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: site } = await supabase
        .from('wedding_sites')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!site?.id) throw new Error('No wedding site found. Complete setup first.');

      const origin = window.location.origin;
      const url = await createCheckoutSession(
        site.id,
        `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        `${origin}/dashboard/overview`
      );
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout. Please try again.');
      setLoading(false);
    }
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
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border-subtle">
          <div>
            <h2 id="billing-modal-title" className="text-xl font-bold text-text-primary">
              Unlock Full Access
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

        <div className="p-6 space-y-5">
          <div className="rounded-xl border-2 border-accent/30 bg-accent/3 p-5 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="flex items-center gap-1 px-3 py-1 bg-accent text-white text-xs font-semibold rounded-full shadow-sm">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                One-time payment
              </span>
            </div>
            <div className="flex items-baseline gap-1 mb-1 mt-2">
              <span className="text-4xl font-bold text-text-primary">$49</span>
              <span className="text-text-secondary text-sm">one-time · 2-year access</span>
            </div>
            <p className="text-sm text-text-secondary mb-4">No subscription. Pay once, use for 2 years.</p>
            <ul className="space-y-2.5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                  <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-error-light border border-error/20 rounded-lg text-error text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" size="lg" onClick={onClose} className="flex-1">
              Maybe later
            </Button>
            <Button
              variant="accent"
              size="lg"
              onClick={handleUpgrade}
              disabled={loading || currentPlan === 'pro'}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Redirecting...
                </>
              ) : currentPlan === 'pro' ? (
                <>
                  <Check className="w-4 h-4 mr-2" aria-hidden="true" />
                  Already active
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
                  Get Full Access — $49
                </>
              )}
            </Button>
          </div>

          <p className="text-center text-xs text-text-tertiary">
            Secure checkout via Stripe. No subscription required.
          </p>
        </div>
      </div>
    </div>
  );
};
