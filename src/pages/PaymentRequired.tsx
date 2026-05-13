import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, CreditCard, Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { createCheckoutSession, fetchPaymentStatus, SessionExpiredError } from '../lib/stripeService';
import { isPaymentBypassAllowed } from '../lib/paymentGate';
import { clearAllOnboardingContinuationState } from '../lib/onboardingContinuationCleanup';
import { ensureMinimalPaymentWeddingSite } from './paymentRequiredService';

const FEATURES = [
  'A polished wedding site you can keep editing',
  'RSVPs, guest details, and private guest links',
  'Registry, photos, guestbook, and vault',
  'Message drafts and reminders you review first',
  'Schedule, seating, and planning tools',
  'A visual site editor for the pieces guests will see',
];

function safePaymentError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : '';
  if (raw === 'Couldn’t create your website record right now. Please refresh and try again.') {
    return 'Couldn’t create your website record right now. Please refresh and try again.';
  }
  return fallback;
}

export const PaymentRequired: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const paymentBypassAllowed = isPaymentBypassAllowed();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (isDemoMode) {
      setWeddingSiteId('demo-site-id');
      return;
    }

    ensureMinimalPaymentWeddingSite(user.id, user.email)
      .then(id => setWeddingSiteId(id))
      .catch((err: unknown) => {
        setError(safePaymentError(err, 'Couldn’t finish setting up your account right now.'));
      });
  }, [isDemoMode, user]);

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
      setError(safePaymentError(err, 'Couldn’t start checkout right now. Please try again.'));
      setLoading(false);
    }
  };

  const handleBypassForNow = () => {
    if (typeof window !== 'undefined') {
      clearAllOnboardingContinuationState();
      window.location.assign('/onboarding/celebration?bypassPayment=1');
      return;
    }
    clearAllOnboardingContinuationState();
    navigate('/onboarding/celebration?bypassPayment=1', { replace: true });
  };

  const handleCheckStatus = async () => {
    if (!user) return;
    setCheckingStatus(true);
    setError(null);
    try {
      const status = await fetchPaymentStatus(user.id);
      if (status === 'active') {
        clearAllOnboardingContinuationState();
        navigate('/onboarding/celebration?from=payment', { replace: true });
      } else {
        setError('Payment not confirmed yet. If you just paid, please wait a moment and try again.');
      }
    } catch (err) {
      setError(safePaymentError(err, 'Couldn’t check payment status right now.'));
    } finally {
      setCheckingStatus(false);
    }
  };

  const searchParams = new URLSearchParams(window.location.search);
  const isCanceled = searchParams.get('canceled') === '1';
  const isExpired = searchParams.get('reason') === 'expired';
  const isBillingUnavailable = searchParams.get('reason') === 'billing_unavailable';
  const isNewSignup = searchParams.get('signup') === '1' || searchParams.get('oauth') === 'google';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(139,157,126,0.18),transparent_32%),linear-gradient(135deg,#faf7f1,#f6f1e8_42%,#fbfaf7)] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-lg border border-border-subtle bg-white/82">
            <Heart className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-4xl font-semibold leading-tight text-text-primary">
            {isBillingUnavailable ? 'We could not verify billing right now' : isExpired ? 'Keep your wedding space open' : 'Start with the full wedding suite'}
          </h1>
          <p className="mt-4 text-base leading-7 text-text-secondary">
            {isBillingUnavailable
              ? 'Your account is still protected, but billing status could not be confirmed. Please retry below before continuing into paid areas.'
              : isExpired
              ? 'Your two-year access period has ended. Renew here, then your site, guest details, and planning tools reopen where you left them.'
              : 'Your account is ready. After payment, we’ll take you into setup and help shape the first version together.'}
          </p>
        </div>

        <div className="grid overflow-hidden rounded-lg border border-border-subtle bg-white/88 lg:grid-cols-[1fr_0.82fr]">
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border-subtle pb-6">
              <div>
                <p className="text-sm font-medium text-text-secondary">dayof full access</p>
                <p className="mt-2 text-4xl font-semibold text-text-primary">$49</p>
                <p className="mt-1 text-sm text-text-secondary">One payment for two years of access.</p>
              </div>
              <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1.5 text-sm text-text-secondary">
                No surprise renewals
              </span>
            </div>

            <p className="mt-6 text-sm font-medium text-text-secondary">Included from the start</p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {FEATURES.map(f => (
                <li key={f} className="flex items-start gap-3 rounded-lg border border-border-subtle bg-surface-subtle/60 px-4 py-3 text-sm leading-6 text-text-primary">
                  <Check className="mt-1 w-4 h-4 text-accent flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-border-subtle bg-surface-subtle/40 p-6 sm:p-8 lg:border-l lg:border-t-0">
            {isNewSignup && !error && !isCanceled && !isExpired && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-secondary p-3 text-sm text-text-secondary">
                <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-accent" />
                <span>Your account is saved. Complete payment to open setup and publishing.</span>
              </div>
            )}

            {isExpired && !error && !isCanceled && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-secondary p-3 text-sm text-text-secondary">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-text-tertiary" />
                <span>Your access period ended. Renew for another two years, then adjust billing preferences in settings.</span>
              </div>
            )}

            {isBillingUnavailable && !error && !isCanceled && !isExpired && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-secondary p-3 text-sm text-text-secondary">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-text-tertiary" />
                <span>Billing status is temporarily unavailable. Retry status below or reopen checkout before returning to paid dashboard areas.</span>
              </div>
            )}

            {isCanceled && !error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-secondary p-3 text-sm text-text-secondary">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-text-tertiary" />
                <span>Payment was canceled. You can try again whenever you're ready.</span>
              </div>
            )}

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-secondary p-3 text-sm text-text-secondary">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-text-tertiary" />
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
                  Pay $49 and continue
                </>
              )}
            </Button>

            {paymentBypassAllowed && (
              <Button
                variant="outline"
                size="lg"
                fullWidth
                onClick={handleBypassForNow}
                disabled={loading || checkingStatus}
                className="mt-3"
              >
                Continue without payment for now
              </Button>
            )}

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

            <p className="mt-6 text-center text-xs leading-5 text-text-tertiary">
              Secure payment. We never store your card details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
