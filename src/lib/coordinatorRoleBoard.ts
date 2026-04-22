import type { PlannerAccessRole } from './plannerAccess';
import type { CoordinatorRoleCapability } from './coordinatorRoleCapabilities';

export type CoordinatorRoleBoard = {
  statusLabel: string;
  tone: 'ready' | 'warning' | 'neutral';
  modeLabel: string;
  enabledLabel: string;
  blockedLabel: string;
  guidanceLabel: string;
};

export const buildCoordinatorRoleBoard = ({
  role,
  capabilities,
}: {
  role: PlannerAccessRole;
  capabilities: CoordinatorRoleCapability[];
}): CoordinatorRoleBoard => {
  const enabled = capabilities.filter((item) => item.enabled);
  const blocked = capabilities.filter((item) => !item.enabled);

  const modeLabel = role === 'viewer'
    ? 'Read-only observer'
    : role === 'coordinator'
      ? 'Live coordinator operator'
      : 'Planner-level operator';

  return {
    statusLabel: role === 'viewer'
      ? 'This role is watching the room'
      : blocked.length > 0
        ? 'This role can run day-of ops with guardrails'
        : 'This role has full day-of control',
    tone: role === 'viewer' ? 'neutral' : blocked.length > 0 ? 'warning' : 'ready',
    modeLabel,
    enabledLabel: enabled.length
      ? enabled.map((item) => item.label).join(' · ')
      : 'No live actions enabled',
    blockedLabel: blocked.length
      ? blocked.map((item) => item.label).join(' · ')
      : 'No day-of blocks',
    guidanceLabel: role === 'viewer'
      ? 'Use this view to track handoffs and escalate decisions without changing the board.'
      : role === 'coordinator'
        ? 'Run guest movement, live timing, answers, and urgent sends without drifting into planner-only work.'
        : 'You can run live ops and also handle planner-only scheduling decisions when needed.',
  };
};
