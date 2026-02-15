import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home, Product } from './pages';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Onboarding } from './pages/Onboarding';
import {
  DashboardOverview,
  DashboardBuilder,
  DashboardGuests,
  DashboardVault,
  DashboardRegistry,
  DashboardSettings,
} from './pages/dashboard';
import {
  GuestsFeature,
  RSVPFeature,
  MessagingFeature,
  TravelFeature,
  RegistryFeature,
  SeatingFeature,
} from './pages/features';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const AppContent = () => {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product" element={<Product />} />
        <Route path="/features/guests" element={<GuestsFeature />} />
        <Route path="/features/rsvp" element={<RSVPFeature />} />
        <Route path="/features/messaging" element={<MessagingFeature />} />
        <Route path="/features/travel" element={<TravelFeature />} />
        <Route path="/features/registry" element={<RegistryFeature />} />
        <Route path="/features/seating" element={<SeatingFeature />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/overview"
          element={
            <ProtectedRoute>
              <DashboardOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/builder"
          element={
            <ProtectedRoute>
              <DashboardBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/guests"
          element={
            <ProtectedRoute>
              <DashboardGuests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/vault"
          element={
            <ProtectedRoute>
              <DashboardVault />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/registry"
          element={
            <ProtectedRoute>
              <DashboardRegistry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/settings"
          element={
            <ProtectedRoute>
              <DashboardSettings />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
