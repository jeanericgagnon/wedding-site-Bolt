import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export type CoordinatorNavigationBoard = {
  statusLabel: string;
  tone: 'ready' | 'warning' | 'neutral';
  destinationLabel: string;
  boardTargetLabel: string;
  modeLabel: string;
};

export const buildCoordinatorNavigationBoard = ({
  panelFocus,
  boardTargetName,
  reviewOnly,
}: {
  panelFocus: CoordinatorPanelFocus | null;
  boardTargetName: string | null;
  reviewOnly: boolean;
}): CoordinatorNavigationBoard => {
  const destinationLabel = panelFocus === 'check-in'
    ? 'Check-in'
    : panelFocus === 'timeline'
      ? 'Timeline'
      : panelFocus === 'qna'
        ? 'Guest Q&A'
        : panelFocus === 'alert'
          ? 'Alerting'
          : 'Board overview';

  return {
    statusLabel: panelFocus ? 'Navigation target is armed' : 'Navigation is staying on the board',
    tone: panelFocus ? (reviewOnly ? 'warning' : 'ready') : 'neutral',
    destinationLabel,
    boardTargetLabel: boardTargetName ?? 'No board target selected',
    modeLabel: panelFocus === null ? 'Neutral board mode' : reviewOnly ? 'Review-only route' : 'Direct route',
  };
};
