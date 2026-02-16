import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home, Product } from './pages';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Onboarding } from './pages/Onboarding';
import { WeddingStatus } from './pages/onboarding/WeddingStatus';
import { Celebration } from './pages/onboarding/Celebration';
import { QuickStart } from './pages/onboarding/QuickStart';
import { GuidedSetup } from './pages/onboarding/GuidedSetup';
import RSVP from './pages/RSVP';
import EventRSVP from './pages/EventRSVP';
import {
  DashboardOverview,
  DashboardBuilder,
  DashboardGuests,
  DashboardVault,
  DashboardRegistry,
  DashboardSettings,
  DashboardMessages,
  DashboardItinerary,
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
        <Route path="/rsvp" element={<RSVP />} />
        <Route path="/events" element={<EventRSVP />} />
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
          path="/onboarding/status"
          element={
            <ProtectedRoute>
              <WeddingStatus />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding/celebration"
          element={
            <ProtectedRoute>
              <Celebration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding/quick-start"
          element={
            <ProtectedRoute>
              <QuickStart />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding/guided"
          element={
            <ProtectedRoute>
              <GuidedSetup />
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
          path="/dashboard/itinerary"
          element={
            <ProtectedRoute>
              <DashboardItinerary />
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
        <Route
          path="/dashboard/messages"
          element={
            <ProtectedRoute>
              <DashboardMessages />
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
