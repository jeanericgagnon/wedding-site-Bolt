import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export const getCoordinatorOverrideSupportBadge = ({
  panelFocus,
  kind,
}: {
  panelFocus: CoordinatorPanelFocus | null;
  kind: 'manual' | 'alert';
}) => {
  if (kind === 'alert') {
    return 'Alert override';
  }

  switch (panelFocus) {
    case 'check-in':
      return 'Override · Guest';
    case 'timeline':
      return 'Override · Event';
    case 'qna':
      return 'Override · Question';
    default:
      return 'Override';
  }
};
