import { lazy } from 'react';

export const Home = lazy(() => import('../pages/Home').then((m) => ({ default: m.Home })));
export const Product = lazy(() => import('../pages/Product').then((m) => ({ default: m.Product })));
export const Templates = lazy(() => import('../pages/Templates').then((m) => ({ default: m.Templates })));
export const TemplateDetail = lazy(() => import('../pages/TemplateDetail').then((m) => ({ default: m.TemplateDetail })));
export const Login = lazy(() => import('../pages/Login').then((m) => ({ default: m.Login })));
export const Signup = lazy(() => import('../pages/Signup').then((m) => ({ default: m.Signup })));
export const Onboarding = lazy(() => import('../pages/Onboarding').then((m) => ({ default: m.Onboarding })));
export const WeddingStatus = lazy(() => import('../pages/onboarding/WeddingStatus').then((m) => ({ default: m.WeddingStatus })));
export const Celebration = lazy(() => import('../pages/onboarding/Celebration').then((m) => ({ default: m.Celebration })));
export const QuickStart = lazy(() => import('../pages/onboarding/QuickStart').then((m) => ({ default: m.QuickStart })));
export const GuidedSetup = lazy(() => import('../pages/onboarding/GuidedSetup').then((m) => ({ default: m.GuidedSetup })));
export const Privacy = lazy(() => import('../pages/Privacy').then((m) => ({ default: m.Privacy })));
export const Terms = lazy(() => import('../pages/Terms').then((m) => ({ default: m.Terms })));
export const Support = lazy(() => import('../pages/Support').then((m) => ({ default: m.Support })));
export const Refund = lazy(() => import('../pages/Refund').then((m) => ({ default: m.Refund })));
export const Trust = lazy(() => import('../pages/Trust').then((m) => ({ default: m.Trust })));
export const SetupShell = lazy(() => import('../pages/setup/SetupShell').then((m) => ({ default: m.SetupShell })));
export const RSVP = lazy(() => import('../pages/RSVP'));
export const EventRSVP = lazy(() => import('../pages/EventRSVP'));
export const GuestContactUpdate = lazy(() => import('../pages/GuestContactUpdate'));
export const GuestbookSubmit = lazy(() => import('../pages/GuestbookSubmit').then((m) => ({ default: m.GuestbookSubmit })));
export const SiteView = lazy(() => import('../pages/SiteView').then((m) => ({ default: m.SiteView })));
export const DashboardOverview = lazy(() => import('../pages/dashboard/Overview').then((m) => ({ default: m.DashboardOverview })));
export const DashboardGuests = lazy(() => import('../pages/dashboard/Guests').then((m) => ({ default: m.DashboardGuests })));
export const DashboardVault = lazy(() => import('../pages/dashboard/Vault').then((m) => ({ default: m.DashboardVault })));
export const DashboardRegistry = lazy(() => import('../pages/dashboard/Registry').then((m) => ({ default: m.DashboardRegistry })));
export const DashboardSettings = lazy(() => import('../pages/dashboard/Settings').then((m) => ({ default: m.DashboardSettings })));
export const DashboardMessages = lazy(() => import('../pages/dashboard/Messages').then((m) => ({ default: m.DashboardMessages })));
export const DashboardItinerary = lazy(() => import('../pages/dashboard/Itinerary').then((m) => ({ default: m.DashboardItinerary })));
export const DashboardPlanning = lazy(() => import('../pages/dashboard/Planning').then((m) => ({ default: m.DashboardPlanning })));
export const DashboardSeating = lazy(() => import('../pages/dashboard/Seating').then((m) => ({ default: m.DashboardSeating })));
export const DashboardSeatingLookup = lazy(() => import('../pages/dashboard/SeatingLookup').then((m) => ({ default: m.DashboardSeatingLookup })));
export const DashboardPhotos = lazy(() => import('../pages/dashboard/GuestPhotoSharing').then((m) => ({ default: m.GuestPhotoSharing })));
export const DashboardRsvpBoard = lazy(() => import('../pages/dashboard/RsvpBoard').then((m) => ({ default: m.DashboardRsvpBoard })));
export const DashboardCoordinatorMode = lazy(() => import('../pages/dashboard/CoordinatorMode').then((m) => ({ default: m.DashboardCoordinatorMode })));
export const DashboardErrorLogs = lazy(() => import('../pages/dashboard/ErrorLogs').then((m) => ({ default: m.DashboardErrorLogs })));
export const DashboardAuditLogs = lazy(() => import('../pages/dashboard/AuditLogs').then((m) => ({ default: m.DashboardAuditLogs })));
export const SiteBuilder = lazy(() => import('../builder/BuilderPage').then((m) => ({ default: m.BuilderPage })));
export const BuilderVariantGallery = lazy(() => import('../pages/dashboard/BuilderVariantGallery').then((m) => ({ default: m.BuilderVariantGallery })));
export const GuestsFeature = lazy(() => import('../pages/features/Guests').then((m) => ({ default: m.GuestsFeature })));
export const RSVPFeature = lazy(() => import('../pages/features/RSVP').then((m) => ({ default: m.RSVPFeature })));
export const MessagingFeature = lazy(() => import('../pages/features/Messaging').then((m) => ({ default: m.MessagingFeature })));
export const TravelFeature = lazy(() => import('../pages/features/Travel').then((m) => ({ default: m.TravelFeature })));
export const RegistryFeature = lazy(() => import('../pages/features/Registry').then((m) => ({ default: m.RegistryFeature })));
export const SeatingFeature = lazy(() => import('../pages/features/Seating').then((m) => ({ default: m.SeatingFeature })));
export const PaymentRequired = lazy(() => import('../pages/PaymentRequired').then((m) => ({ default: m.PaymentRequired })));
export const PaymentSuccess = lazy(() => import('../pages/PaymentSuccess').then((m) => ({ default: m.PaymentSuccess })));
export const VaultContribute = lazy(() => import('../pages/VaultContribute').then((m) => ({ default: m.VaultContribute })));
export const AcceptCollaboratorInvite = lazy(() => import('../pages/AcceptCollaboratorInvite').then((m) => ({ default: m.AcceptCollaboratorInvite })));
export const BuilderV2Lab = lazy(() => import('../pages/BuilderV2Lab').then((m) => ({ default: m.BuilderV2Lab })));
export const VariantPreviewCapture = lazy(() => import('../pages/VariantPreviewCapture'));
export const TemplateScrollCapture = lazy(() => import('../pages/TemplateScrollCapture'));
export const PhotoUpload = lazy(() => import('../pages/PhotoUpload').then((m) => ({ default: m.PhotoUpload })));
export const EventHub = lazy(() => import('../pages/EventHub').then((m) => ({ default: m.EventHub })));
export const EventRecap = lazy(() => import('../pages/EventRecap').then((m) => ({ default: m.EventRecap })));
export const VendorProfilePage = lazy(() => import('../pages/VendorProfile'));
export const VendorProfileCreatePage = lazy(() => import('../pages/VendorProfileCreate'));
export const VendorTemplates = lazy(() => import('../pages/VendorTemplates').then((m) => ({ default: m.VendorTemplates })));

export const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);
