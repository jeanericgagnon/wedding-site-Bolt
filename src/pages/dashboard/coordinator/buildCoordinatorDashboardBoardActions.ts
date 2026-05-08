import type { Dispatch, SetStateAction } from 'react';
import { createCoordinatorSummaryFeedback } from '../../../lib/coordinatorSummaryFeedback';
import { getCoordinatorNeutralFocusReason } from '../../../lib/coordinatorNeutralFocusReason';
import { resolveCoordinatorPrimaryActionTarget } from '../../../lib/coordinatorPrimaryActionTarget';
import type { CoordinatorPrimaryAction } from '../../../lib/coordinatorPrimaryAction';
import { resolveCoordinatorQueueFocus } from '../../../lib/coordinatorQueueFocus';
import { resolveCoordinatorPanelFocus } from '../../../lib/coordinatorPanelFocus';
import { resolveCoordinatorEscalationTimelineTarget } from '../../../lib/coordinatorEscalationAction';
import { resolveCoordinatorReturnToBoardState } from '../../../lib/coordinatorReturnToBoard';
import { setCoordinatorEventTimelineState } from '../../../lib/coordinatorTimelineState';
import { resolveCoordinatorTimelineAlertIntent } from '../../../lib/coordinatorTimelineAlertIntent';
import { syncCoordinatorAlertDraftForTimelineTransition, getCoordinatorTimelineTransitionLabel } from '../../../lib/coordinatorTimelineTransition';
import { getFirstOpenCoordinatorQnaId } from '../../../lib/coordinatorQnaFocus';
import { resolveCoordinatorCorrectionCueTarget } from '../../../lib/coordinatorCorrectionCueTarget';
import type { CoordinatorCorrectionCue } from '../../../lib/coordinatorCorrectionsSummary';
import { updateCoordinatorQnaItem } from '../../../lib/coordinatorQnaFlow';
import { getNextCoordinatorQnaFocusId } from '../../../lib/coordinatorQnaFocus';
import { getCoordinatorDoorStatus } from '../../../lib/coordinatorCheckInStatus';
import type { CoordinatorAlertForm } from '../../../lib/coordinatorAlertFlow';
import type { CoordinatorAlertSuggestion } from '../../../lib/coordinatorAlertSuggestions';
import type { GuestLiteForCoordinator } from '../../../lib/coordinatorTypes';
import type { EventLite, QnaItem, TimelineState } from './coordinatorDashboardTypes';

type CoordinatorCommandSource = 'primary-action' | 'escalation' | 'correction' | null;
type CoordinatorPanelFocus = 'check-in' | 'timeline' | 'qna' | null;

type BuildCoordinatorDashboardBoardActionsArgs = {
  alertForm: CoordinatorAlertForm;
  alertSuggestions: CoordinatorAlertSuggestion[];
  alertTargetCueAligned: boolean;
  canEditQna: boolean;
  canEditTimeline: boolean;
  correctionCues: CoordinatorCorrectionCue[];
  correctionEventId: string | null;
  correctionGuestId: string | null;
  events: EventLite[];
  guests: GuestLiteForCoordinator[];
  isDemoMode: boolean;
  liveIssues: Array<{ key: string }>;
  panelFocus: CoordinatorPanelFocus;
  primaryAction: CoordinatorPrimaryAction;
  qnaBoardTargetId: string | null;
  qnaDraftAnswers: Record<string, string>;
  qnaItems: QnaItem[];
  sortedGuests: GuestLiteForCoordinator[];
  siteId: string | null;
  timelineBoardTargetId: string | null;
  timelineState: Record<string, TimelineState>;
  upNextEvent: EventLite | null;
  upNextEventId: string | null;
  setActiveGuestId: Dispatch<SetStateAction<string | null>>;
  setActiveQnaId: Dispatch<SetStateAction<string | null>>;
  setActiveTimelineEventId: Dispatch<SetStateAction<string | null>>;
  setAlertForm: Dispatch<SetStateAction<CoordinatorAlertForm>>;
  setCheckInFilter: Dispatch<SetStateAction<'all' | 'arrivals' | 'checked-in'>>;
  setCheckInReviewOnly: Dispatch<SetStateAction<boolean>>;
  setCommandSource: Dispatch<SetStateAction<CoordinatorCommandSource>>;
  setLastAlertSuggestionKey: Dispatch<SetStateAction<string | null>>;
  setNeutralFocusReason: Dispatch<SetStateAction<string | null>>;
  setPanelFocus: Dispatch<SetStateAction<CoordinatorPanelFocus>>;
  setQnaDraftAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  setQnaItems: Dispatch<SetStateAction<QnaItem[]>>;
  setSummaryFeedback: Dispatch<SetStateAction<ReturnType<typeof createCoordinatorSummaryFeedback> | null>>;
  setSummaryFeedbackShownAt: Dispatch<SetStateAction<number | null>>;
  setTimelineState: Dispatch<SetStateAction<Record<string, TimelineState>>>;
  clearCoordinatorTransientState: () => void;
  focusCoordinatorCheckInLane: () => void;
  focusCoordinatorQnaLane: () => void;
  focusCoordinatorTimelineLane: () => void;
  toast: (message: string, type?: 'success' | 'error' | 'info') => void;
  updateCoordinatorQnaAnswer: (id: string, item: QnaItem) => Promise<void>;
};

