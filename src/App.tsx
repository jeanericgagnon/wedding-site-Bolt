import { useState, useEffect } from 'react';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Onboarding } from './pages/Onboarding';
import {
  DashboardOverview,
  DashboardBuilder,
  DashboardGuests,
  DashboardVault,
  DashboardSettings,
} from './pages/dashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

type Route =
  | 'home'
  | 'login'
  | 'signup'
  | 'onboarding'
  | 'overview'
  | 'builder'
  | 'guests'
  | 'vault'
  | 'registry'
  | 'settings';

const AppContent = () => {
  const [currentRoute, setCurrentRoute] = useState<Route>('home');
  const { user, loading } = useAuth();

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || 'home';
      setCurrentRoute(hash as Route);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      if (currentRoute === 'login' || currentRoute === 'signup') {
        window.location.hash = '#overview';
      }
    }
  }, [user, loading, currentRoute]);

  const renderRoute = () => {
    switch (currentRoute) {
      case 'home':
        return <Home />;
      case 'login':
        return <Login />;
      case 'signup':
        return <Signup />;
      case 'onboarding':
        return (
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        );
      case 'overview':
        return (
          <ProtectedRoute>
            <DashboardOverview />
          </ProtectedRoute>
        );
      case 'builder':
        return (
          <ProtectedRoute>
            <DashboardBuilder />
          </ProtectedRoute>
        );
      case 'guests':
        return (
          <ProtectedRoute>
            <DashboardGuests />
          </ProtectedRoute>
        );
      case 'vault':
        return (
          <ProtectedRoute>
            <DashboardVault />
          </ProtectedRoute>
        );
      case 'settings':
        return (
          <ProtectedRoute>
            <DashboardSettings />
          </ProtectedRoute>
        );
      default:
        return <Home />;
    }
  };

  return <div className="min-h-screen">{renderRoute()}</div>;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
