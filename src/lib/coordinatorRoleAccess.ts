import { hasPlannerPermission, type PlannerAccessRole, type PlannerPermissionKey } from './plannerAccess';

export const canManageCoordinatorCheckIn = (role: PlannerAccessRole, permissions?: PlannerPermissionKey[] | null) =>
  hasPlannerPermission(role, permissions, 'coordinator') || hasPlannerPermission(role, permissions, 'guests');
export const canManageCoordinatorTimeline = (role: PlannerAccessRole, permissions?: PlannerPermissionKey[] | null) =>
  hasPlannerPermission(role, permissions, 'timeline') || hasPlannerPermission(role, permissions, 'coordinator');
export const canManageCoordinatorQna = (role: PlannerAccessRole, permissions?: PlannerPermissionKey[] | null) =>
  hasPlannerPermission(role, permissions, 'coordinator');
export const canSendImmediateCoordinatorAlerts = (role: PlannerAccessRole, permissions?: PlannerPermissionKey[] | null) =>
  hasPlannerPermission(role, permissions, 'coordinator');
export const canScheduleCoordinatorAlerts = (role: PlannerAccessRole, permissions?: PlannerPermissionKey[] | null) =>
  (role === 'owner' || role === 'planner') && hasPlannerPermission(role, permissions, 'messages');
