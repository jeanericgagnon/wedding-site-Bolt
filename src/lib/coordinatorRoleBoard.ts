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
  const enabledKeys = new Set(enabled.map((item) => item.key));

  const modeLabel = role === 'viewer'
    ? 'Read-only observer'
    : role === 'coordinator'
      ? 'Coordinator helper'
      : 'Planner helper';

  return {
    statusLabel: role === 'viewer'
      ? 'This role is watching the room'
      : blocked.length > 0
        ? 'This role can help on the wedding day with guardrails'
        : 'This role has full day-of access',
    tone: role === 'viewer' ? 'neutral' : blocked.length > 0 ? 'warning' : 'ready',
    modeLabel,
    enabledLabel: enabled.length
      ? enabled.map((item) => item.label).join(' · ')
      : 'No live actions enabled',
    blockedLabel: blocked.length
      ? blocked.map((item) => item.label).join(' · ')
      : 'No day-of blocks',
    guidanceLabel: enabled.length === 0
      ? 'Use this view to track handoffs and escalate decisions without changing the board.'
      : role === 'coordinator'
        ? [
            enabledKeys.has('check-in') ? 'guest movement' : null,
            enabledKeys.has('timeline') ? 'live timing' : null,
            enabledKeys.has('qna') ? 'guest answers' : null,
            enabledKeys.has('alerts-now') ? 'urgent sends' : null,
          ].filter(Boolean).join(', ')
        : enabledKeys.has('alerts-later')
          ? 'You can help with day-of movement and planner-only scheduling decisions when needed.'
          : 'You can help with the enabled day-of lanes while scheduling stays with the couple.',
  };
};
