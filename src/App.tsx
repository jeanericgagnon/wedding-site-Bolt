import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { useInternalToolingRouteAccess } from './lib/internalToolingRoutes';
import { resolveWeddingSubdomainSlugFromHostname } from './lib/publicSiteSlug';
import { AccountRoutes } from './routes/accountRoutes';
import { DashboardRoutes } from './routes/dashboardRoutes';
import { GuestRoutes } from './routes/guestRoutes';
import { InternalToolingRoutes } from './routes/internalToolingRoutes';
import { OnboardingRoutes } from './routes/onboardingRoutes';
import { PublicRoutes } from './routes/publicRoutes';
import { PageLoader } from './routes/routePages';

const AppContent = () => {
  const isWeddingSubdomainHost = (() => {
    if (typeof window === 'undefined') return false;
    return Boolean(resolveWeddingSubdomainSlugFromHostname(window.location.hostname));
  })();
  const {
    internalToolingRoutesEnabled,
    internalToolingRoutesLoading,
  } = useInternalToolingRouteAccess();

  return (
    <div className="min-h-screen">
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {PublicRoutes({ isWeddingSubdomainHost })}
        {InternalToolingRoutes({
          internalToolingRoutesEnabled,
          internalToolingRoutesLoading,
        })}
        {GuestRoutes()}
        {AccountRoutes()}
        {OnboardingRoutes()}
        {DashboardRoutes()}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <AppContent />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
