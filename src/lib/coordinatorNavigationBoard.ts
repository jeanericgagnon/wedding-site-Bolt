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
          ? 'Updates'
          : 'Day-of summary';

  return {
    statusLabel: panelFocus ? 'Next stop is ready' : 'Staying on the day-of summary',
    tone: panelFocus ? (reviewOnly ? 'warning' : 'ready') : 'neutral',
    destinationLabel,
    boardTargetLabel: boardTargetName ?? 'No suggested item selected',
    modeLabel: panelFocus === null ? 'Summary view' : reviewOnly ? 'Review-only path' : 'Direct path',
  };
};
