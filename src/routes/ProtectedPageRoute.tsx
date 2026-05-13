import type { ReactNode } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

type ProtectedPageRouteProps = {
  path: string;
  element: ReactNode;
  skipPaymentGate?: boolean;
};

export function ProtectedPageRoute({
  path,
  element,
  skipPaymentGate = false,
}: ProtectedPageRouteProps) {
  return (
    <Route
      path={path}
      element={(
        <ProtectedRoute skipPaymentGate={skipPaymentGate}>
          {element}
        </ProtectedRoute>
      )}
    />
  );
}
