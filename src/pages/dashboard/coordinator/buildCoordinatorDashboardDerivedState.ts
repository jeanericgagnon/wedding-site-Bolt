import { getCoordinatorDoorStatus, type CoordinatorDoorStatusContext } from '../../../lib/coordinatorCheckInStatus';
import { buildCoordinatorAlertActivityBoard } from '../../../lib/coordinatorAlertActivityBoard';
import { buildCoordinatorAlertBoard } from '../../../lib/coordinatorAlertBoard';
import { getCoordinatorAlertLaneLabel } from '../../../lib/coordinatorAlertLane';
import { getCoordinatorAlertOverrideCurrentLabel } from '../../../lib/coordinatorAlertOverrideCurrentLabel';
import { getCoordinatorAlertOverrideLabel } from '../../../lib/coordinatorAlertOverrideLabel';
import { getCoordinatorAlertOverrideTargetLabel } from '../../../lib/coordinatorAlertOverrideTargetLabel';
import { buildCoordinatorAlertSuggestions, type CoordinatorAlertSuggestion } from '../../../lib/coordinatorAlertSuggestions';
import { buildCoordinatorAlertSummary } from '../../../lib/coordinatorAlertSummary';
import { getCoordinatorAlertSummaryStateLabel } from '../../../lib/coordinatorAlertSummaryStateLabel';
import { getCoordinatorAlertSummaryTransitionLabel } from '../../../lib/coordinatorAlertSummaryTransitionLabel';
import { buildCoordinatorAlertTargetCue } from '../../../lib/coordinatorAlertTargetCue';
import { resolveCoordinatorPreferredAlertSuggestion } from '../../../lib/coordinatorAlertIntent';
import { buildCoordinatorCheckInBoard } from '../../../lib/coordinatorCheckInBoard';
import { filterCoordinatorCheckInQueue } from '../../../lib/coordinatorCheckInQueue';
import { getCoordinatorCheckInBoardTargetId, getCoordinatorCheckInTargetState } from '../../../lib/coordinatorCheckInTargetState';
import { getCoordinatorCommandBadgeTone } from '../../../lib/coordinatorCommandBadgeTone';
import { buildCoordinatorCommandBoard } from '../../../lib/coordinatorCommandBoard';
import { buildCoordinatorCommandDeck } from '../../../lib/coordinatorCommandDeck';
import { getCoordinatorCommandModeGuidance } from '../../../lib/coordinatorCommandModeGuidance';
import { getCoordinatorCommandModeLabel } from '../../../lib/coordinatorCommandModeLabel';
import { getCoordinatorCommandPriority } from '../../../lib/coordinatorCommandPriority';
import { getCoordinatorCommandPriorityCta } from '../../../lib/coordinatorCommandPriorityCta';
import { getCoordinatorCommandPriorityReason } from '../../../lib/coordinatorCommandPriorityReason';
import { getCoordinatorCommandPriorityTargetReason } from '../../../lib/coordinatorCommandPriorityTargetReason';
import { buildCoordinatorCommandSummary } from '../../../lib/coordinatorCommandSummary';
import { buildCoordinatorCorrectionCues } from '../../../lib/coordinatorCorrectionsSummary';
import { buildCoordinatorEscalations } from '../../../lib/coordinatorEscalations';
import { buildCoordinatorExecutionBoard } from '../../../lib/coordinatorExecutionBoard';
import { buildCoordinatorNavigationBoard } from '../../../lib/coordinatorNavigationBoard';
import { buildCoordinatorOpsSnapshot } from '../../../lib/coordinatorOpsSnapshot';
import { getCoordinatorOverrideSupportBadge } from '../../../lib/coordinatorOverrideSupportBadge';
import { resolveCoordinatorOverrideDisplayCue } from '../../../lib/coordinatorOverrideDisplayCue';
import { resolveCoordinatorPanelFocus, type CoordinatorPanelFocus } from '../../../lib/coordinatorPanelFocus';
import { buildCoordinatorPrimaryAction, type CoordinatorPrimaryAction } from '../../../lib/coordinatorPrimaryAction';
import { buildCoordinatorPrimaryActionBoard } from '../../../lib/coordinatorPrimaryActionBoard';
import { resolveCoordinatorPrimaryActionTarget } from '../../../lib/coordinatorPrimaryActionTarget';
import { getCoordinatorQnaCounts } from '../../../lib/coordinatorQnaFlow';
import { getFirstOpenCoordinatorQnaId } from '../../../lib/coordinatorQnaFocus';
import { getCoordinatorQnaTargetState } from '../../../lib/coordinatorQnaTargetState';
import { buildCoordinatorQnaBoard } from '../../../lib/coordinatorQnaBoard';
import { getCoordinatorQnaDraftStateLabel, filterCoordinatorQnaItems, type CoordinatorQnaFilter } from '../../../lib/coordinatorQnaTriage';
import { buildCoordinatorRoleBoard } from '../../../lib/coordinatorRoleBoard';
import { buildCoordinatorRoleCapabilities } from '../../../lib/coordinatorRoleCapabilities';
import { buildCoordinatorStablePrompt } from '../../../lib/coordinatorStablePrompt';
import { getCoordinatorStablePromptState } from '../../../lib/coordinatorStablePromptState';
import { getCoordinatorStablePromptTargetLabel } from '../../../lib/coordinatorStablePromptTargetLabel';
import { getCoordinatorStandingPromptBadge } from '../../../lib/coordinatorStandingPromptBadge';
import { getCoordinatorStandingPromptCopy } from '../../../lib/coordinatorStandingPromptCopy';
import { getCoordinatorStandingPromptMode } from '../../../lib/coordinatorStandingPromptMode';
import { getCoordinatorStandingPromptSecondaryState } from '../../../lib/coordinatorStandingPromptSecondaryState';
import { resolveCoordinatorSummaryDisplayCue } from '../../../lib/coordinatorSummaryDisplayCue';
import { getCoordinatorSummaryFeedbackBadge } from '../../../lib/coordinatorSummaryFeedbackBadge';
import { getCoordinatorSummaryFeedbackCopy } from '../../../lib/coordinatorSummaryFeedbackCopy';
import { getCoordinatorSummaryFeedbackEmphasis } from '../../../lib/coordinatorSummaryFeedbackEmphasis';
import { getCoordinatorSummaryFeedbackLayout } from '../../../lib/coordinatorSummaryFeedbackLayout';
import { getCoordinatorSummaryFeedbackTone } from '../../../lib/coordinatorSummaryFeedbackTone';
import { buildCoordinatorTimelineBoard } from '../../../lib/coordinatorTimelineBoard';
import { getCoordinatorCorrectionEventId, getCoordinatorCorrectionGuestId } from '../../../lib/coordinatorCorrectionTarget';
import { resolveOperationalEventId } from '../../../lib/operationalEvent';
import { getCoordinatorLiveEventId, getCoordinatorUpNextEventId, type CoordinatorTimelineEventLite } from '../../../lib/coordinatorTimelineFocus';
import { getCoordinatorTimelineBoardTargetId, getCoordinatorTimelineTargetState } from '../../../lib/coordinatorTimelineTargetState';
import { getCoordinatorManualOverrideActionLabel } from '../../../lib/coordinatorManualOverrideAction';
import { getCoordinatorManualOverrideTargetLabel } from '../../../lib/coordinatorManualOverrideTargetLabel';
import { getCoordinatorManualOverrideCurrentTargetLabel } from '../../../lib/coordinatorManualOverrideCurrentTargetLabel';
import { buildCoordinatorAlertLogView } from '../../../lib/coordinatorAlertLogView';
import type { PlannerAccessRole, PlannerPermissionKey } from '../../../lib/plannerAccess';
import type { GuestLiteForCoordinator } from '../../../lib/coordinatorTypes';
import type { CoordinatorQnaItem } from '../../../lib/coordinatorModePersistence';
import type { CoordinatorSummaryFeedback } from '../../../lib/coordinatorSummaryFeedback';
import type { CoordinatorAlertForm } from '../../../lib/coordinatorAlertFlow';
import type { AlertLog, AudienceOption, EventLite, QnaItem, TimelineState } from './coordinatorDashboardTypes';
import {
  buildCoordinatorEventAudienceOptions,
  buildCoordinatorGuestStats,
  filterCoordinatorAlertLog,
  getCoordinatorAlertAudienceCount,
  sortCoordinatorGuests,
} from './coordinatorDashboardUtils';

