import {
  canManageCoordinatorCheckIn,
  canManageCoordinatorQna,
  canManageCoordinatorTimeline,
  canScheduleCoordinatorAlerts,
  canSendImmediateCoordinatorAlerts,
} from '../../../lib/coordinatorRoleAccess';
import type { PlannerAccessRole, PlannerPermissionKey } from '../../../lib/plannerAccess';

type Args = {
  coordinatorPermissions: PlannerPermissionKey[] | null;
  coordinatorRole: PlannerAccessRole;
};

export function buildCoordinatorDashboardRouteSupport({
  coordinatorPermissions,
  coordinatorRole,
}: Args) {
  const canCheckIn = canManageCoordinatorCheckIn(coordinatorRole, coordinatorPermissions);
  const canEditQna = canManageCoordinatorQna(coordinatorRole, coordinatorPermissions);
  const canEditTimeline = canManageCoordinatorTimeline(coordinatorRole, coordinatorPermissions);
  const canSendAlerts = canSendImmediateCoordinatorAlerts(coordinatorRole, coordinatorPermissions);
  const canScheduleAlerts = canScheduleCoordinatorAlerts(coordinatorRole, coordinatorPermissions);

  return {
    canCheckIn,
    canEditQna,
    canEditTimeline,
    canScheduleAlerts,
    canSendAlerts,
  };
}
