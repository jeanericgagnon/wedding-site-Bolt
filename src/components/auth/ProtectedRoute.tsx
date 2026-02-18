import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchPaymentStatus } from '../../lib/stripeService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipPaymentGate?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, skipPaymentGate = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [paymentStatus, setPaymentStatus] = useState<'payment_required' | 'active' | 'canceled' | null | 'loading'>('loading');

  useEffect(() => {
    if (!user) {
      setPaymentStatus(null);
      return;
    }
    fetchPaymentStatus(user.id)
      .then(status => setPaymentStatus(status))
      .catch(() => setPaymentStatus('active'));
  }, [user]);

  if (loading || paymentStatus === 'loading') {
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
    return <Navigate to="/login" replace />;
  }

  if (!skipPaymentGate && paymentStatus === 'payment_required') {
    const isPaymentRoute = location.pathname.startsWith('/payment');
    if (!isPaymentRoute) {
      return <Navigate to="/payment-required" replace />;
    }
  }

  return <>{children}</>;
};
