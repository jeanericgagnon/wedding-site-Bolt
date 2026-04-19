import type { PlannerAccessRole } from './plannerAccess';

export const canManageCoordinatorCheckIn = (role: PlannerAccessRole) => role !== 'viewer';
export const canManageCoordinatorTimeline = (role: PlannerAccessRole) => role !== 'viewer';
export const canManageCoordinatorQna = (role: PlannerAccessRole) => role !== 'viewer';
export const canSendImmediateCoordinatorAlerts = (role: PlannerAccessRole) => role !== 'viewer';
export const canScheduleCoordinatorAlerts = (role: PlannerAccessRole) => role === 'owner' || role === 'planner';
