import type { Dispatch, SetStateAction } from 'react';
import { buildCoordinatorDoorEscalationPrompt } from '../../../lib/coordinatorDoorEscalation';
import { applyCoordinatorAlertSuggestion } from '../../../lib/coordinatorAlertSuggestionApply';
import { getFirstOpenCoordinatorQnaId } from '../../../lib/coordinatorQnaFocus';
import { getCoordinatorCommandJumpLabel } from '../../../lib/coordinatorCommandJumpLabel';
import { getCoordinatorCommandSummaryTarget } from '../../../lib/coordinatorCommandSummaryTarget';
import { getCoordinatorNeutralFocusReason } from '../../../lib/coordinatorNeutralFocusReason';
import { resolveCoordinatorNeutralFocusTarget } from '../../../lib/coordinatorNeutralFocusTarget';
import { getCoordinatorStablePromptTarget } from '../../../lib/coordinatorStablePromptTarget';
import { createCoordinatorSummaryFeedback, type CoordinatorSummaryFeedback } from '../../../lib/coordinatorSummaryFeedback';
import type { CoordinatorDoorStatusContext } from '../../../lib/coordinatorCheckInStatus';
import type { GuestLiteForCoordinator } from '../../../lib/coordinatorTypes';
import type { CoordinatorPanelFocus } from '../../../lib/coordinatorPanelFocus';
import type { CoordinatorQnaFilter } from '../../../lib/coordinatorQnaTriage';
import type { CoordinatorAlertForm } from '../../../lib/coordinatorAlertFlow';
import type { CoordinatorAlertSuggestion } from '../../../lib/coordinatorAlertSuggestions';
import type { QnaItem } from './coordinatorDashboardTypes';

type SetString = Dispatch<SetStateAction<string | null>>;
type SetPanelFocus = Dispatch<SetStateAction<CoordinatorPanelFocus | null>>;

type BuildCoordinatorDashboardFocusActionsArgs = {
  alertTargetCueAligned: boolean;
  canEditQna: boolean;
  canSendAlerts: boolean;
  checkInBoardTargetId: string | null;
  checkInQueue: GuestLiteForCoordinator[];
  checkInStatusContext: CoordinatorDoorStatusContext;
  checkInWatchCount: number;
  liveEventId: string | null;
  nextArrivals: GuestLiteForCoordinator[];
  panelFocus: CoordinatorPanelFocus | null;
  preferredAlertSuggestion: CoordinatorAlertSuggestion | null;
  priorityCommandLabel: 'Check-in' | 'Timeline' | 'Q&A' | 'Alerting';
  qnaBoardTargetId: string | null;
  qnaItems: QnaItem[];
  timelineBoardTargetId: string | null;
  upNextEventId: string | null;
  setActiveGuestId: SetString;
  setActiveQnaId: SetString;
  setActiveTimelineEventId: SetString;
  setAlertForm: Dispatch<SetStateAction<CoordinatorAlertForm>>;
  setCheckInFilter: Dispatch<SetStateAction<'all' | 'arrivals' | 'checked-in'>>;
  setCheckInReviewOnly: Dispatch<SetStateAction<boolean>>;
  setCommandJumpLabel: SetString;
  setCommandJumpPanelFocus: SetPanelFocus;
  setCommandJumpTargetId: SetString;
  setCommandSource: Dispatch<SetStateAction<'primary-action' | 'escalation' | 'correction' | null>>;
  setManualOverrideUpdatedAt: Dispatch<SetStateAction<number | null>>;
  setNeutralFocusReason: SetString;
  setOverrideCueShownAt: Dispatch<SetStateAction<number | null>>;
  setPanelFocus: SetPanelFocus;
  setQnaFilter: Dispatch<SetStateAction<CoordinatorQnaFilter>>;
  setQnaInput: Dispatch<SetStateAction<string>>;
  setSummaryFeedback: Dispatch<SetStateAction<CoordinatorSummaryFeedback | null>>;
  setSummaryFeedbackShownAt: Dispatch<SetStateAction<number | null>>;
  setAlertOverrideUpdatedAt: Dispatch<SetStateAction<number | null>>;
  toast: (message: string, type?: 'success' | 'error' | 'info') => void;
};

