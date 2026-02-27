import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ToastProvider } from './components/ui/Toast';

const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Product = lazy(() => import('./pages/Product').then(m => ({ default: m.Product })));
const Templates = lazy(() => import('./pages/Templates').then(m => ({ default: m.Templates })));
const TemplateDetail = lazy(() => import('./pages/TemplateDetail').then(m => ({ default: m.TemplateDetail })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Signup').then(m => ({ default: m.Signup })));
const Onboarding = lazy(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })));
const WeddingStatus = lazy(() => import('./pages/onboarding/WeddingStatus').then(m => ({ default: m.WeddingStatus })));
const Celebration = lazy(() => import('./pages/onboarding/Celebration').then(m => ({ default: m.Celebration })));
const QuickStart = lazy(() => import('./pages/onboarding/QuickStart').then(m => ({ default: m.QuickStart })));
const GuidedSetup = lazy(() => import('./pages/onboarding/GuidedSetup').then(m => ({ default: m.GuidedSetup })));
const SetupShell = lazy(() => import('./pages/setup/SetupShell').then(m => ({ default: m.SetupShell })));
const RSVP = lazy(() => import('./pages/RSVP'));
const EventRSVP = lazy(() => import('./pages/EventRSVP'));
const GuestContactUpdate = lazy(() => import('./pages/GuestContactUpdate'));
const SiteView = lazy(() => import('./pages/SiteView').then(m => ({ default: m.SiteView })));
const DashboardOverview = lazy(() => import('./pages/dashboard/Overview').then(m => ({ default: m.DashboardOverview })));
const DashboardGuests = lazy(() => import('./pages/dashboard/Guests').then(m => ({ default: m.DashboardGuests })));
const DashboardVault = lazy(() => import('./pages/dashboard/Vault').then(m => ({ default: m.DashboardVault })));
const DashboardRegistry = lazy(() => import('./pages/dashboard/Registry').then(m => ({ default: m.DashboardRegistry })));
const DashboardSettings = lazy(() => import('./pages/dashboard/Settings').then(m => ({ default: m.DashboardSettings })));
const DashboardMessages = lazy(() => import('./pages/dashboard/Messages').then(m => ({ default: m.DashboardMessages })));
const DashboardItinerary = lazy(() => import('./pages/dashboard/Itinerary').then(m => ({ default: m.DashboardItinerary })));
const DashboardPlanning = lazy(() => import('./pages/dashboard/Planning').then(m => ({ default: m.DashboardPlanning })));
const DashboardSeating = lazy(() => import('./pages/dashboard/Seating').then(m => ({ default: m.DashboardSeating })));
const DashboardPhotos = lazy(() => import('./pages/dashboard/GuestPhotoSharing').then(m => ({ default: m.GuestPhotoSharing })));
const SiteBuilder = lazy(() => import('./builder/BuilderPage').then(m => ({ default: m.BuilderPage })));
const GuestsFeature = lazy(() => import('./pages/features/Guests').then(m => ({ default: m.GuestsFeature })));
const RSVPFeature = lazy(() => import('./pages/features/RSVP').then(m => ({ default: m.RSVPFeature })));
const MessagingFeature = lazy(() => import('./pages/features/Messaging').then(m => ({ default: m.MessagingFeature })));
const TravelFeature = lazy(() => import('./pages/features/Travel').then(m => ({ default: m.TravelFeature })));
const RegistryFeature = lazy(() => import('./pages/features/Registry').then(m => ({ default: m.RegistryFeature })));
const SeatingFeature = lazy(() => import('./pages/features/Seating').then(m => ({ default: m.SeatingFeature })));
const PaymentRequired = lazy(() => import('./pages/PaymentRequired').then(m => ({ default: m.PaymentRequired })));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess').then(m => ({ default: m.PaymentSuccess })));
const VaultContribute = lazy(() => import('./pages/VaultContribute').then(m => ({ default: m.VaultContribute })));
const BuilderV2Lab = lazy(() => import('./pages/BuilderV2Lab').then(m => ({ default: m.BuilderV2Lab })));
const PhotoUpload = lazy(() => import('./pages/PhotoUpload').then(m => ({ default: m.PhotoUpload })));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const AppContent = () => {
  const isWeddingSubdomainHost = (() => {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname.toLowerCase();
    if (!host.endsWith('dayof.love')) return false;
    const parts = host.split('.');
    if (parts.length < 3) return false;
    const sub = parts[0];
    return Boolean(sub) && sub !== 'www';
  })();

  return (
    <div className="min-h-screen">
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={isWeddingSubdomainHost ? <SiteView /> : <Home />} />
        <Route path="/product" element={<Product />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/templates/:templateId" element={<TemplateDetail />} />
        <Route path="/builder-v2-lab" element={<BuilderV2Lab />} />
        <Route path="/site/:slug" element={<SiteView />} />
        <Route path="/vault/:siteSlug" element={<VaultContribute />} />
        <Route path="/vault/:siteSlug/:year" element={<VaultContribute />} />
        <Route path="/photos/upload" element={<PhotoUpload />} />
        <Route path="/rsvp" element={<RSVP />} />
        <Route path="/events" element={<EventRSVP />} />
        <Route path="/guest-contact/:token" element={<GuestContactUpdate />} />
        <Route path="/features/guests" element={<GuestsFeature />} />
        <Route path="/features/rsvp" element={<RSVPFeature />} />
        <Route path="/features/messaging" element={<MessagingFeature />} />
        <Route path="/features/travel" element={<TravelFeature />} />
        <Route path="/features/registry" element={<RegistryFeature />} />
        <Route path="/features/seating" element={<SeatingFeature />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/payment-required"
          element={
            <ProtectedRoute skipPaymentGate>
              <PaymentRequired />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/success"
          element={
            <ProtectedRoute skipPaymentGate>
              <PaymentSuccess />
            </ProtectedRoute>
          }
        />
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
          path="/setup"
          element={
            <ProtectedRoute>
              <SetupShell />
            </ProtectedRoute>
          }
        />
        <Route
          path="/setup/:step"
          element={
            <ProtectedRoute>
              <SetupShell />
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
              <Navigate to="/builder" replace />
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
          path="/dashboard/planning"
          element={
            <ProtectedRoute>
              <DashboardPlanning />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/seating"
          element={
            <ProtectedRoute>
              <DashboardSeating />
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
          path="/dashboard/photos"
          element={
            <ProtectedRoute>
              <DashboardPhotos />
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
        <Route
          path="/builder"
          element={
            <ProtectedRoute>
              <SiteBuilder />
            </ProtectedRoute>
          }
        />
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
