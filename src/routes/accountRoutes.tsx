import { Route } from 'react-router-dom';
import { Login, PaymentRequired, PaymentSuccess, VendorProfileCreatePage, VendorTemplates } from './routePages';
import { ProtectedPageRoute } from './ProtectedPageRoute';

export function AccountRoutes() {
  return (
    <>
      <Route path="/login" element={<Login />} />
      {ProtectedPageRoute({ path: '/vendor-templates', element: <VendorTemplates /> })}
      {ProtectedPageRoute({ path: '/vendor-profile-v1', element: <VendorProfileCreatePage /> })}
      {ProtectedPageRoute({ path: '/payment-required', element: <PaymentRequired />, skipPaymentGate: true })}
      {ProtectedPageRoute({ path: '/payment/success', element: <PaymentSuccess />, skipPaymentGate: true })}
    </>
  );
}
