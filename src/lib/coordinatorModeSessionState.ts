import type { CoordinatorCheckInFilter } from './coordinatorCheckInQueue';
import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export type CoordinatorModeSessionState = {
  checkInFilter: CoordinatorCheckInFilter;
  checkInReviewOnly: boolean;
  panelFocus: CoordinatorPanelFocus | null;
};

export const normalizeCoordinatorModeSessionState = (value: unknown): CoordinatorModeSessionState => {
  const base: CoordinatorModeSessionState = {
    checkInFilter: 'arrivals',
    checkInReviewOnly: false,
    panelFocus: null,
  };

  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  const parsed = value as Partial<CoordinatorModeSessionState>;

  return {
    checkInFilter: parsed.checkInFilter === 'checked-in' || parsed.checkInFilter === 'all' ? parsed.checkInFilter : 'arrivals',
    checkInReviewOnly: parsed.checkInReviewOnly === true,
    panelFocus: parsed.panelFocus === 'check-in' || parsed.panelFocus === 'timeline' || parsed.panelFocus === 'qna' ? parsed.panelFocus : null,
  };
};
