import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, CreditCard, Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { createCheckoutSession, fetchPaymentStatus, fetchWeddingSiteId, SessionExpiredError } from '../lib/stripeService';

const FEATURES = [
  'Your own wedding website with custom URL',
  'RSVP management for all your guests',
  'Registry with purchase tracking',
  'Guest messaging & communication tools',
  'Itinerary builder & schedule',
  'Drag-and-drop site builder',
];

export const PaymentRequired: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchWeddingSiteId(user.id).then(id => setWeddingSiteId(id)).catch(() => {});
  }, [user]);

  const handleCheckout = async () => {
    if (!user || !weddingSiteId) return;
    setLoading(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const url = await createCheckoutSession(
        weddingSiteId,
        `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        `${origin}/payment-required?canceled=1`
      );
      window.location.href = url;
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        navigate('/login?reason=session_expired', { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not start checkout. Please try again.');
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!user) return;
    setCheckingStatus(true);
    setError(null);
    try {
      const status = await fetchPaymentStatus(user.id);
      if (status === 'active') {
        navigate('/onboarding/status', { replace: true });
      } else {
        setError('Payment not confirmed yet. If you just paid, please wait a moment and try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check payment status.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const searchParams = new URLSearchParams(window.location.search);
  const isCanceled = searchParams.get('canceled') === '1';
  const isExpired = searchParams.get('reason') === 'expired';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface-subtle to-surface flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 rounded-2xl mb-4">
            <Heart className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            {isExpired ? 'Your Site Has Expired' : 'Complete Your Purchase'}
          </h1>
          <p className="text-text-secondary">
            {isExpired
              ? 'Your 2-year access has ended. Renew below or switch to annual billing.'
              : 'One-time payment — 2 years of access, no subscriptions required.'}
          </p>
        </div>

        <div className="bg-surface rounded-2xl shadow-lg border border-border overflow-hidden">
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 px-6 py-5 border-b border-border">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary mb-1">DayOf.Love — Complete Package</p>
                <p className="text-3xl font-bold text-text-primary">$49</p>
              </div>
              <span className="text-sm text-text-tertiary bg-surface px-3 py-1 rounded-full border border-border">
                One-time
              </span>
            </div>
          </div>

          <div className="px-6 py-5">
            <p className="text-sm font-medium text-text-secondary mb-3">Everything included:</p>
            <ul className="space-y-2.5 mb-6">
              {FEATURES.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-text-primary">
                  <Check className="w-4 h-4 text-success flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {isExpired && !error && !isCanceled && (
              <div className="flex items-start gap-2 p-3 bg-warning-light rounded-lg text-sm text-warning border border-warning/20 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Your 2-year access period ended. Renew for another 2 years, or switch to annual billing in settings after renewing.</span>
              </div>
            )}

            {isCanceled && !error && (
              <div className="flex items-start gap-2 p-3 bg-warning-light rounded-lg text-sm text-warning border border-warning/20 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Payment was canceled. You can try again whenever you're ready.</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-error-light rounded-lg text-sm text-error border border-error/20 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              variant="accent"
              size="lg"
              fullWidth
              onClick={handleCheckout}
              disabled={loading || !weddingSiteId}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Redirecting to checkout...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pay $49 — Get Started
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={checkingStatus}
              className="w-full mt-3 flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors py-2"
            >
              {checkingStatus ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Already paid? Check status
            </button>
          </div>

          <div className="px-6 py-4 bg-surface-subtle border-t border-border">
            <p className="text-xs text-text-tertiary text-center">
              Secure payment powered by Stripe. We never store your card details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
