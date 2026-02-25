import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { fetchPaymentStatus, verifyCheckoutSession } from '../lib/stripeService';

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 15;

export const PaymentSuccess: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'polling' | 'confirmed' | 'timeout'>('polling');
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!user) return;

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');

      // Fast-path: confirm directly with Stripe session id on return URL.
      if (sessionId) {
        try {
          const verified = await verifyCheckoutSession(sessionId);
          if (verified.paid) {
            setStatus('confirmed');
            setTimeout(() => navigate('/onboarding/status', { replace: true }), 1200);
            return;
          }
        } catch {
          // fall back to polling payment_status
        }
      }

      const poll = async () => {
        try {
          const paymentStatus = await fetchPaymentStatus(user.id);
          if (paymentStatus === 'active') {
            setStatus('confirmed');
            setTimeout(() => navigate('/onboarding/status', { replace: true }), 1500);
            return;
          }
        } catch {
          // silent — keep polling
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
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface-subtle to-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {status === 'polling' && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Confirming your payment...</h1>
            <p className="text-text-secondary">This usually takes just a moment. Please don't close this page.</p>
          </>
        )}

        {status === 'confirmed' && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-success/10 rounded-full mb-6">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Payment confirmed!</h1>
            <p className="text-text-secondary">Taking you to your dashboard...</p>
          </>
        )}

        {status === 'timeout' && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-warning/10 rounded-full mb-6">
              <AlertCircle className="w-10 h-10 text-warning" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Taking longer than expected</h1>
            <p className="text-text-secondary mb-6">
              Your payment may still be processing. Check back in a moment — if this persists, contact support.
            </p>
            <div className="flex flex-col gap-3">
              <Button variant="primary" size="md" onClick={() => window.location.reload()}>
                Check again
              </Button>
              <Button variant="ghost" size="md" onClick={() => navigate('/payment-required')}>
                Back to payment page
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