type Args = {
  activeGuestId: string | null;
  activeQnaId: string | null;
  activeTimelineEventId: string | null;
  alertChannelFilter: 'all' | 'sms' | 'email';
  alertForm: CoordinatorAlertForm;
  alertLog: AlertLog[];
  alertOverrideLabelState: string | null;
  alertOverrideUpdatedAt: number | null;
  alertTimingFilter: 'all' | 'scheduled' | 'now';
  checkInFilter: 'all' | 'arrivals' | 'checked-in';
  checkInQuery: string;
  checkInReviewOnly: boolean;
  commandSource: 'primary-action' | 'escalation' | 'correction' | null;
  coordinatorPermissions: PlannerPermissionKey[] | null;
  coordinatorRole: PlannerAccessRole;
  eventGuestIds: Record<string, Set<string>>;
  eventSeatingConfiguredIds: Set<string>;
  events: EventLite[];
  guests: GuestLiteForCoordinator[];
  lastAlertSuggestionKey: string | null;
  manualOverrideLabel: string | null;
  manualOverrideUpdatedAt: number | null;
  panelFocus: CoordinatorPanelFocus | null;
  previousAlertAligned: boolean | null;
  qnaDraftAnswers: Record<string, string>;
  qnaFilter: CoordinatorQnaFilter;
  qnaItems: QnaItem[];
  summaryFeedback: CoordinatorSummaryFeedback | null;
  timelineState: Record<string, TimelineState>;
  canEditTimeline: boolean;
  canScheduleAlerts: boolean;
  alertAudienceCount?: number;
};

