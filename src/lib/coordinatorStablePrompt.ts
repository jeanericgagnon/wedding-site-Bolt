import type { CoordinatorCommandSummaryLabel } from './coordinatorCommandSummaryTarget';

export type CoordinatorStablePrompt = {
  badge: string;
  label: string;
};

export const buildCoordinatorStablePrompt = ({
  priority,
  reason,
  cta,
}: {
  priority: CoordinatorCommandSummaryLabel;
  reason: string;
  cta: string;
}): CoordinatorStablePrompt => ({
  badge: `Priority · ${priority}`,
  label: `${reason} — ${cta}`,
});