export function buildCoordinatorDashboardFocusActions(args: BuildCoordinatorDashboardFocusActionsArgs) {
  const clearCoordinatorTransientState = () => {
    args.setNeutralFocusReason(null);
    args.setSummaryFeedback(null);
    args.setSummaryFeedbackShownAt(null);
    args.setAlertOverrideUpdatedAt(null);
    args.setManualOverrideUpdatedAt(null);
    args.setOverrideCueShownAt(null);
    args.setCommandJumpLabel(null);
    args.setCommandJumpPanelFocus(null);
    args.setCommandJumpTargetId(null);
  };

  const focusCoordinatorAlertLane = () => {
    clearCoordinatorTransientState();
    args.setPanelFocus('timeline');
    args.setCommandSource(null);
  };

  const focusCoordinatorCheckInLane = () => {
    clearCoordinatorTransientState();
    args.setPanelFocus('check-in');
    args.setCommandSource(null);
  };

  const focusCoordinatorTimelineLane = () => {
    clearCoordinatorTransientState();
    args.setPanelFocus('timeline');
    args.setCommandSource(null);
  };

  const jumpToTimelineEvent = (eventId: string | null | undefined) => {
    if (!eventId) return;
    focusCoordinatorTimelineLane();
    args.setActiveTimelineEventId(eventId);
  };

  const focusCoordinatorQnaLane = () => {
    clearCoordinatorTransientState();
    args.setPanelFocus('qna');
    args.setCommandSource(null);
  };

  const focusFirstCoordinatorQueueGuest = () => {
    const firstGuest = args.checkInQueue[0];
    if (!firstGuest) return;
    focusCoordinatorCheckInLane();
    args.setActiveGuestId(firstGuest.id);
  };

  const focusFirstCoordinatorOpenQna = () => {
    const nextQnaId = getFirstOpenCoordinatorQnaId(args.qnaItems) ?? args.qnaItems[0]?.id ?? null;
    if (!nextQnaId) return;
    focusCoordinatorQnaLane();
    args.setActiveQnaId(nextQnaId);
  };

  const focusNextCoordinatorQna = () => {
    const nextQnaId = getFirstOpenCoordinatorQnaId(args.qnaItems) ?? args.qnaItems[0]?.id ?? null;
    if (!nextQnaId) return;
    focusCoordinatorQnaLane();
    args.setQnaFilter('open');
    args.setActiveQnaId(nextQnaId);
  };

  const jumpToOpsSnapshotLane = (key: 'check-in' | 'timeline' | 'qna' | 'alerting') => {
    if (key === 'check-in') {
      focusCoordinatorCheckInLane();
      if (args.checkInBoardTargetId) {
        args.setCheckInReviewOnly(args.checkInWatchCount > 0);
        args.setActiveGuestId(args.checkInBoardTargetId);
      } else if (args.nextArrivals[0]) {
        args.setCheckInFilter('arrivals');
        args.setCheckInReviewOnly(false);
        args.setActiveGuestId(args.nextArrivals[0].id);
      }
      return;
    }

    if (key === 'timeline') {
      focusCoordinatorTimelineLane();
      if (args.liveEventId) {
        args.setActiveTimelineEventId(args.liveEventId);
      } else if (args.upNextEventId) {
        args.setActiveTimelineEventId(args.upNextEventId);
      } else if (args.timelineBoardTargetId) {
        args.setActiveTimelineEventId(args.timelineBoardTargetId);
      }
      return;
    }

    if (key === 'qna') {
      focusCoordinatorQnaLane();
      if (args.qnaBoardTargetId) args.setActiveQnaId(args.qnaBoardTargetId);
      return;
    }

    focusCoordinatorAlertLane();
    if (args.preferredAlertSuggestion && !args.alertTargetCueAligned && args.canSendAlerts) {
      args.setAlertForm((prev) => applyCoordinatorAlertSuggestion({ form: prev, suggestion: args.preferredAlertSuggestion! }));
    }
  };

  const escalateDoorReview = (guest: GuestLiteForCoordinator) => {
    if (!args.canEditQna) {
      args.toast('Your collaborator role cannot escalate door issues into guest Q&A.', 'info');
      return;
    }
    clearCoordinatorTransientState();
    args.setQnaInput(buildCoordinatorDoorEscalationPrompt(guest, args.checkInStatusContext));
    args.setCommandSource('escalation');
    args.setPanelFocus('qna');
    args.setActiveQnaId(getFirstOpenCoordinatorQnaId(args.qnaItems));
    args.toast('Door issue moved into guest Q&A triage.', 'success');
  };

  const revisitNeutralFocus = () => {
    const target = resolveCoordinatorNeutralFocusTarget(args.panelFocus);
    clearCoordinatorTransientState();
    args.setNeutralFocusReason(getCoordinatorNeutralFocusReason(target.panelFocus));
    args.setPanelFocus(target.panelFocus);
    args.setCheckInReviewOnly(target.reviewOnly);
    if (target.panelFocus === 'check-in') {
      args.setCheckInFilter('arrivals');
    }
    if (target.panelFocus === 'qna') {
      args.setActiveQnaId(getFirstOpenCoordinatorQnaId(args.qnaItems));
    }
  };

  const jumpToStablePrompt = () => {
    const target = getCoordinatorStablePromptTarget(args.priorityCommandLabel);
    args.setPanelFocus(target.panelFocus);
    args.setCheckInReviewOnly(target.reviewOnly);

    if (args.priorityCommandLabel === 'Check-in') {
      args.setCheckInFilter('arrivals');
      if (args.checkInBoardTargetId) args.setActiveGuestId(args.checkInBoardTargetId);
      return;
    }

    if (args.priorityCommandLabel === 'Timeline') {
      if (args.timelineBoardTargetId) args.setActiveTimelineEventId(args.timelineBoardTargetId);
      return;
    }

    if (args.priorityCommandLabel === 'Q&A') {
      const nextQnaId = args.qnaBoardTargetId ?? getFirstOpenCoordinatorQnaId(args.qnaItems);
      args.setActiveQnaId(nextQnaId);
    }
  };

  const jumpToCommandSummaryItem = (label: 'Check-in' | 'Timeline' | 'Q&A' | 'Alerting') => {
    const target = getCoordinatorCommandSummaryTarget(label);
    clearCoordinatorTransientState();
    args.setPanelFocus(target.panelFocus);
    args.setCheckInReviewOnly(target.reviewOnly);
    const jumpLabel = getCoordinatorCommandJumpLabel(label);
    args.setCommandJumpLabel(jumpLabel);
    args.setCommandJumpPanelFocus(target.panelFocus);

    if (label === 'Check-in') {
      args.setCheckInFilter('arrivals');
      args.setCommandJumpTargetId(args.checkInBoardTargetId);
      args.setSummaryFeedback(createCoordinatorSummaryFeedback({ label: jumpLabel, panelFocus: 'check-in', targetId: args.checkInBoardTargetId, kind: 'jump' }));
      args.setSummaryFeedbackShownAt(Date.now());
      if (args.checkInBoardTargetId) args.setActiveGuestId(args.checkInBoardTargetId);
      return;
    }
    if (label === 'Timeline') {
      args.setCommandJumpTargetId(args.timelineBoardTargetId);
      args.setSummaryFeedback(createCoordinatorSummaryFeedback({ label: jumpLabel, panelFocus: 'timeline', targetId: args.timelineBoardTargetId, kind: 'jump' }));
      args.setSummaryFeedbackShownAt(Date.now());
      if (args.timelineBoardTargetId) args.setActiveTimelineEventId(args.timelineBoardTargetId);
      return;
    }
    if (label === 'Q&A') {
      const nextQnaId = args.qnaBoardTargetId ?? getFirstOpenCoordinatorQnaId(args.qnaItems);
      args.setCommandJumpTargetId(nextQnaId);
      args.setSummaryFeedback(createCoordinatorSummaryFeedback({ label: jumpLabel, panelFocus: 'qna', targetId: nextQnaId, kind: 'jump' }));
      args.setSummaryFeedbackShownAt(Date.now());
      args.setActiveQnaId(nextQnaId);
      return;
    }
    args.setCommandJumpTargetId(null);
    args.setSummaryFeedback(createCoordinatorSummaryFeedback({ label: jumpLabel, panelFocus: null, targetId: null, kind: 'jump' }));
    args.setSummaryFeedbackShownAt(Date.now());
  };

  const returnToBoardTarget = () => {
    clearCoordinatorTransientState();
    if (args.panelFocus === 'check-in' && args.checkInBoardTargetId) {
      args.setActiveGuestId(args.checkInBoardTargetId);
      args.setCheckInFilter('arrivals');
      args.setCheckInReviewOnly(true);
      args.setManualOverrideUpdatedAt(null);
      args.setOverrideCueShownAt(null);
      return;
    }
    if (args.panelFocus === 'timeline' && args.timelineBoardTargetId) {
      args.setActiveTimelineEventId(args.timelineBoardTargetId);
      args.setManualOverrideUpdatedAt(null);
      args.setOverrideCueShownAt(null);
      return;
    }
    if (args.panelFocus === 'qna') {
      const nextQnaId = args.qnaBoardTargetId ?? getFirstOpenCoordinatorQnaId(args.qnaItems);
      args.setActiveQnaId(nextQnaId);
      args.setManualOverrideUpdatedAt(null);
      args.setOverrideCueShownAt(null);
    }
  };

  return {
    clearCoordinatorTransientState,
    escalateDoorReview,
    focusCoordinatorAlertLane,
    focusCoordinatorCheckInLane,
    focusCoordinatorQnaLane,
    focusCoordinatorTimelineLane,
    focusFirstCoordinatorOpenQna,
    focusFirstCoordinatorQueueGuest,
    focusNextCoordinatorQna,
    jumpToCommandSummaryItem,
    jumpToOpsSnapshotLane,
    jumpToStablePrompt,
    jumpToTimelineEvent,
    returnToBoardTarget,
    revisitNeutralFocus,
  };
}
