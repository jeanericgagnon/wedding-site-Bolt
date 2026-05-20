import React, { useEffect, useState } from 'react';
import { X, Check, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import { createCheckoutSession } from '../../lib/stripeService';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { logAppAction } from '../../lib/actionAudit';

interface BillingModalProps {
  onClose: () => void;
  currentPlan?: 'free' | 'pro';
}

const PRO_FEATURES = [
  'Unlimited guests and RSVPs',
  'Personalized dayof wedding URL',
  'Photo & video vault (5 GB)',
  'Guest message templates',
  'Remove dayof branding',
  'Seating chart tools',
  'Planner collaboration access',
];

function safeBillingError(err: unknown): string {
  const fallback = 'Couldn’t start checkout. Please try again.';
  const raw = err instanceof Error ? err.message : '';
  if (raw === 'No wedding site found. Complete setup first.') {
    return 'No wedding site found. Complete setup first.';
  }
  return fallback;
}

export const BillingModal: React.FC<BillingModalProps> = ({ onClose, currentPlan = 'free' }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(false);
    setError(null);
  }, [currentPlan, user?.id]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleUpgrade = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const site = await resolveActiveSiteForUser(user.id);

      if (!site?.id) throw new Error('No wedding site found. Complete setup first.');

      const origin = window.location.origin;
      const url = await createCheckoutSession(
        site.id,
        `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        `${origin}/dashboard/overview`
      );
      void logAppAction({
        weddingSiteId: site.id,
        area: 'billing',
        type: 'one_time_checkout_started',
        summary: 'One-time checkout was started.',
        targetId: site.id,
        targetLabel: 'Full access checkout',
        metadata: {
          currentPlan,
        },
      });
      window.location.href = url;
    } catch (err) {
      setError(safeBillingError(err));
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
      <div className="bg-surface rounded-xl border border-border-subtle w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border-subtle">
          <div>
            <h2 id="billing-modal-title" className="text-xl font-bold text-text-primary">
              Everything included
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              Get the full wedding site, guest tools, memories, and planning suite in one payment.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-subtle rounded-xl transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-text-secondary" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-xl border border-border-subtle bg-surface-secondary/40 p-5 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="flex items-center gap-1 rounded-xl border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                One payment
              </span>
            </div>
            <div className="flex items-baseline gap-1 mb-1 mt-2">
              <span className="text-4xl font-bold text-text-primary">$49</span>
              <span className="text-text-secondary text-sm">two years included</span>
            </div>
            <p className="text-sm text-text-secondary mb-4">No subscription. One payment. Two years included.</p>
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
            <div className="flex items-start gap-2 p-3 bg-surface-secondary border border-border-subtle rounded-xl text-text-secondary text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-text-tertiary" />
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
                  Included already
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
                  Continue for $49
                </>
              )}
            </Button>
          </div>

          <p className="text-center text-xs text-text-tertiary">
            Secure checkout. No subscription.
          </p>
        </div>
      </div>
    </div>
  );
};