export function buildCoordinatorDashboardBoardActions(args: BuildCoordinatorDashboardBoardActionsArgs) {
  const returnToBoard = () => {
    const next = resolveCoordinatorReturnToBoardState({
      hasDoorReview: args.guests.some((guest) => getCoordinatorDoorStatus(guest) === 'watch'),
      hasOpenQna: args.qnaItems.some((item) => item.status === 'new'),
      hasLiveEvent: args.events.some((event) => (args.timelineState[event.id] || 'up-next') === 'live'),
    });
    args.setCommandSource(next.commandSource);
    args.setPanelFocus(next.panelFocus);
    args.setCheckInFilter(next.checkInFilter);
    args.setCheckInReviewOnly(next.checkInReviewOnly);
    args.setNeutralFocusReason(getCoordinatorNeutralFocusReason(next.panelFocus));
    if (next.panelFocus === 'qna') {
      args.setActiveQnaId(getFirstOpenCoordinatorQnaId(args.qnaItems));
    }
  };

  const runTimelineAction = (eventId: string, nextState: TimelineState | null) => {
    if (!nextState || !args.canEditTimeline) return;
    args.clearCoordinatorTransientState();
    const transitionEvent = args.events.find((event) => event.id === eventId) ?? null;
    args.setTimelineState((prev) => setCoordinatorEventTimelineState(prev, eventId, nextState));
    args.setActiveTimelineEventId(eventId);
    const suggestedIntent = resolveCoordinatorTimelineAlertIntent(args.alertSuggestions, eventId);
    const nextSuggestion = suggestedIntent
      ? args.alertSuggestions.find((suggestion) => suggestion.key === suggestedIntent) ?? null
      : null;
    const shouldSyncAlertDraft = args.alertTargetCueAligned || (!args.alertForm.subject.trim() && !args.alertForm.body.trim());
    if (suggestedIntent) {
      args.setLastAlertSuggestionKey(suggestedIntent);
    }
    if (nextSuggestion) {
      args.setAlertForm((prev) => syncCoordinatorAlertDraftForTimelineTransition({
        form: prev,
        nextSuggestion,
        shouldSync: shouldSyncAlertDraft,
      }));
    }
    if (transitionEvent) {
      args.setSummaryFeedback(createCoordinatorSummaryFeedback({
        label: getCoordinatorTimelineTransitionLabel({
          eventName: transitionEvent.event_name,
          nextState,
          syncedAlert: Boolean(nextSuggestion) && shouldSyncAlertDraft,
        }),
        panelFocus: 'timeline',
        targetId: eventId,
        kind: 'transition',
      }));
      args.setSummaryFeedbackShownAt(Date.now());
    }
    args.setPanelFocus('timeline');
  };

  const runPrimaryAction = () => {
    const target = resolveCoordinatorPrimaryActionTarget(args.primaryAction);
    args.clearCoordinatorTransientState();
    if (target.panelFocus === 'check-in') {
      args.setCommandSource('primary-action');
      args.setCheckInFilter('arrivals');
      args.setCheckInReviewOnly(target.reviewOnly);
      args.setPanelFocus('check-in');
      return;
    }
    if (target.panelFocus === 'qna') {
      args.setCommandSource('primary-action');
      args.setActiveQnaId(getFirstOpenCoordinatorQnaId(args.qnaItems));
      args.setPanelFocus('qna');
      return;
    }
    if (target.panelFocus === 'timeline') {
      if (args.upNextEventId && args.canEditTimeline) {
        args.setCommandSource('primary-action');
        runTimelineAction(args.upNextEventId, 'live');
      } else {
        args.setCommandSource('primary-action');
        args.setPanelFocus('timeline');
      }
    }
  };

  const selectTimelineState = (eventId: string, nextState: TimelineState) => {
    runTimelineAction(eventId, nextState);
  };

  const runCorrectionCue = (cue: (typeof args.correctionCues)[number]) => {
    const target = resolveCoordinatorCorrectionCueTarget(cue);
    args.clearCoordinatorTransientState();
    args.setCommandSource('correction');
    args.setPanelFocus(target.panelFocus);
    args.setCheckInReviewOnly(target.reviewOnly);

    if (cue.key === 'undo-check-in') {
      args.setCheckInFilter('checked-in');
      if (args.correctionGuestId) args.setActiveGuestId(args.correctionGuestId);
      return;
    }

    if (cue.key === 'reopen-event' && args.correctionEventId) {
      args.setActiveTimelineEventId(args.correctionEventId);
    }
  };

  const runEscalationIssue = (item: (typeof args.liveIssues)[number]) => {
    const focus = resolveCoordinatorQueueFocus(item.key);
    const nextPanelFocus = resolveCoordinatorPanelFocus(item.key);
    const timelineTarget = resolveCoordinatorEscalationTimelineTarget({ escalationKey: item.key, upNextEvent: args.upNextEvent });
    args.clearCoordinatorTransientState();
    if (item.key === 'open-qna') args.setActiveQnaId(getFirstOpenCoordinatorQnaId(args.qnaItems));
    args.setCommandSource('escalation');
    args.setCheckInFilter(focus.filter);
    args.setCheckInReviewOnly(focus.reviewOnly);
    args.setPanelFocus(nextPanelFocus);
    if (timelineTarget && args.canEditTimeline) {
      args.setTimelineState((prev) => setCoordinatorEventTimelineState(prev, timelineTarget, 'live'));
    }
  };

  const focusArrivalGuest = (guest: GuestLiteForCoordinator) => {
    args.focusCoordinatorCheckInLane();
    args.setCheckInFilter('arrivals');
    args.setCheckInReviewOnly(false);
    args.setActiveGuestId(guest.id);
  };

  const saveQnaAnswer = async (id: string) => {
    if (!args.canEditQna) {
      args.toast('Your collaborator role cannot edit guest questions here.', 'info');
      return;
    }
    args.focusCoordinatorQnaLane();
    const draftAnswer = args.qnaDraftAnswers[id] ?? args.qnaItems.find((item) => item.id === id)?.answer ?? '';
    const nextItems = updateCoordinatorQnaItem(args.qnaItems, id, draftAnswer);
    const nextItem = nextItems.find((item) => item.id === id);
    if (!nextItem) return;

    if (!args.isDemoMode) {
      try {
        await args.updateCoordinatorQnaAnswer(id, nextItem);
      } catch {
        args.toast('Couldn’t save that answer right now.', 'error');
        return;
      }
    }

    args.setQnaItems(nextItems);
    args.setQnaDraftAnswers((prev) => ({ ...prev, [id]: nextItem.answer || '' }));
    args.setActiveQnaId(nextItem.status === 'answered' ? getNextCoordinatorQnaFocusId(nextItems, id) : id);
    args.toast(nextItem.status === 'answered' ? 'Guest question answered.' : 'Guest question reopened.', 'success');
  };

  return {
    focusArrivalGuest,
    returnToBoard,
    runCorrectionCue,
    runEscalationIssue,
    runPrimaryAction,
    runTimelineAction,
    saveQnaAnswer,
    selectTimelineState,
  };
}
