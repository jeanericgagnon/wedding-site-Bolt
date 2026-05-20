import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle, Heart } from 'lucide-react';
import { Button } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { fetchPaymentStatus, SessionExpiredError, verifyCheckoutSession } from '../lib/stripeService';
import { clearAllOnboardingContinuationState } from '../lib/onboardingContinuationCleanup';

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 15;

export const PaymentSuccess: React.FC = () => {
  const { user, loading } = useAuth();
  const onboardingStorageScope = user?.id ?? null;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'polling' | 'confirmed' | 'timeout'>('polling');
  const attemptsRef = useRef(0);
  const navTimeoutRef = useRef<number | null>(null);
  const pollTimeoutRef = useRef<number | null>(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    attemptsRef.current = 0;
    setStatus('polling');
  }, [sessionId]);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;

    const clearTimers = () => {
      if (navTimeoutRef.current) window.clearTimeout(navTimeoutRef.current);
      if (pollTimeoutRef.current) window.clearTimeout(pollTimeoutRef.current);
    };

    const scheduleNavigation = (to: string, delayMs: number) => {
      if (navTimeoutRef.current) window.clearTimeout(navTimeoutRef.current);
      navTimeoutRef.current = window.setTimeout(() => {
        if (cancelled) return;
        navigate(to, { replace: true });
      }, delayMs);
    };

    const recoverExpiredSession = () => {
      if (cancelled) return;
      clearTimers();
      navigate('/login?reason=session_expired', { replace: true });
    };

    if (!user) {
      navigate('/payment-required', { replace: true });
      return () => {
        cancelled = true;
        clearTimers();
      };
    }

    const run = async () => {
      // Fast-path: confirm directly with the return session id.
      if (sessionId) {
        try {
          const verified = await verifyCheckoutSession(sessionId);
          if (cancelled) return;
          if (verified.paid) {
            clearAllOnboardingContinuationState(onboardingStorageScope);
            setStatus('confirmed');
            scheduleNavigation('/onboarding/celebration?from=checkout', 1200);
            return;
          }
        } catch (err) {
          if (err instanceof SessionExpiredError) {
            recoverExpiredSession();
            return;
          }
          // fall back to polling payment_status
        }
      }

      const redirectToNextStep = (paymentStatus: string | null) => {
        if (cancelled) return;
        clearAllOnboardingContinuationState(onboardingStorageScope);
        if (paymentStatus === 'active') {
          setStatus('confirmed');
          scheduleNavigation('/onboarding/celebration?from=checkout', 1200);
          return;
        }

        scheduleNavigation('/dashboard/overview?from=payment-success', 900);
      };

      if (!sessionId) {
        try {
          const paymentStatus = await fetchPaymentStatus(user.id);
          if (cancelled) return;
          redirectToNextStep(paymentStatus);
          return;
        } catch (err) {
          if (cancelled) return;
          if (err instanceof SessionExpiredError) {
            recoverExpiredSession();
            return;
          }
          scheduleNavigation('/dashboard/overview?from=payment-success', 900);
          return;
        }
      }

      const poll = async () => {
        try {
          const paymentStatus = await fetchPaymentStatus(user.id);
          if (cancelled) return;
          if (paymentStatus === 'active') {
            clearAllOnboardingContinuationState(onboardingStorageScope);
            setStatus('confirmed');
            scheduleNavigation('/onboarding/celebration?from=checkout', 1500);
            return;
          }
        } catch (err) {
          if (err instanceof SessionExpiredError) {
            recoverExpiredSession();
            return;
          }
          // Keep polling while the payment status catches up.
        }

        if (cancelled) return;
        attemptsRef.current += 1;
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setStatus('timeout');
          return;
        }

        pollTimeoutRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);
      };

      pollTimeoutRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    void run();
    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [onboardingStorageScope, user, loading, navigate, sessionId]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(139,157,126,0.18),transparent_32%),linear-gradient(135deg,#faf7f1,#f6f1e8_42%,#fbfaf7)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl border border-border-subtle bg-white/88 p-8 text-center shadow-sm">
        <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-surface-subtle">
          <Heart className="h-8 w-8 text-accent" />
        </div>

        {status === 'polling' && (
          <>
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl border border-border-subtle bg-surface-secondary">
              <Loader2 className="w-10 h-10 text-accent animate-spin" />
            </div>
            <h1 className="mb-2 text-3xl font-semibold text-text-primary">Confirming payment</h1>
            <p className="text-text-secondary">This usually takes just a moment. Please keep this page open.</p>
          </>
        )}

        {status === 'confirmed' && (
          <>
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl border border-border-subtle bg-surface-secondary">
              <CheckCircle2 className="w-10 h-10 text-accent" />
            </div>
            <h1 className="mb-2 text-3xl font-semibold text-text-primary">Payment confirmed</h1>
            <p className="text-text-secondary">Taking you into setup now.</p>
          </>
        )}

        {status === 'timeout' && (
          <>
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl border border-border-subtle bg-surface-secondary">
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
              <Button variant="ghost" size="md" onClick={() => { clearAllOnboardingContinuationState(onboardingStorageScope); navigate('/payment-required'); }}>
                Back to payment page
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
