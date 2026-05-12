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

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, skipPaymentGate = false }) => {
  const { user, loading, isDemoMode } = useAuth();
  const paymentGateEnabled = isPaymentGateEnabled();
  const paymentBypassAllowed = isPaymentBypassAllowed();
  const location = useLocation();
  const [billingInfo, setBillingInfo] = useState<BillingGateState>('loading');
  const [activeSiteRole, setActiveSiteRole] = useState<ActiveSiteRoleState>('loading');

  useEffect(() => {
    if (!user) {
      setBillingInfo(null);
      setActiveSiteRole(null);
      return;
    }

    if (isDemoMode) {
      setBillingInfo({ payment_status: 'active', billing_type: 'one_time', site_expires_at: null, paid_at: null, stripe_subscription_id: null, wedding_site_id: '' });
      setActiveSiteRole('owner');
      return;
    }

    setActiveSiteRole('loading');
    resolveActiveSiteRoleForUser(user.id).then(setActiveSiteRole).catch(() => setActiveSiteRole(null));
    fetchBillingInfo(user.id)
      .then(info => setBillingInfo(info))
      .catch(() => setBillingInfo('unavailable'));
  }, [user, isDemoMode]);

  const paymentGateNeedsRoleResolution = paymentGateEnabled && !skipPaymentGate && !isDemoMode;

  if (loading || billingInfo === 'loading' || (paymentGateNeedsRoleResolution && activeSiteRole === 'loading')) {
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
    const resolvedBillingInfo = billingInfo && billingInfo !== 'unavailable' ? billingInfo : null;

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