export function buildCoordinatorDashboardDerivedState(args: Args) {
  const stats = buildCoordinatorGuestStats(args.guests);
  const sortedGuests = sortCoordinatorGuests(args.guests);
  const eventAudienceOptions: AudienceOption[] = buildCoordinatorEventAudienceOptions(args.events, args.eventGuestIds);
  const alertAudienceCount =
    args.alertAudienceCount ??
    getCoordinatorAlertAudienceCount({
      audience: args.alertForm.audience,
      guests: args.guests,
      eventGuestIds: args.eventGuestIds,
    });

  const qnaCounts = getCoordinatorQnaCounts(args.qnaItems as CoordinatorQnaItem[]);
  const filteredQnaItems = filterCoordinatorQnaItems(args.qnaItems, args.qnaFilter);
  const activeQnaItem = args.qnaItems.find((item) => item.id === args.activeQnaId) ?? null;
  const activeQnaDraftValue = args.activeQnaId ? (args.qnaDraftAnswers[args.activeQnaId] ?? activeQnaItem?.answer ?? '') : '';
  const activeQnaDraftStateLabel = getCoordinatorQnaDraftStateLabel({
    draftAnswer: activeQnaDraftValue,
    savedAnswer: activeQnaItem?.answer,
  });
  const qnaBoard = buildCoordinatorQnaBoard({
    items: args.qnaItems,
    activeItem: activeQnaItem,
    activeDraftStateLabel: activeQnaDraftStateLabel,
  });

  const roleCapabilities = buildCoordinatorRoleCapabilities(args.coordinatorRole, args.coordinatorPermissions);
  const liveEventId = getCoordinatorLiveEventId(args.events as CoordinatorTimelineEventLite[], args.timelineState);
  const upNextEventId = getCoordinatorUpNextEventId(args.events as CoordinatorTimelineEventLite[], args.timelineState);
  const checkInEventId = resolveOperationalEventId({
    events: args.events,
    liveEventId,
    upNextEventId,
  });
  const checkInEvent = args.events.find((event) => event.id === checkInEventId) ?? null;
  const checkInEventGuestIds = checkInEventId ? (args.eventGuestIds[checkInEventId] ?? null) : null;
  const useEventScopedDoorQueue = Boolean(checkInEventGuestIds && checkInEventGuestIds.size > 0);
  const checkInStatusContext: CoordinatorDoorStatusContext = {
    currentEventId: checkInEventId,
    eventGuestIds: args.eventGuestIds,
    eventSeatingConfiguredIds: args.eventSeatingConfiguredIds,
    guests: args.guests,
  };
  const liveEventAudience = liveEventId ? `event:${liveEventId}` : null;
  const liveEvent = args.events.find((event) => event.id === liveEventId) ?? null;
  const upNextEvent = args.events.find((event) => event.id === upNextEventId) ?? null;
  const alertSuggestions = buildCoordinatorAlertSuggestions({ liveEvent, upNextEvent });
  const preferredAlertSuggestion = resolveCoordinatorPreferredAlertSuggestion(alertSuggestions, args.lastAlertSuggestionKey);
  const alertSummary = buildCoordinatorAlertSummary({
    form: args.alertForm,
    audienceOptions: [{ value: 'all', label: 'All guests' }, ...eventAudienceOptions.map((opt) => ({ value: opt.value, label: opt.label }))],
    preferredSuggestion: preferredAlertSuggestion,
    recipientCount: alertAudienceCount,
  });
  const alertLaneLabel = getCoordinatorAlertLaneLabel(preferredAlertSuggestion);
  const alertTargetCue = buildCoordinatorAlertTargetCue({
    preferredSuggestion: preferredAlertSuggestion,
    subject: args.alertForm.subject,
    body: args.alertForm.body,
    audience: args.alertForm.audience,
  });
  const alertOverrideLabel = getCoordinatorAlertOverrideLabel({
    aligned: alertTargetCue.aligned,
    laneLabel: alertLaneLabel,
  });
  const alertOverrideTargetLabel = getCoordinatorAlertOverrideTargetLabel(preferredAlertSuggestion);
  const alertOverrideCurrentLabel = getCoordinatorAlertOverrideCurrentLabel({
    subject: args.alertForm.subject,
    audienceLabel: alertSummary.audienceLabel,
  });
  const alertSummaryStateLabel = getCoordinatorAlertSummaryStateLabel({
    aligned: alertTargetCue.aligned,
    laneLabel: alertLaneLabel,
  });
  const alertSummaryTransitionLabel = getCoordinatorAlertSummaryTransitionLabel({
    previousAligned: args.previousAlertAligned,
    currentAligned: alertTargetCue.aligned,
  });

  const summaryFeedbackTone = args.summaryFeedback ? getCoordinatorSummaryFeedbackTone(args.summaryFeedback.kind) : null;
  const summaryFeedbackBadge = args.summaryFeedback
    ? getCoordinatorSummaryFeedbackBadge({ kind: args.summaryFeedback.kind, panelFocus: args.summaryFeedback.panelFocus })
    : null;
  const summaryFeedbackEmphasis = args.summaryFeedback ? getCoordinatorSummaryFeedbackEmphasis(args.summaryFeedback.kind) : null;
  const summaryFeedbackLayout: 'compact' | 'standard' | 'prominent' | null = args.summaryFeedback
    ? getCoordinatorSummaryFeedbackLayout(args.summaryFeedback.kind)
    : null;
  const summaryFeedbackCopy = args.summaryFeedback
    ? getCoordinatorSummaryFeedbackCopy({ kind: args.summaryFeedback.kind, label: args.summaryFeedback.label })
    : null;
  const executionBoard = buildCoordinatorExecutionBoard(args.summaryFeedback);
  const manualOverrideBadge = getCoordinatorOverrideSupportBadge({ panelFocus: args.panelFocus, kind: 'manual' });
  const alertOverrideBadge = getCoordinatorOverrideSupportBadge({ panelFocus: null, kind: 'alert' });
  const overrideDisplayCue = resolveCoordinatorOverrideDisplayCue({
    alertOverrideLabel: args.alertOverrideLabelState,
    alertOverrideUpdatedAt: args.alertOverrideUpdatedAt,
    manualOverrideLabel: args.manualOverrideLabel,
    manualOverrideUpdatedAt: args.manualOverrideUpdatedAt,
  });
  const summaryDisplayCue = resolveCoordinatorSummaryDisplayCue({
    summaryFeedback: args.summaryFeedback,
    alertOverrideLabel: overrideDisplayCue?.kind === 'alert-override' ? overrideDisplayCue.label : null,
    manualOverrideLabel: overrideDisplayCue?.kind === 'manual-override' ? overrideDisplayCue.label : null,
  });
  const summaryFeedbackBadgeToneClassName = getCoordinatorCommandBadgeTone({
    tone: !args.summaryFeedback
      ? 'neutral'
      : args.summaryFeedback.kind === 'transition'
        ? 'warning'
        : args.summaryFeedback.kind === 'realignment'
          ? 'success'
          : 'primary',
  });
  const overrideBadgeToneClassName = getCoordinatorCommandBadgeTone({ tone: 'warning' });

  const alertStats = {
    total: args.alertLog.length,
    scheduled: args.alertLog.filter((a) => !!a.sendAt).length,
    immediate: args.alertLog.length - args.alertLog.filter((a) => !!a.sendAt).length,
    sms: args.alertLog.filter((a) => a.channel === 'sms').length,
    email: args.alertLog.filter((a) => a.channel === 'email').length,
    byAudience: Array.from(
      args.alertLog.reduce((map, item) => {
        map.set(item.audience, (map.get(item.audience) ?? 0) + 1);
        return map;
      }, new Map<string, number>()).entries(),
    ).slice(0, 3),
  };
  const alertBoard = buildCoordinatorAlertBoard({
    aligned: alertTargetCue.aligned,
    laneLabel: alertLaneLabel,
    audienceLabel: alertSummary.audienceLabel,
    recipientLabel: alertSummary.recipientLabel,
    deliveryLabel: alertSummary.deliveryLabel,
    hasDraftContent: Boolean(args.alertForm.subject.trim() || args.alertForm.body.trim()),
    latestAlert: args.alertLog[0] ?? null,
  });
  const alertActivityBoard = buildCoordinatorAlertActivityBoard(args.alertLog);
  const filteredAlertLog = filterCoordinatorAlertLog({
    alertLog: args.alertLog,
    channelFilter: args.alertChannelFilter,
    timingFilter: args.alertTimingFilter,
  });
  const filteredAlertLogView = buildCoordinatorAlertLogView(filteredAlertLog);

  const nextArrivals = sortedGuests
    .filter((guest) => (!useEventScopedDoorQueue || checkInEventGuestIds?.has(guest.id)))
    .filter((guest) => getCoordinatorDoorStatus(guest, checkInStatusContext) === 'ready')
    .slice(0, 5);
  const checkInWatchCount = args.guests.filter((guest) => getCoordinatorDoorStatus(guest, checkInStatusContext) === 'watch').length;
  const opsSnapshotItems = buildCoordinatorOpsSnapshot({
    role: args.coordinatorRole,
    reviewCount: checkInWatchCount,
    nextArrivalName: nextArrivals[0]?.name ?? null,
    liveEventName: liveEvent?.event_name ?? null,
    upNextEventName: upNextEvent?.event_name ?? null,
    openQnaCount: qnaCounts.open,
    preferredAlertLabel: preferredAlertSuggestion?.label ?? null,
    alertAligned: alertTargetCue.aligned,
    canScheduleAlerts: args.canScheduleAlerts,
  });
  const roleBoard = buildCoordinatorRoleBoard({
    role: args.coordinatorRole,
    capabilities: roleCapabilities,
  });

  const checkInQueueBase = filterCoordinatorCheckInQueue(sortedGuests, args.checkInQuery, args.checkInFilter, checkInStatusContext);
  const checkInQueue = args.checkInReviewOnly
    ? checkInQueueBase.filter((guest) => getCoordinatorDoorStatus(guest, checkInStatusContext) === 'watch')
    : checkInQueueBase;
  const checkInBoardTargetId = getCoordinatorCheckInBoardTargetId(sortedGuests, checkInStatusContext);
  const checkInTargetState = getCoordinatorCheckInTargetState({ boardTargetId: checkInBoardTargetId, activeGuestId: args.activeGuestId });
  const timelineBoardTargetId = getCoordinatorTimelineBoardTargetId({ liveEventId, upNextEventId });
  const timelineTargetState = getCoordinatorTimelineTargetState({ boardTargetId: timelineBoardTargetId, activeTimelineEventId: args.activeTimelineEventId });
  const qnaBoardTargetId = getFirstOpenCoordinatorQnaId(args.qnaItems);
  const qnaTargetState = getCoordinatorQnaTargetState({ boardTargetId: qnaBoardTargetId, activeQnaId: args.activeQnaId });
  const checkInTargetGuest = sortedGuests.find((guest) => guest.id === checkInBoardTargetId) ?? null;
  const activeCheckInGuest = sortedGuests.find((guest) => guest.id === args.activeGuestId) ?? null;
  const checkInBoard = buildCoordinatorCheckInBoard({
    guests: useEventScopedDoorQueue
      ? sortedGuests.filter((guest) => checkInEventGuestIds?.has(guest.id))
      : sortedGuests,
    activeGuest: activeCheckInGuest,
    currentEventName: checkInEvent?.event_name ?? null,
    context: checkInStatusContext,
  });
  const timelineTargetEvent = args.events.find((event) => event.id === timelineBoardTargetId) ?? null;
  const qnaTargetItem = args.qnaItems.find((item) => item.id === qnaBoardTargetId) ?? null;
  const priorityCommandLabel = getCoordinatorCommandPriority({
    checkInLabel: checkInTargetState.label,
    timelineLabel: timelineTargetState.label,
    qnaLabel: qnaTargetState.label,
    alertAligned: alertTargetCue.aligned,
  });
  const priorityCommandReason = getCoordinatorCommandPriorityReason({
    priority: priorityCommandLabel,
    checkInLabel: checkInTargetState.label,
    timelineLabel: timelineTargetState.label,
    qnaLabel: qnaTargetState.label,
    alertAligned: alertTargetCue.aligned,
    alertLaneLabel,
  });
  const priorityCommandTargetReason = getCoordinatorCommandPriorityTargetReason({
    priority: priorityCommandLabel,
    checkInTargetName: checkInTargetGuest?.name ?? null,
    timelineTargetName: timelineTargetEvent?.event_name ?? null,
    qnaTargetQuestion: qnaTargetItem?.question ?? null,
  });
  const priorityCommandCta = getCoordinatorCommandPriorityCta(priorityCommandLabel);
  const commandSummaryItems = buildCoordinatorCommandSummary({
    checkInLabel: checkInTargetState.label,
    timelineLabel: timelineTargetState.label,
    qnaLabel: qnaTargetState.label,
    alertLabel: alertSummaryStateLabel,
    priorityLabel: priorityCommandLabel,
    checkInTargetName: checkInTargetGuest?.name ?? null,
    timelineTargetName: timelineTargetEvent?.event_name ?? null,
    qnaTargetQuestion: qnaTargetItem?.question ?? null,
    alertLaneLabel,
  });
  const commandDeckItems = buildCoordinatorCommandDeck({
    items: commandSummaryItems,
    priorityLabel: priorityCommandLabel,
    priorityReason: priorityCommandReason,
    priorityCta: priorityCommandCta,
    checkInTargetName: checkInTargetGuest?.name ?? null,
    timelineTargetName: timelineTargetEvent?.event_name ?? null,
    qnaTargetQuestion: qnaTargetItem?.question ?? null,
    alertLaneLabel,
  });
  const stablePrompt = buildCoordinatorStablePrompt({
    priority: priorityCommandLabel,
    reason: priorityCommandReason,
    cta: priorityCommandCta,
  });
  const standingPromptMode: 'full' | 'secondary' = getCoordinatorStandingPromptMode(Boolean(summaryDisplayCue));
  const standingPromptBadge = getCoordinatorStandingPromptBadge({ mode: standingPromptMode, badge: stablePrompt.badge });
  const standingPromptCopy = getCoordinatorStandingPromptCopy({ mode: standingPromptMode, label: stablePrompt.label });
  const stablePromptTargetLabel = getCoordinatorStablePromptTargetLabel({
    priority: priorityCommandLabel,
    targetName:
      priorityCommandLabel === 'Check-in'
        ? checkInTargetGuest?.name ?? null
        : priorityCommandLabel === 'Timeline'
          ? timelineTargetEvent?.event_name ?? null
          : priorityCommandLabel === 'Q&A'
            ? qnaTargetItem?.question ?? null
            : alertLaneLabel,
  });
  const stablePromptState = getCoordinatorStablePromptState({ priority: priorityCommandLabel, panelFocus: args.panelFocus });
  const standingPromptStateLabel = getCoordinatorStandingPromptSecondaryState({ mode: standingPromptMode, state: stablePromptState });
  const stablePromptBadgeToneClassName = getCoordinatorCommandBadgeTone({ tone: standingPromptMode === 'secondary' ? 'neutral' : 'primary' });
  const stablePromptStateToneClassName = getCoordinatorCommandBadgeTone({ tone: standingPromptStateLabel ? 'success' : 'neutral' });
  const manualOverrideActionLabel = getCoordinatorManualOverrideActionLabel(args.panelFocus);
  const manualOverrideTargetLabel = getCoordinatorManualOverrideTargetLabel({
    panelFocus: args.panelFocus,
    boardTargetName:
      args.panelFocus === 'check-in'
        ? checkInTargetGuest?.name ?? null
        : args.panelFocus === 'timeline'
          ? timelineTargetEvent?.event_name ?? null
          : args.panelFocus === 'qna'
            ? qnaTargetItem?.question ?? null
            : null,
  });
  const manualOverrideCurrentTargetLabel = getCoordinatorManualOverrideCurrentTargetLabel({
    panelFocus: args.panelFocus,
    currentTargetName:
      args.panelFocus === 'check-in'
        ? sortedGuests.find((guest) => guest.id === args.activeGuestId)?.name ?? null
        : args.panelFocus === 'timeline'
          ? args.events.find((event) => event.id === args.activeTimelineEventId)?.event_name ?? null
          : args.panelFocus === 'qna'
            ? args.qnaItems.find((item) => item.id === args.activeQnaId)?.question ?? null
            : null,
  });

  const liveIssues = buildCoordinatorEscalations({
    guests: args.guests,
    qnaItems: args.qnaItems,
    events: args.events as CoordinatorTimelineEventLite[],
    timelineState: args.timelineState,
    currentEventName: checkInEvent?.event_name ?? null,
    doorStatusContext: checkInStatusContext,
  });
  const primaryAction: CoordinatorPrimaryAction = buildCoordinatorPrimaryAction({
    guests: args.guests,
    qnaItems: args.qnaItems as CoordinatorQnaItem[],
    events: args.events as CoordinatorTimelineEventLite[],
    timelineState: args.timelineState,
    doorStatusContext: checkInStatusContext,
  });
  const primaryActionTarget = resolveCoordinatorPrimaryActionTarget(primaryAction);
  const primaryActionBoard = buildCoordinatorPrimaryActionBoard({
    action: primaryAction,
    target: primaryActionTarget,
    canAutoRunTimeline: Boolean(upNextEventId && args.canEditTimeline),
  });
  const navigationBoard = buildCoordinatorNavigationBoard({
    panelFocus: args.panelFocus,
    boardTargetName:
      args.panelFocus === 'check-in'
        ? checkInTargetGuest?.name ?? null
        : args.panelFocus === 'timeline'
          ? timelineTargetEvent?.event_name ?? null
          : args.panelFocus === 'qna'
            ? qnaTargetItem?.question ?? null
            : null,
    reviewOnly: args.panelFocus === 'check-in' ? args.checkInReviewOnly : false,
  });
  const secondaryCommandLabel = commandSummaryItems.find((item) => item.label !== priorityCommandLabel)?.label ?? null;
  const commandBoard = buildCoordinatorCommandBoard({
    priority: priorityCommandLabel,
    reason: priorityCommandReason,
    targetReason: priorityCommandTargetReason,
    cta: priorityCommandCta,
    secondary: secondaryCommandLabel,
    primaryActionTitle: primaryAction.title,
  });
  const commandModeLabel = getCoordinatorCommandModeLabel(args.commandSource);
  const commandModeGuidance = getCoordinatorCommandModeGuidance(args.commandSource);
  const correctionCues = buildCoordinatorCorrectionCues({
    guests: args.guests,
    events: args.events as CoordinatorTimelineEventLite[],
    timelineState: args.timelineState,
  });
  const correctionGuestId = getCoordinatorCorrectionGuestId(sortedGuests);
  const correctionEventId = getCoordinatorCorrectionEventId(args.events as CoordinatorTimelineEventLite[], args.timelineState);
  const timelineBoard = buildCoordinatorTimelineBoard({
    events: args.events as CoordinatorTimelineEventLite[],
    timelineState: args.timelineState,
    liveEventId,
    upNextEventId,
  });

  return {
    activeCheckInGuest,
    activeQnaDraftStateLabel,
    activeQnaDraftValue,
    activeQnaItem,
    alertActivityBoard,
    alertAudienceCount,
    alertBoard,
    alertLaneLabel,
    alertOverrideBadge,
    alertOverrideCurrentLabel,
    alertOverrideLabel,
    alertOverrideTargetLabel,
    alertStats,
    alertSuggestions,
    alertSummary,
    alertSummaryStateLabel,
    alertSummaryTransitionLabel,
    alertTargetCue,
    checkInBoard,
    checkInEventId,
    checkInEventName: checkInEvent?.event_name ?? null,
    checkInBoardTargetId,
    checkInQueue,
    checkInStatusContext,
    checkInTargetGuest,
    checkInTargetState,
    checkInWatchCount,
    commandBoard,
    commandDeckItems,
    commandModeGuidance,
    commandModeLabel,
    commandSummaryItems,
    correctionCues,
    correctionEventId,
    correctionGuestId,
    eventAudienceOptions,
    executionBoard,
    filteredAlertLog,
    filteredAlertLogView,
    filteredQnaItems,
    liveEvent,
    liveEventAudience,
    liveEventId,
    liveIssues,
    manualOverrideActionLabel,
    manualOverrideBadge,
    manualOverrideCurrentTargetLabel,
    manualOverrideTargetLabel,
    navigationBoard,
    nextArrivals,
    opsSnapshotItems,
    overrideBadgeToneClassName,
    overrideDisplayCue,
    preferredAlertSuggestion,
    primaryAction,
    primaryActionBoard,
    primaryActionTarget,
    priorityCommandCta,
    priorityCommandLabel,
    priorityCommandReason,
    priorityCommandTargetReason,
    qnaBoard,
    qnaBoardTargetId,
    qnaCounts,
    qnaTargetItem,
    qnaTargetState,
    roleBoard,
    roleCapabilities,
    secondaryCommandLabel,
    sortedGuests,
    stablePrompt,
    stablePromptBadgeToneClassName,
    stablePromptState,
    stablePromptStateToneClassName,
    stablePromptTargetLabel,
    standingPromptBadge,
    standingPromptCopy,
    standingPromptMode,
    standingPromptStateLabel,
    stats,
    summaryDisplayCue,
    summaryFeedbackBadge,
    summaryFeedbackBadgeToneClassName,
    summaryFeedbackCopy,
    summaryFeedbackEmphasis,
    summaryFeedbackLayout,
    summaryFeedbackTone,
    timelineBoard,
    timelineBoardTargetId,
    timelineTargetEvent,
    timelineTargetState,
    upNextEvent,
    upNextEventId,
  };
}
