import type { CoordinatorCheckInFilter } from './coordinatorCheckInQueue';
import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export type CoordinatorCommandState = {
  source: 'primary-action' | 'escalation' | 'correction' | null;
  panelFocus: CoordinatorPanelFocus | null;
  checkInFilter: CoordinatorCheckInFilter;
  checkInReviewOnly: boolean;
};

export const normalizeCoordinatorCommandState = (value: unknown): CoordinatorCommandState => {
  const base: CoordinatorCommandState = {
    source: null,
    panelFocus: null,
    checkInFilter: 'arrivals',
    checkInReviewOnly: false,
  };

  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  const parsed = value as Partial<CoordinatorCommandState>;

  return {
    source: parsed.source === 'primary-action' || parsed.source === 'escalation' || parsed.source === 'correction' ? parsed.source : null,
    panelFocus: parsed.panelFocus === 'check-in' || parsed.panelFocus === 'timeline' || parsed.panelFocus === 'qna' ? parsed.panelFocus : null,
    checkInFilter: parsed.checkInFilter === 'checked-in' || parsed.checkInFilter === 'all' ? parsed.checkInFilter : 'arrivals',
    checkInReviewOnly: parsed.checkInReviewOnly === true,
  };
};
