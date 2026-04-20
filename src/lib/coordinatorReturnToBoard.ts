import type { CoordinatorCheckInFilter } from './coordinatorCheckInQueue';
import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export type CoordinatorReturnState = {
  panelFocus: CoordinatorPanelFocus | null;
  checkInFilter: CoordinatorCheckInFilter;
  checkInReviewOnly: boolean;
  commandSource: null;
};

export const resolveCoordinatorReturnToBoardState = ({
  hasDoorReview,
  hasOpenQna,
  hasLiveEvent,
}: {
  hasDoorReview: boolean;
  hasOpenQna: boolean;
  hasLiveEvent: boolean;
}): CoordinatorReturnState => {
  if (hasDoorReview) {
    return {
      panelFocus: 'check-in',
      checkInFilter: 'arrivals',
      checkInReviewOnly: true,
      commandSource: null,
    };
  }

  if (hasOpenQna) {
    return {
      panelFocus: 'qna',
      checkInFilter: 'arrivals',
      checkInReviewOnly: false,
      commandSource: null,
    };
  }

  if (!hasLiveEvent) {
    return {
      panelFocus: 'timeline',
      checkInFilter: 'arrivals',
      checkInReviewOnly: false,
      commandSource: null,
    };
  }

  return {
    panelFocus: null,
    checkInFilter: 'arrivals',
    checkInReviewOnly: false,
    commandSource: null,
  };
};
