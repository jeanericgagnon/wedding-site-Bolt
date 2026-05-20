import type { PlannerAccessRole, PlannerPermissionKey } from './plannerAccess';
import {
  canManageCoordinatorCheckIn,
  canManageCoordinatorQna,
  canManageCoordinatorTimeline,
  canScheduleCoordinatorAlerts,
  canSendImmediateCoordinatorAlerts,
} from './coordinatorRoleAccess';

export type CoordinatorRoleCapability = {
  key: 'check-in' | 'timeline' | 'qna' | 'alerts-now' | 'alerts-later';
  label: string;
  enabled: boolean;
  detail: string;
};

export const buildCoordinatorRoleCapabilities = (
  role: PlannerAccessRole,
  permissions?: PlannerPermissionKey[] | null,
): CoordinatorRoleCapability[] => {
  const canCheckIn = canManageCoordinatorCheckIn(role, permissions);
  const canTimeline = canManageCoordinatorTimeline(role, permissions);
  const canQna = canManageCoordinatorQna(role, permissions);
  const canAlertsNow = canSendImmediateCoordinatorAlerts(role, permissions);
  const canAlertsLater = canScheduleCoordinatorAlerts(role, permissions);

  return [
    {
      key: 'check-in',
      label: 'Check-in',
      enabled: canCheckIn,
      detail: canCheckIn ? 'Can move guests through the door live.' : 'Can review arrivals but cannot change guest check-in.',
    },
    {
      key: 'timeline',
      label: 'Timeline',
      enabled: canTimeline,
      detail: canTimeline ? 'Can move run-of-show events live, done, or back to up next.' : 'Can review the run-of-show but cannot change event state.',
    },
    {
      key: 'qna',
      label: 'Guest Q&A',
      enabled: canQna,
      detail: canQna ? 'Can answer guest questions and reopen unresolved ones.' : 'Can read guest questions but cannot answer or reopen them.',
    },
    {
      key: 'alerts-now',
      label: 'Send now',
      enabled: canAlertsNow,
      detail: canAlertsNow ? 'Can send live day-of updates right away.' : 'Can review message drafts but cannot send updates.',
    },
    {
      key: 'alerts-later',
      label: 'Schedule',
      enabled: canAlertsLater,
      detail: canAlertsLater ? 'Can schedule follow-up sends for later.' : 'Scheduling stays with planners or the couple.',
    },
  ];
};
