import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export type CoordinatorSummaryFeedback = {
  label: string;
  panelFocus: CoordinatorPanelFocus | null;
  targetId: string | null;
  kind: 'jump' | 'transition' | 'realignment';
};

export const createCoordinatorSummaryFeedback = ({
  label,
  panelFocus,
  targetId,
  kind,
}: CoordinatorSummaryFeedback): CoordinatorSummaryFeedback => ({
  label,
  panelFocus,
  targetId,
  kind,
});
