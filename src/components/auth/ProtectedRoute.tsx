import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchBillingInfo, isSiteExpired, type BillingInfo } from '../../lib/stripeService';
import { resolveActiveSiteRoleForUser } from '../../lib/activeSite';
import { isPaymentBypassAllowed, isPaymentGateEnabled } from '../../lib/paymentGate';

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipPaymentGate?: boolean;
}

type BillingGateState = BillingInfo | null | 'loading' | 'unavailable';
type ActiveSiteRoleState = 'loading' | 'owner' | 'planner' | 'coordinator' | 'viewer' | null;

function isResolvedBillingInfo(value: BillingGateState): value is BillingInfo {
  return Boolean(value) && value !== 'loading' && value !== 'unavailable';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, skipPaymentGate = false }) => {
  const { user, loading, isDemoMode } = useAuth();
  const paymentGateEnabled = isPaymentGateEnabled();
  const paymentBypassAllowed = isPaymentBypassAllowed();
  const location = useLocation();
  const [billingInfo, setBillingInfo] = useState<BillingGateState>('loading');
  const [activeSiteRole, setActiveSiteRole] = useState<ActiveSiteRoleState>('loading');

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setBillingInfo(null);
      setActiveSiteRole(null);
      return () => {
        cancelled = true;
      };
    }

    if (isDemoMode) {
      setBillingInfo({ payment_status: 'active', billing_type: 'one_time', site_expires_at: null, paid_at: null, stripe_subscription_id: null, wedding_site_id: '' });
      setActiveSiteRole('owner');
      return () => {
        cancelled = true;
      };
    }

    if (skipPaymentGate || !paymentGateEnabled) {
      setBillingInfo(null);
      setActiveSiteRole(null);
      return () => {
        cancelled = true;
      };
    }

    setActiveSiteRole('loading');
    setBillingInfo('loading');
    resolveActiveSiteRoleForUser(user.id)
      .then((role) => {
        if (!cancelled) setActiveSiteRole(role);
      })
      .catch(() => {
        if (!cancelled) setActiveSiteRole(null);
      });
    fetchBillingInfo(user.id)
      .then((info) => {
        if (!cancelled) setBillingInfo(info);
      })
      .catch(() => {
        if (!cancelled) setBillingInfo('unavailable');
      });

    return () => {
      cancelled = true;
    };
  }, [user, isDemoMode, paymentGateEnabled, skipPaymentGate]);

  const paymentGateNeedsRoleResolution = paymentGateEnabled && !skipPaymentGate && !isDemoMode;

  if (loading || (!skipPaymentGate && paymentGateEnabled && billingInfo === 'loading') || (paymentGateNeedsRoleResolution && activeSiteRole === 'loading')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const bypassPayment = paymentBypassAllowed && new URLSearchParams(location.search).get('bypassPayment') === '1';
    const allowQuickStartPreview = bypassPayment && location.pathname === '/onboarding/quick-start';

    if (allowQuickStartPreview) {
      return <>{children}</>;
    }

    return <Navigate to="/login" replace />;
  }

  if (paymentGateEnabled && !skipPaymentGate && !isDemoMode && activeSiteRole !== 'planner' && activeSiteRole !== 'coordinator' && activeSiteRole !== 'viewer') {
    const isPaymentRoute = location.pathname.startsWith('/payment');
    const bypassPayment = paymentBypassAllowed && new URLSearchParams(location.search).get('bypassPayment') === '1';
    const resolvedBillingInfo = isResolvedBillingInfo(billingInfo) ? billingInfo : null;

    if (billingInfo === 'unavailable' && !isPaymentRoute && !bypassPayment) {
      return <Navigate to="/payment-required?reason=billing_unavailable" replace />;
    }

    if (resolvedBillingInfo?.payment_status === 'payment_required' && !isPaymentRoute && !bypassPayment) {
      return <Navigate to="/payment-required" replace />;
    }

    if (
      resolvedBillingInfo?.payment_status === 'active' &&
      resolvedBillingInfo.billing_type === 'one_time' &&
      isSiteExpired(resolvedBillingInfo.site_expires_at) &&
      !isPaymentRoute
    ) {
      return <Navigate to="/payment-required?reason=expired" replace />;
    }
  }

  return <>{children}</>;
};
