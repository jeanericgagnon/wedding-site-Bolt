import type { CoordinatorPrimaryAction } from './coordinatorPrimaryAction';
import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export type CoordinatorPrimaryActionTarget = {
  panelFocus: CoordinatorPanelFocus | null;
  reviewOnly: boolean;
};

export const resolveCoordinatorPrimaryActionTarget = (
  action: CoordinatorPrimaryAction,
): CoordinatorPrimaryActionTarget => {
  switch (action.key) {
    case 'door-review':
      return { panelFocus: 'check-in', reviewOnly: true };
    case 'open-qna':
      return { panelFocus: 'qna', reviewOnly: false };
    case 'start-up-next':
      return { panelFocus: 'timeline', reviewOnly: false };
    default:
      return { panelFocus: null, reviewOnly: false };
  }
};
