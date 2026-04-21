import type { CoordinatorCheckInFilter } from './coordinatorCheckInQueue';
import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export type CoordinatorModeSessionState = {
  checkInFilter: CoordinatorCheckInFilter;
  checkInQuery: string;
  checkInReviewOnly: boolean;
  panelFocus: CoordinatorPanelFocus | null;
  alertChannelFilter: 'all' | 'email' | 'sms';
  alertTimingFilter: 'all' | 'now' | 'scheduled';
};

export const normalizeCoordinatorModeSessionState = (value: unknown): CoordinatorModeSessionState => {
  const base: CoordinatorModeSessionState = {
    checkInFilter: 'arrivals',
    checkInQuery: '',
    checkInReviewOnly: false,
    panelFocus: null,
    alertChannelFilter: 'all',
    alertTimingFilter: 'all',
  };

  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  const parsed = value as Partial<CoordinatorModeSessionState>;

  return {
    checkInFilter: parsed.checkInFilter === 'checked-in' || parsed.checkInFilter === 'all' ? parsed.checkInFilter : 'arrivals',
    checkInQuery: typeof parsed.checkInQuery === 'string' ? parsed.checkInQuery : '',
    checkInReviewOnly: parsed.checkInReviewOnly === true,
    panelFocus: parsed.panelFocus === 'check-in' || parsed.panelFocus === 'timeline' || parsed.panelFocus === 'qna' ? parsed.panelFocus : null,
    alertChannelFilter: parsed.alertChannelFilter === 'email' || parsed.alertChannelFilter === 'sms' ? parsed.alertChannelFilter : 'all',
    alertTimingFilter: parsed.alertTimingFilter === 'now' || parsed.alertTimingFilter === 'scheduled' ? parsed.alertTimingFilter : 'all',
  };
};
