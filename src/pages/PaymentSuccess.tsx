import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle, Heart } from 'lucide-react';
import { Button } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { fetchPaymentStatus, verifyCheckoutSession } from '../lib/stripeService';
import { clearAllOnboardingContinuationState } from '../lib/onboardingContinuationCleanup';

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 15;

export const PaymentSuccess: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'polling' | 'confirmed' | 'timeout'>('polling');
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/payment-required', { replace: true });
      return;
    }

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');

      // Fast-path: confirm directly with the return session id.
      if (sessionId) {
        try {
          const verified = await verifyCheckoutSession(sessionId);
          if (verified.paid) {
            clearAllOnboardingContinuationState();
            setStatus('confirmed');
            setTimeout(() => navigate('/onboarding/celebration?from=checkout', { replace: true }), 1200);
            return;
          }
        } catch {
          // fall back to polling payment_status
        }
      }

      const redirectToNextStep = (paymentStatus: string | null) => {
        clearAllOnboardingContinuationState();
        if (paymentStatus === 'active') {
          setStatus('confirmed');
          setTimeout(() => navigate('/onboarding/celebration?from=checkout', { replace: true }), 1200);
          return;
        }

        setTimeout(() => navigate('/dashboard/overview?from=payment-success', { replace: true }), 900);
      };

      if (!sessionId) {
        try {
          const paymentStatus = await fetchPaymentStatus(user.id);
          redirectToNextStep(paymentStatus);
          return;
        } catch {
          setTimeout(() => navigate('/dashboard/overview?from=payment-success', { replace: true }), 900);
          return;
        }
      }

      const poll = async () => {
        try {
          const paymentStatus = await fetchPaymentStatus(user.id);
          if (paymentStatus === 'active') {
            clearAllOnboardingContinuationState();
            setStatus('confirmed');
            setTimeout(() => navigate('/onboarding/celebration?from=checkout', { replace: true }), 1500);
            return;
          }
        } catch {
          // Keep polling while the payment status catches up.
        }

        attemptsRef.current += 1;
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setStatus('timeout');
          return;
        }

        setTimeout(poll, POLL_INTERVAL_MS);
      };

      setTimeout(poll, POLL_INTERVAL_MS);
    };

    run();
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(139,157,126,0.18),transparent_32%),linear-gradient(135deg,#faf7f1,#f6f1e8_42%,#fbfaf7)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-lg border border-border-subtle bg-white/88 p-8 text-center shadow-sm">
        <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-lg bg-surface-subtle">
          <Heart className="h-8 w-8 text-accent" />
        </div>

        {status === 'polling' && (
          <>
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-lg border border-border-subtle bg-surface-secondary">
              <Loader2 className="w-10 h-10 text-accent animate-spin" />
            </div>
            <h1 className="mb-2 text-3xl font-semibold text-text-primary">Confirming payment</h1>
            <p className="text-text-secondary">This usually takes just a moment. Please keep this page open.</p>
          </>
        )}

        {status === 'confirmed' && (
          <>
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-lg border border-border-subtle bg-surface-secondary">
              <CheckCircle2 className="w-10 h-10 text-accent" />
            </div>
            <h1 className="mb-2 text-3xl font-semibold text-text-primary">Payment confirmed</h1>
            <p className="text-text-secondary">Taking you into setup now.</p>
          </>
        )}

        {status === 'timeout' && (
          <>
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-lg border border-border-subtle bg-surface-secondary">
              <AlertCircle className="w-10 h-10 text-text-tertiary" />
            </div>
            <h1 className="mb-2 text-3xl font-semibold text-text-primary">Taking longer than expected</h1>
            <p className="mb-6 text-text-secondary">
              Your payment may still be processing. Check again in a moment, or contact support if it keeps happening.
            </p>
            <div className="flex flex-col gap-3">
              <Button variant="primary" size="md" onClick={() => window.location.reload()}>
                Check again
              </Button>
              <Button variant="ghost" size="md" onClick={() => { clearAllOnboardingContinuationState(); navigate('/payment-required'); }}>
                Back to payment page
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
