import type { CoordinatorCorrectionCue } from './coordinatorCorrectionsSummary';
import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export type CoordinatorCorrectionCueTarget = {
  panelFocus: CoordinatorPanelFocus | null;
  reviewOnly: boolean;
};

export const resolveCoordinatorCorrectionCueTarget = (
  cue: CoordinatorCorrectionCue,
): CoordinatorCorrectionCueTarget => {
  switch (cue.key) {
    case 'undo-check-in':
      return { panelFocus: 'check-in', reviewOnly: false };
    case 'reopen-event':
      return { panelFocus: 'timeline', reviewOnly: false };
    default:
      return { panelFocus: null, reviewOnly: false };
  }
};
