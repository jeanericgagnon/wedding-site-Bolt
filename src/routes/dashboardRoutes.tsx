import {
  BuilderVariantGallery,
  DashboardAuditLogs,
  DashboardCoordinatorMode,
  DashboardErrorLogs,
  DashboardGuests,
  DashboardItinerary,
  DashboardMessages,
  DashboardOverview,
  DashboardPhotos,
  DashboardPlanning,
  DashboardRegistry,
  DashboardRsvpBoard,
  DashboardSeating,
  DashboardSeatingLookup,
  DashboardSettings,
  DashboardVault,
  SiteBuilder,
} from './routePages';
import { ProtectedPageRoute } from './ProtectedPageRoute';

export function DashboardRoutes() {
  return (
    <>
      {ProtectedPageRoute({ path: '/dashboard', element: <DashboardOverview /> })}
      {ProtectedPageRoute({ path: '/dashboard/overview', element: <DashboardOverview /> })}
      {ProtectedPageRoute({ path: '/dashboard/builder', element: <SiteBuilder /> })}
      {ProtectedPageRoute({ path: '/dashboard/builder/variants', element: <BuilderVariantGallery /> })}
      {ProtectedPageRoute({ path: '/dashboard/guests', element: <DashboardGuests /> })}
      {ProtectedPageRoute({ path: '/dashboard/itinerary', element: <DashboardItinerary /> })}
      {ProtectedPageRoute({ path: '/dashboard/planning', element: <DashboardPlanning /> })}
      {ProtectedPageRoute({ path: '/dashboard/seating', element: <DashboardSeating /> })}
      {ProtectedPageRoute({ path: '/dashboard/seating-lookup', element: <DashboardSeatingLookup /> })}
      {ProtectedPageRoute({ path: '/dashboard/vault', element: <DashboardVault /> })}
      {ProtectedPageRoute({ path: '/dashboard/photos', element: <DashboardPhotos /> })}
      {ProtectedPageRoute({ path: '/dashboard/registry', element: <DashboardRegistry /> })}
      {ProtectedPageRoute({ path: '/dashboard/settings', element: <DashboardSettings /> })}
      {ProtectedPageRoute({ path: '/dashboard/messages', element: <DashboardMessages /> })}
      {ProtectedPageRoute({ path: '/dashboard/rsvp-board', element: <DashboardRsvpBoard /> })}
      {ProtectedPageRoute({ path: '/dashboard/coordinator', element: <DashboardCoordinatorMode /> })}
      {ProtectedPageRoute({ path: '/dashboard/audit-logs', element: <DashboardAuditLogs /> })}
      {ProtectedPageRoute({ path: '/admin/errors', element: <DashboardErrorLogs /> })}
      {ProtectedPageRoute({ path: '/builder', element: <SiteBuilder /> })}
    </>
  );
}
