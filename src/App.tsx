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

function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>('home');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || 'home';
      setCurrentRoute(hash as Route);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderRoute = () => {
    switch (currentRoute) {
      case 'home':
        return <Home />;
      case 'login':
        return <Login />;
      case 'signup':
        return <Signup />;
      case 'onboarding':
        return <Onboarding />;
      case 'overview':
        return <DashboardOverview />;
      case 'builder':
        return <DashboardBuilder />;
      case 'guests':
        return <DashboardGuests />;
      case 'vault':
        return <DashboardVault />;
      case 'settings':
        return <DashboardSettings />;
      default:
        return <Home />;
    }
  };

  return <div className="min-h-screen">{renderRoute()}</div>;
}

export default App;
