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

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, skipPaymentGate = false }) => {
  const { user, loading, isDemoMode } = useAuth();
  const paymentGateEnabled = isPaymentGateEnabled();
  const paymentBypassAllowed = isPaymentBypassAllowed();
  const location = useLocation();
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null | 'loading'>('loading');
  const [activeSiteRole, setActiveSiteRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setBillingInfo(null);
      return;
    }

    if (isDemoMode) {
      setBillingInfo({ payment_status: 'active', billing_type: 'one_time', site_expires_at: null, paid_at: null, stripe_subscription_id: null, wedding_site_id: '' });
      return;
    }

    resolveActiveSiteRoleForUser(user.id).then(setActiveSiteRole).catch(() => setActiveSiteRole(null));
    fetchBillingInfo(user.id)
      .then(info => setBillingInfo(info))
      .catch(() => setBillingInfo({ payment_status: 'active', billing_type: 'one_time', site_expires_at: null, paid_at: null, stripe_subscription_id: null, wedding_site_id: '' }));
  }, [user, isDemoMode]);

  if (loading || billingInfo === 'loading') {
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

    if (billingInfo?.payment_status === 'payment_required' && !isPaymentRoute && !bypassPayment) {
      return <Navigate to="/payment-required" replace />;
    }

    if (
      billingInfo?.payment_status === 'active' &&
      billingInfo.billing_type === 'one_time' &&
      isSiteExpired(billingInfo.site_expires_at) &&
      !isPaymentRoute
    ) {
      return <Navigate to="/payment-required?reason=expired" replace />;
    }
  }

  return <>{children}</>;
};
