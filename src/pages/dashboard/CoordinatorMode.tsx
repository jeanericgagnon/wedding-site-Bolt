import React, { useEffect, useMemo, useState } from 'react';
import { Input, Textarea } from '../../components/ui';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { DashboardPageHero } from '../../components/dashboard/DashboardPageHero';
import { useAuth } from '../../hooks/useAuth';
import { type PlannerAccessRole, type PlannerPermissionKey } from '../../lib/plannerAccess';
import { useToast } from '../../components/ui/Toast';
import { filterCoordinatorCheckInQueue, type CoordinatorCheckInFilter } from '../../lib/coordinatorCheckInQueue';
import { getNextCoordinatorCheckInFocusId } from '../../lib/coordinatorCheckInAdvance';
import { getCoordinatorDoorStatus } from '../../lib/coordinatorCheckInStatus';
import { buildCoordinatorDoorEscalationPrompt } from '../../lib/coordinatorDoorEscalation';
import { buildCoordinatorEscalations } from '../../lib/coordinatorEscalations';
import { buildCoordinatorPrimaryAction } from '../../lib/coordinatorPrimaryAction';
import { buildCoordinatorCorrectionCues } from '../../lib/coordinatorCorrectionsSummary';
import { resolveCoordinatorCorrectionCueTarget } from '../../lib/coordinatorCorrectionCueTarget';
import { getCoordinatorCorrectionEventId, getCoordinatorCorrectionGuestId } from '../../lib/coordinatorCorrectionTarget';
import { resolveCoordinatorPrimaryActionTarget } from '../../lib/coordinatorPrimaryActionTarget';
import { resolveCoordinatorQueueFocus } from '../../lib/coordinatorQueueFocus';
import { resolveCoordinatorPanelFocus, type CoordinatorPanelFocus } from '../../lib/coordinatorPanelFocus';
import { resolveCoordinatorEscalationTimelineTarget } from '../../lib/coordinatorEscalationAction';
import { getCoordinatorCommandModeLabel } from '../../lib/coordinatorCommandModeLabel';
import { getCoordinatorCommandModeGuidance } from '../../lib/coordinatorCommandModeGuidance';
import { resolveCoordinatorReturnToBoardState } from '../../lib/coordinatorReturnToBoard';
import { getCoordinatorNeutralFocusReason } from '../../lib/coordinatorNeutralFocusReason';
import { resolveCoordinatorNeutralFocusTarget } from '../../lib/coordinatorNeutralFocusTarget';
import { getCoordinatorActiveTargetLabel } from '../../lib/coordinatorActiveTargetLabel';
import { getCoordinatorCheckInBoardTargetId, getCoordinatorCheckInTargetState } from '../../lib/coordinatorCheckInTargetState';
import { getCoordinatorTimelineBoardTargetId, getCoordinatorTimelineTargetState } from '../../lib/coordinatorTimelineTargetState';
import { getCoordinatorQnaTargetState } from '../../lib/coordinatorQnaTargetState';
import { getCoordinatorTimelineTransitionLabel, syncCoordinatorAlertDraftForTimelineTransition } from '../../lib/coordinatorTimelineTransition';
import { buildCoordinatorCommandSummary } from '../../lib/coordinatorCommandSummary';
import { getCoordinatorCommandSummaryTarget } from '../../lib/coordinatorCommandSummaryTarget';
import { getCoordinatorCommandPriority } from '../../lib/coordinatorCommandPriority';
import { getCoordinatorCommandPriorityReason } from '../../lib/coordinatorCommandPriorityReason';
import { getCoordinatorCommandPriorityTargetReason } from '../../lib/coordinatorCommandPriorityTargetReason';
import { getCoordinatorCommandPriorityCta } from '../../lib/coordinatorCommandPriorityCta';
import { getCoordinatorCommandJumpLabel } from '../../lib/coordinatorCommandJumpLabel';
import { shouldResetCoordinatorCommandJumpLabel } from '../../lib/coordinatorCommandJumpReset';
import { shouldResetCoordinatorCommandJumpLabelForTargetChange } from '../../lib/coordinatorCommandJumpTargetReset';
import { getCoordinatorManualOverrideLabel } from '../../lib/coordinatorManualOverrideLabel';
import { getCoordinatorManualOverrideActionLabel } from '../../lib/coordinatorManualOverrideAction';
import { getCoordinatorManualOverrideTargetLabel } from '../../lib/coordinatorManualOverrideTargetLabel';
import { getCoordinatorManualOverrideCurrentTargetLabel } from '../../lib/coordinatorManualOverrideCurrentTargetLabel';
import { shouldResetCoordinatorManualOverride } from '../../lib/coordinatorManualOverrideReset';
import { getCoordinatorRealignmentLabel } from '../../lib/coordinatorRealignmentLabel';
import { buildCoordinatorAlertTargetCue } from '../../lib/coordinatorAlertTargetCue';
import { applyCoordinatorAlertSuggestion } from '../../lib/coordinatorAlertSuggestionApply';
import { getCoordinatorAlertOverrideLabel } from '../../lib/coordinatorAlertOverrideLabel';
import { getCoordinatorAlertOverrideTargetLabel } from '../../lib/coordinatorAlertOverrideTargetLabel';
import { getCoordinatorAlertOverrideCurrentLabel } from '../../lib/coordinatorAlertOverrideCurrentLabel';
import { shouldResetCoordinatorAlertOverride } from '../../lib/coordinatorAlertOverrideReset';
import { getCoordinatorAlertSummaryStateLabel } from '../../lib/coordinatorAlertSummaryStateLabel';
import { getCoordinatorAlertSummaryTransitionLabel } from '../../lib/coordinatorAlertSummaryTransitionLabel';
import { shouldResetCoordinatorSummaryFeedback } from '../../lib/coordinatorSummaryFeedbackReset';
import { createCoordinatorSummaryFeedback, type CoordinatorSummaryFeedback } from '../../lib/coordinatorSummaryFeedback';
import { getCoordinatorSummaryFeedbackTone } from '../../lib/coordinatorSummaryFeedbackTone';
import { getCoordinatorSummaryFeedbackEmphasis } from '../../lib/coordinatorSummaryFeedbackEmphasis';
import { getCoordinatorSummaryFeedbackLayout } from '../../lib/coordinatorSummaryFeedbackLayout';
import { getCoordinatorSummaryFeedbackCopy } from '../../lib/coordinatorSummaryFeedbackCopy';
import { getCoordinatorSummaryFeedbackBadge } from '../../lib/coordinatorSummaryFeedbackBadge';
import { getCoordinatorOverrideSupportBadge } from '../../lib/coordinatorOverrideSupportBadge';
import { resolveCoordinatorSummaryDisplayCue } from '../../lib/coordinatorSummaryDisplayCue';
import { resolveCoordinatorOverrideDisplayCue } from '../../lib/coordinatorOverrideDisplayCue';
import { shouldExpireCoordinatorCue } from '../../lib/coordinatorCueExpiry';
import { shouldExpireCoordinatorOverrideCue } from '../../lib/coordinatorOverrideCueExpiry';
import { canManageCoordinatorCheckIn, canManageCoordinatorQna, canManageCoordinatorTimeline, canScheduleCoordinatorAlerts, canSendImmediateCoordinatorAlerts } from '../../lib/coordinatorRoleAccess';
import type { GuestLiteForCoordinator } from '../../lib/coordinatorTypes';
import { setCoordinatorEventTimelineState } from '../../lib/coordinatorTimelineState';
import { getCoordinatorLiveEventId, getCoordinatorUpNextEventId } from '../../lib/coordinatorTimelineFocus';
import { resolveCoordinatorTimelineAlertIntent } from '../../lib/coordinatorTimelineAlertIntent';
import { appendCoordinatorAlertLogItem, resolveCoordinatorScheduledFor, validateCoordinatorAlertForm } from '../../lib/coordinatorAlertFlow';
import { resetCoordinatorAlertFormAfterSend } from '../../lib/coordinatorAlertReset';
import { buildCoordinatorAlertSuggestions } from '../../lib/coordinatorAlertSuggestions';
import { buildCoordinatorAlertSummary } from '../../lib/coordinatorAlertSummary';
import { getCoordinatorAlertLaneLabel } from '../../lib/coordinatorAlertLane';
import { resolveCoordinatorPreferredAlertSuggestion } from '../../lib/coordinatorAlertIntent';
import { getCoordinatorQnaCounts, updateCoordinatorQnaItem } from '../../lib/coordinatorQnaFlow';
import { getFirstOpenCoordinatorQnaId, getNextCoordinatorQnaFocusId } from '../../lib/coordinatorQnaFocus';
import { filterCoordinatorQnaItems, getCoordinatorQnaDraftStateLabel, type CoordinatorQnaFilter } from '../../lib/coordinatorQnaTriage';
import { resolveCoordinatorQnaFocusAfterItemsChange, resolveCoordinatorTimelineFocusAfterStateChange } from '../../lib/coordinatorResolvedFocus';
import { buildCoordinatorStablePrompt } from '../../lib/coordinatorStablePrompt';
import { getCoordinatorStablePromptState } from '../../lib/coordinatorStablePromptState';
import { getCoordinatorStablePromptTarget } from '../../lib/coordinatorStablePromptTarget';
import { getCoordinatorStablePromptTargetLabel } from '../../lib/coordinatorStablePromptTargetLabel';
import { getCoordinatorStandingPromptBadge } from '../../lib/coordinatorStandingPromptBadge';
import { getCoordinatorStandingPromptReason } from '../../lib/coordinatorStandingPromptReason';
import { getCoordinatorStandingPromptReasonTightened } from '../../lib/coordinatorStandingPromptReasonTighten';
import { getCoordinatorStandingPromptCopy } from '../../lib/coordinatorStandingPromptCopy';
import { getCoordinatorStandingPromptMode } from '../../lib/coordinatorStandingPromptMode';
import { getCoordinatorStandingPromptSecondaryState } from '../../lib/coordinatorStandingPromptSecondaryState';
import { getCoordinatorCommandBadgeTone } from '../../lib/coordinatorCommandBadgeTone';
import { buildCoordinatorOpsSnapshot } from '../../lib/coordinatorOpsSnapshot';
import { buildCoordinatorRoleCapabilities } from '../../lib/coordinatorRoleCapabilities';
import { buildCoordinatorCommandDeck } from '../../lib/coordinatorCommandDeck';
import { buildCoordinatorAlertBoard } from '../../lib/coordinatorAlertBoard';
import { buildCoordinatorTimelineBoard } from '../../lib/coordinatorTimelineBoard';
import { buildCoordinatorQnaBoard } from '../../lib/coordinatorQnaBoard';
import { buildCoordinatorCheckInBoard } from '../../lib/coordinatorCheckInBoard';
import { buildCoordinatorCommandBoard } from '../../lib/coordinatorCommandBoard';
import { buildCoordinatorRoleBoard } from '../../lib/coordinatorRoleBoard';
import { buildCoordinatorAlertActivityBoard } from '../../lib/coordinatorAlertActivityBoard';
import { buildCoordinatorPrimaryActionBoard } from '../../lib/coordinatorPrimaryActionBoard';
import { buildCoordinatorExecutionBoard } from '../../lib/coordinatorExecutionBoard';
import { buildCoordinatorAlertLogView } from '../../lib/coordinatorAlertLogView';
import { buildCoordinatorNavigationBoard } from '../../lib/coordinatorNavigationBoard';
import type { AlertLog, AudienceOption, EventLite, QnaItem, TimelineState } from './coordinator/coordinatorDashboardTypes';
import {
  buildCoordinatorEventAudienceOptions,
  buildCoordinatorGuestStats,
  filterCoordinatorAlertLog,
  getCoordinatorAlertAudienceCount,
  sortCoordinatorGuests,
} from './coordinator/coordinatorDashboardUtils';
import {
  readStoredCoordinatorQnaItems,
} from './coordinator/coordinatorStorage';
import {
  createCoordinatorAlertMessage,
  createCoordinatorQnaQuestion,
  updateCoordinatorGuestCheckIn,
  updateCoordinatorQnaAnswer,
} from './coordinator/coordinatorService';
import { buildCoordinatorDashboardBoardActions } from './coordinator/buildCoordinatorDashboardBoardActions';
import { CoordinatorAttentionPanel, CoordinatorCheckInQueuePanel, CoordinatorDayOfMessagePanel, CoordinatorDayOfSummaryPanel, CoordinatorHandoffPanel, CoordinatorHelperAccessPanel, CoordinatorRoleSelector, CoordinatorStatCards, CoordinatorTimelinePanel } from './coordinator/CoordinatorModePanels';
import { buildCoordinatorDashboardFocusActions } from './coordinator/buildCoordinatorDashboardFocusActions';
import { useCoordinatorDashboardData } from './coordinator/useCoordinatorDashboardData';


export const DashboardCoordinatorMode: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const { toast } = useToast();
  const [alertBusy, setAlertBusy] = useState(false);
  const [neutralFocusReason, setNeutralFocusReason] = useState<string | null>(null);
  const [commandJumpLabel, setCommandJumpLabel] = useState<string | null>(null);
  const [commandJumpPanelFocus, setCommandJumpPanelFocus] = useState<CoordinatorPanelFocus | null>(null);
  const [commandJumpTargetId, setCommandJumpTargetId] = useState<string | null>(null);
  const [manualOverrideLabel, setManualOverrideLabel] = useState<string | null>(null);
  const [manualOverrideUpdatedAt, setManualOverrideUpdatedAt] = useState<number | null>(null);
  const [alertOverrideLabelState, setAlertOverrideLabelState] = useState<string | null>(null);
  const [alertOverrideUpdatedAt, setAlertOverrideUpdatedAt] = useState<number | null>(null);
  const [overrideCueShownAt, setOverrideCueShownAt] = useState<number | null>(null);
  const [summaryFeedbackShownAt, setSummaryFeedbackShownAt] = useState<number | null>(null);
  const [previousAlertAligned, setPreviousAlertAligned] = useState<boolean | null>(null);
  const [summaryFeedback, setSummaryFeedback] = useState<CoordinatorSummaryFeedback | null>(null);
  const [checkInBusyGuestId, setCheckInBusyGuestId] = useState<string | null>(null);
  const {
    activeGuestId,
    activeQnaId,
    activeSiteRole,
    activeTimelineEventId,
    alertChannelFilter,
    alertForm,
    alertLog,
    alertTimingFilter,
    checkInFilter,
    checkInQuery,
    checkInReviewOnly,
    commandSource,
    coordinatorPermissions,
    coordinatorRole,
    eventGuestIds,
    events,
    guests,
    lastAlertSuggestionKey,
    loading,
    panelFocus,
    qnaDraftAnswers,
    qnaFilter,
    qnaInput,
    qnaItems,
    setActiveGuestId,
    setActiveQnaId,
    setActiveTimelineEventId,
    setAlertChannelFilter,
    setAlertForm,
    setAlertLog,
    setAlertTimingFilter,
    setCheckInFilter,
    setCheckInQuery,
    setCheckInReviewOnly,
    setCommandSource,
    setCoordinatorRole,
    setEvents,
    setGuests,
    setLastAlertSuggestionKey,
    setPanelFocus,
    setQnaDraftAnswers,
    setQnaFilter,
    setQnaInput,
    setQnaItems,
    setTimelineState,
    siteId,
    timelineState,
  } = useCoordinatorDashboardData({
    isDemoMode,
    toast,
    userId: user?.id,
  });
  const stats = useMemo(() => buildCoordinatorGuestStats(guests), [guests]);

  const toggleCheckIn = async (guest: GuestLiteForCoordinator) => {
    if (!canCheckIn) {
      toast('Your collaborator role cannot update coordinator check-in.', 'info');
      return;
    }

    if (checkInBusyGuestId === guest.id) return;

    const next = guest.checked_in_at ? null : new Date().toISOString();
    const removesFromCurrentQueue = !guest.checked_in_at && (checkInFilter !== 'checked-in');
    const nextFocusGuestId = getNextCoordinatorCheckInFocusId({
      queue: checkInQueue,
      activeGuestId: guest.id,
      removeActiveGuest: removesFromCurrentQueue,
    });

    setCheckInBusyGuestId(guest.id);

    try {
      if (isDemoMode) {
        setGuests((prev) => prev.map((g) => (g.id === guest.id ? { ...g, checked_in_at: next } : g)));
        setActiveGuestId(nextFocusGuestId);
        toast(next ? 'Guest checked in. Door focus moved to the next guest.' : 'Guest moved back to arrivals.', 'success');
        return;
      }

      if (!siteId) return;

      try {
        await updateCoordinatorGuestCheckIn({ siteId, guestId: guest.id, checkedInAt: next });
      } catch {
        toast('Couldn’t update check-in right now.', 'error');
        return;
      }

      setGuests((prev) => prev.map((g) => (g.id === guest.id ? { ...g, checked_in_at: next } : g)));
      setActiveGuestId(nextFocusGuestId);
      toast(next ? 'Guest checked in. Door focus moved to the next guest.' : 'Guest moved back to arrivals.', 'success');
    } finally {
      setCheckInBusyGuestId((current) => (current === guest.id ? null : current));
    }
  };

  const sortedGuests = useMemo(() => sortCoordinatorGuests(guests), [guests]);
  const eventAudienceOptions: AudienceOption[] = useMemo(
    () => buildCoordinatorEventAudienceOptions(events, eventGuestIds),
    [events, eventGuestIds],
  );
  const alertAudienceCount = useMemo(
    () => getCoordinatorAlertAudienceCount({ audience: alertForm.audience, guests, eventGuestIds }),
    [alertForm.audience, guests, eventGuestIds],
  );

  const canCheckIn = canManageCoordinatorCheckIn(coordinatorRole, coordinatorPermissions);
  const canEditTimeline = canManageCoordinatorTimeline(coordinatorRole, coordinatorPermissions);
  const canEditQna = canManageCoordinatorQna(coordinatorRole, coordinatorPermissions);
  const canSendAlerts = canSendImmediateCoordinatorAlerts(coordinatorRole, coordinatorPermissions);
  const canScheduleAlerts = canScheduleCoordinatorAlerts(coordinatorRole, coordinatorPermissions);

  const qnaCounts = useMemo(() => getCoordinatorQnaCounts(qnaItems), [qnaItems]);
  const filteredQnaItems = useMemo(() => filterCoordinatorQnaItems(qnaItems, qnaFilter), [qnaItems, qnaFilter]);
  const activeQnaItem = useMemo(() => qnaItems.find((item) => item.id === activeQnaId) ?? null, [qnaItems, activeQnaId]);
  const activeQnaDraftValue = useMemo(
    () => (activeQnaId ? (qnaDraftAnswers[activeQnaId] ?? activeQnaItem?.answer ?? '') : ''),
    [activeQnaId, qnaDraftAnswers, activeQnaItem?.answer],
  );
  const activeQnaDraftStateLabel = useMemo(
    () => getCoordinatorQnaDraftStateLabel({ draftAnswer: activeQnaDraftValue, savedAnswer: activeQnaItem?.answer }),
    [activeQnaDraftValue, activeQnaItem?.answer],
  );
  const qnaBoard = useMemo(() => buildCoordinatorQnaBoard({
    items: qnaItems,
    activeItem: activeQnaItem,
    activeDraftStateLabel: activeQnaDraftStateLabel,
  }), [qnaItems, activeQnaItem, activeQnaDraftStateLabel]);

  useEffect(() => {
    setActiveQnaId((prev) => resolveCoordinatorQnaFocusAfterItemsChange(qnaItems, prev));
  }, [qnaItems]);

  useEffect(() => {
    setActiveTimelineEventId((prev) => resolveCoordinatorTimelineFocusAfterStateChange({
      events,
      timelineState,
      activeTimelineEventId: prev,
    }));
  }, [events, timelineState]);

  const alertValidationError = useMemo(() => validateCoordinatorAlertForm(alertForm, alertAudienceCount), [alertForm, alertAudienceCount]);

  useEffect(() => {
    if (canSendAlerts && (canScheduleAlerts || alertForm.scheduleType !== 'later')) return;

    setAlertForm((prev) => {
      if (!canSendAlerts && prev.scheduleType === 'now') return prev;
      if (canSendAlerts && prev.scheduleType !== 'later') return prev;
      return {
        ...prev,
        scheduleType: 'now',
        scheduleDate: '',
        scheduleTime: '',
      };
    });
  }, [canSendAlerts, canScheduleAlerts, alertForm.scheduleType]);

  const roleCapabilities = useMemo(() => buildCoordinatorRoleCapabilities(coordinatorRole), [coordinatorRole]);

  const liveEventId = useMemo(() => getCoordinatorLiveEventId(events, timelineState), [events, timelineState]);
  const upNextEventId = useMemo(() => getCoordinatorUpNextEventId(events, timelineState), [events, timelineState]);

  const liveEventAudience = useMemo(() => {
    const live = events.find((e) => e.id === liveEventId);
    return live ? `event:${live.id}` : null;
  }, [events, liveEventId]);

  const liveEvent = useMemo(() => events.find((event) => event.id === liveEventId) ?? null, [events, liveEventId]);
  const upNextEvent = useMemo(() => events.find((event) => event.id === upNextEventId) ?? null, [events, upNextEventId]);
  const alertSuggestions = useMemo(() => buildCoordinatorAlertSuggestions({ liveEvent, upNextEvent }), [liveEvent, upNextEvent]);
  const preferredAlertSuggestion = useMemo(() => resolveCoordinatorPreferredAlertSuggestion(alertSuggestions, lastAlertSuggestionKey), [alertSuggestions, lastAlertSuggestionKey]);
  const alertSummary = useMemo(() => buildCoordinatorAlertSummary({
    form: alertForm,
    audienceOptions: [
      { value: 'all', label: 'All guests' },
      ...eventAudienceOptions.map((opt) => ({ value: opt.value, label: opt.label })),
    ],
    preferredSuggestion: preferredAlertSuggestion,
    recipientCount: alertAudienceCount,
  }), [alertForm, eventAudienceOptions, preferredAlertSuggestion, alertAudienceCount]);
  const alertLaneLabel = useMemo(() => getCoordinatorAlertLaneLabel(preferredAlertSuggestion), [preferredAlertSuggestion]);
  const alertTargetCue = useMemo(() => buildCoordinatorAlertTargetCue({
    preferredSuggestion: preferredAlertSuggestion,
    subject: alertForm.subject,
    body: alertForm.body,
    audience: alertForm.audience,
  }), [preferredAlertSuggestion, alertForm.subject, alertForm.body, alertForm.audience]);
  const alertOverrideLabel = useMemo(() => getCoordinatorAlertOverrideLabel({
    aligned: alertTargetCue.aligned,
    laneLabel: alertLaneLabel,
  }), [alertTargetCue.aligned, alertLaneLabel]);
  const alertOverrideTargetLabel = useMemo(() => getCoordinatorAlertOverrideTargetLabel(preferredAlertSuggestion), [preferredAlertSuggestion]);
  const alertOverrideCurrentLabel = useMemo(() => getCoordinatorAlertOverrideCurrentLabel({
    subject: alertForm.subject,
    audienceLabel: alertSummary.audienceLabel,
  }), [alertForm.subject, alertSummary.audienceLabel]);
  const alertSummaryStateLabel = useMemo(() => getCoordinatorAlertSummaryStateLabel({
    aligned: alertTargetCue.aligned,
    laneLabel: alertLaneLabel,
  }), [alertTargetCue.aligned, alertLaneLabel]);
  const alertSummaryTransitionLabel = useMemo(() => getCoordinatorAlertSummaryTransitionLabel({
    previousAligned: previousAlertAligned,
    currentAligned: alertTargetCue.aligned,
  }), [previousAlertAligned, alertTargetCue.aligned]);
  const summaryFeedbackTone = useMemo(() => summaryFeedback ? getCoordinatorSummaryFeedbackTone(summaryFeedback.kind) : null, [summaryFeedback]);
  const summaryFeedbackBadge = useMemo(() => summaryFeedback ? getCoordinatorSummaryFeedbackBadge({ kind: summaryFeedback.kind, panelFocus: summaryFeedback.panelFocus }) : null, [summaryFeedback]);
  const summaryFeedbackEmphasis = useMemo(() => summaryFeedback ? getCoordinatorSummaryFeedbackEmphasis(summaryFeedback.kind) : null, [summaryFeedback]);
  const summaryFeedbackLayout = useMemo(() => summaryFeedback ? getCoordinatorSummaryFeedbackLayout(summaryFeedback.kind) : null, [summaryFeedback]);
  const summaryFeedbackCopy = useMemo(() => summaryFeedback ? getCoordinatorSummaryFeedbackCopy({ kind: summaryFeedback.kind, label: summaryFeedback.label }) : null, [summaryFeedback]);
  const executionBoard = useMemo(() => buildCoordinatorExecutionBoard(summaryFeedback), [summaryFeedback]);
  const manualOverrideBadge = useMemo(() => getCoordinatorOverrideSupportBadge({ panelFocus, kind: 'manual' }), [panelFocus]);
  const alertOverrideBadge = useMemo(() => getCoordinatorOverrideSupportBadge({ panelFocus: null, kind: 'alert' }), []);
  const overrideDisplayCue = useMemo(() => resolveCoordinatorOverrideDisplayCue({
    alertOverrideLabel: alertOverrideLabelState,
    alertOverrideUpdatedAt,
    manualOverrideLabel,
    manualOverrideUpdatedAt,
  }), [alertOverrideLabelState, alertOverrideUpdatedAt, manualOverrideLabel, manualOverrideUpdatedAt]);
  const summaryDisplayCue = useMemo(() => resolveCoordinatorSummaryDisplayCue({
    summaryFeedback,
    alertOverrideLabel: overrideDisplayCue?.kind === 'alert-override' ? overrideDisplayCue.label : null,
    manualOverrideLabel: overrideDisplayCue?.kind === 'manual-override' ? overrideDisplayCue.label : null,
  }), [summaryFeedback, overrideDisplayCue]);
  const summaryFeedbackBadgeToneClassName = useMemo(() => {
    if (!summaryFeedback) return getCoordinatorCommandBadgeTone({ tone: 'neutral' });
    return getCoordinatorCommandBadgeTone({
      tone: summaryFeedback.kind === 'transition'
        ? 'warning'
        : summaryFeedback.kind === 'realignment'
          ? 'success'
          : 'primary',
    });
  }, [summaryFeedback]);
  const overrideBadgeToneClassName = useMemo(() => getCoordinatorCommandBadgeTone({ tone: 'warning' }), []);

  useEffect(() => {
    if (shouldResetCoordinatorAlertOverride({
      overrideLabel: alertOverrideLabelState,
      aligned: alertTargetCue.aligned,
    })) {
      setAlertOverrideLabelState(null);
      setAlertOverrideUpdatedAt(null);
      setOverrideCueShownAt(null);
    }
  }, [alertOverrideLabelState, alertTargetCue.aligned]);

  useEffect(() => {
    if (!preferredAlertSuggestion) return;
    setAlertForm((prev) => {
      if (prev.subject.trim() || prev.body.trim()) return prev;
      return {
        ...prev,
        audience: prev.audience || liveEventAudience || preferredAlertSuggestion.audience,
        subject: preferredAlertSuggestion.subject,
        body: preferredAlertSuggestion.body,
      };
    });
  }, [preferredAlertSuggestion, liveEventAudience]);

  const alertStats = useMemo(() => {
    const total = alertLog.length;
    const scheduled = alertLog.filter((a) => !!a.sendAt).length;
    const immediate = total - scheduled;
    const sms = alertLog.filter((a) => a.channel === 'sms').length;
    const email = alertLog.filter((a) => a.channel === 'email').length;
    const byAudience = Array.from(alertLog.reduce((map, item) => {
      map.set(item.audience, (map.get(item.audience) ?? 0) + 1);
      return map;
    }, new Map<string, number>()).entries()).slice(0, 3);
    return { total, scheduled, immediate, sms, email, byAudience };
  }, [alertLog]);
  const alertBoard = useMemo(() => buildCoordinatorAlertBoard({
    aligned: alertTargetCue.aligned,
    laneLabel: alertLaneLabel,
    audienceLabel: alertSummary.audienceLabel,
    recipientLabel: alertSummary.recipientLabel,
    deliveryLabel: alertSummary.deliveryLabel,
    hasDraftContent: Boolean(alertForm.subject.trim() || alertForm.body.trim()),
    latestAlert: alertLog[0] ?? null,
  }), [
    alertTargetCue.aligned,
    alertLaneLabel,
    alertSummary.audienceLabel,
    alertSummary.recipientLabel,
    alertSummary.deliveryLabel,
    alertForm.subject,
    alertForm.body,
    alertLog,
  ]);
  const alertActivityBoard = useMemo(() => buildCoordinatorAlertActivityBoard(alertLog), [alertLog]);


  const nextArrivals = useMemo(
    () => sortedGuests.filter((g) => !g.checked_in_at && getCoordinatorDoorStatus(g) === 'ready').slice(0, 5),
    [sortedGuests],
  );
  const checkInWatchCount = useMemo(() => guests.filter((guest) => getCoordinatorDoorStatus(guest) === 'watch').length, [guests]);
  const opsSnapshotItems = useMemo(() => buildCoordinatorOpsSnapshot({
    role: coordinatorRole,
    reviewCount: checkInWatchCount,
    nextArrivalName: nextArrivals[0]?.name ?? null,
    liveEventName: liveEvent?.event_name ?? null,
    upNextEventName: upNextEvent?.event_name ?? null,
    openQnaCount: qnaCounts.open,
    preferredAlertLabel: preferredAlertSuggestion?.label ?? null,
    alertAligned: alertTargetCue.aligned,
    canScheduleAlerts,
  }), [
    coordinatorRole,
    checkInWatchCount,
    nextArrivals,
    liveEvent?.event_name,
    upNextEvent?.event_name,
    qnaCounts.open,
    preferredAlertSuggestion?.label,
    alertTargetCue.aligned,
    canScheduleAlerts,
  ]);
  const roleBoard = useMemo(() => buildCoordinatorRoleBoard({
    role: coordinatorRole,
    capabilities: roleCapabilities,
  }), [coordinatorRole, roleCapabilities]);

  const checkInQueue = useMemo(() => {
    const base = filterCoordinatorCheckInQueue(sortedGuests, checkInQuery, checkInFilter);
    return checkInReviewOnly ? base.filter((guest) => getCoordinatorDoorStatus(guest) === 'watch') : base;
  }, [sortedGuests, checkInQuery, checkInFilter, checkInReviewOnly]);
  const checkInBoardTargetId = useMemo(() => getCoordinatorCheckInBoardTargetId(sortedGuests), [sortedGuests]);
  const checkInTargetState = useMemo(() => getCoordinatorCheckInTargetState({ boardTargetId: checkInBoardTargetId, activeGuestId }), [checkInBoardTargetId, activeGuestId]);
  const timelineBoardTargetId = useMemo(() => getCoordinatorTimelineBoardTargetId({ liveEventId, upNextEventId }), [liveEventId, upNextEventId]);
  const timelineTargetState = useMemo(() => getCoordinatorTimelineTargetState({ boardTargetId: timelineBoardTargetId, activeTimelineEventId }), [timelineBoardTargetId, activeTimelineEventId]);
  const qnaBoardTargetId = useMemo(() => getFirstOpenCoordinatorQnaId(qnaItems), [qnaItems]);
  const qnaTargetState = useMemo(() => getCoordinatorQnaTargetState({ boardTargetId: qnaBoardTargetId, activeQnaId }), [qnaBoardTargetId, activeQnaId]);
  const checkInTargetGuest = useMemo(() => sortedGuests.find((guest) => guest.id === checkInBoardTargetId) ?? null, [sortedGuests, checkInBoardTargetId]);
  const activeCheckInGuest = useMemo(() => sortedGuests.find((guest) => guest.id === activeGuestId) ?? null, [sortedGuests, activeGuestId]);
  const checkInBoard = useMemo(() => buildCoordinatorCheckInBoard({
    guests: sortedGuests,
    activeGuest: activeCheckInGuest,
  }), [sortedGuests, activeCheckInGuest]);
  const timelineTargetEvent = useMemo(() => events.find((event) => event.id === timelineBoardTargetId) ?? null, [events, timelineBoardTargetId]);
  const qnaTargetItem = useMemo(() => qnaItems.find((item) => item.id === qnaBoardTargetId) ?? null, [qnaItems, qnaBoardTargetId]);
  const priorityCommandLabel = useMemo(() => getCoordinatorCommandPriority({
    checkInLabel: checkInTargetState.label,
    timelineLabel: timelineTargetState.label,
    qnaLabel: qnaTargetState.label,
    alertAligned: alertTargetCue.aligned,
  }), [checkInTargetState.label, timelineTargetState.label, qnaTargetState.label, alertTargetCue.aligned]);
  const priorityCommandReason = useMemo(() => getCoordinatorCommandPriorityReason({
    priority: priorityCommandLabel,
    checkInLabel: checkInTargetState.label,
    timelineLabel: timelineTargetState.label,
    qnaLabel: qnaTargetState.label,
    alertAligned: alertTargetCue.aligned,
    alertLaneLabel,
  }), [priorityCommandLabel, checkInTargetState.label, timelineTargetState.label, qnaTargetState.label, alertTargetCue.aligned, alertLaneLabel]);
  const priorityCommandTargetReason = useMemo(() => getCoordinatorCommandPriorityTargetReason({
    priority: priorityCommandLabel,
    checkInTargetName: checkInTargetGuest?.name ?? null,
    timelineTargetName: timelineTargetEvent?.event_name ?? null,
    qnaTargetQuestion: qnaTargetItem?.question ?? null,
  }), [priorityCommandLabel, checkInTargetGuest?.name, timelineTargetEvent?.event_name, qnaTargetItem?.question]);
  const priorityCommandCta = useMemo(() => getCoordinatorCommandPriorityCta(priorityCommandLabel), [priorityCommandLabel]);
  const commandSummaryItems = useMemo(() => buildCoordinatorCommandSummary({
    checkInLabel: checkInTargetState.label,
    timelineLabel: timelineTargetState.label,
    qnaLabel: qnaTargetState.label,
    alertLabel: alertSummaryStateLabel,
    priorityLabel: priorityCommandLabel,
    checkInTargetName: checkInTargetGuest?.name ?? null,
    timelineTargetName: timelineTargetEvent?.event_name ?? null,
    qnaTargetQuestion: qnaTargetItem?.question ?? null,
    alertLaneLabel,
  }), [
    checkInTargetState.label,
    timelineTargetState.label,
    qnaTargetState.label,
    alertSummaryStateLabel,
    priorityCommandLabel,
    checkInTargetGuest?.name,
    timelineTargetEvent?.event_name,
    qnaTargetItem?.question,
    alertLaneLabel,
  ]);
  const commandDeckItems = useMemo(() => buildCoordinatorCommandDeck({
    items: commandSummaryItems,
    priorityLabel: priorityCommandLabel,
    priorityReason: priorityCommandReason,
    priorityCta: priorityCommandCta,
    checkInTargetName: checkInTargetGuest?.name ?? null,
    timelineTargetName: timelineTargetEvent?.event_name ?? null,
    qnaTargetQuestion: qnaTargetItem?.question ?? null,
    alertLaneLabel,
  }), [
    commandSummaryItems,
    priorityCommandLabel,
    priorityCommandReason,
    priorityCommandCta,
    checkInTargetGuest?.name,
    timelineTargetEvent?.event_name,
    qnaTargetItem?.question,
    alertLaneLabel,
  ]);
  const stablePrompt = useMemo(() => buildCoordinatorStablePrompt({
    priority: priorityCommandLabel,
    reason: priorityCommandReason,
    cta: priorityCommandCta,
  }), [priorityCommandLabel, priorityCommandReason, priorityCommandCta]);
  const standingPromptMode = useMemo(() => getCoordinatorStandingPromptMode(Boolean(summaryDisplayCue)), [summaryDisplayCue]);
  const standingPromptBadge = useMemo(() => getCoordinatorStandingPromptBadge({
    mode: standingPromptMode,
    badge: stablePrompt.badge,
  }), [standingPromptMode, stablePrompt.badge]);
  const standingPromptCopy = useMemo(() => getCoordinatorStandingPromptCopy({
    mode: standingPromptMode,
    label: stablePrompt.label,
  }), [standingPromptMode, stablePrompt.label]);
  const stablePromptTargetLabel = useMemo(() => getCoordinatorStablePromptTargetLabel({
    priority: priorityCommandLabel,
    targetName: priorityCommandLabel === 'Check-in'
      ? checkInTargetGuest?.name ?? null
      : priorityCommandLabel === 'Timeline'
        ? timelineTargetEvent?.event_name ?? null
        : priorityCommandLabel === 'Q&A'
          ? qnaTargetItem?.question ?? null
          : alertLaneLabel,
  }), [priorityCommandLabel, checkInTargetGuest?.name, timelineTargetEvent?.event_name, qnaTargetItem?.question, alertLaneLabel]);
  const stablePromptState = useMemo(() => getCoordinatorStablePromptState({
    priority: priorityCommandLabel,
    panelFocus,
  }), [priorityCommandLabel, panelFocus]);
  const standingPromptStateLabel = useMemo(() => getCoordinatorStandingPromptSecondaryState({
    mode: standingPromptMode,
    state: stablePromptState,
  }), [standingPromptMode, stablePromptState]);
  const stablePromptBadgeToneClassName = useMemo(() => getCoordinatorCommandBadgeTone({
    tone: standingPromptMode === 'secondary' ? 'neutral' : 'primary',
  }), [standingPromptMode]);
  const stablePromptStateToneClassName = useMemo(() => getCoordinatorCommandBadgeTone({
    tone: standingPromptStateLabel ? 'success' : 'neutral',
  }), [standingPromptStateLabel]);
  const manualOverrideActionLabel = useMemo(() => getCoordinatorManualOverrideActionLabel(panelFocus), [panelFocus]);
  const manualOverrideTargetLabel = useMemo(() => getCoordinatorManualOverrideTargetLabel({
    panelFocus,
    boardTargetName: panelFocus === 'check-in'
      ? checkInTargetGuest?.name ?? null
      : panelFocus === 'timeline'
        ? timelineTargetEvent?.event_name ?? null
        : panelFocus === 'qna'
          ? qnaTargetItem?.question ?? null
          : null,
  }), [panelFocus, checkInTargetGuest?.name, timelineTargetEvent?.event_name, qnaTargetItem?.question]);
  const manualOverrideCurrentTargetLabel = useMemo(() => getCoordinatorManualOverrideCurrentTargetLabel({
    panelFocus,
    currentTargetName: panelFocus === 'check-in'
      ? sortedGuests.find((guest) => guest.id === activeGuestId)?.name ?? null
      : panelFocus === 'timeline'
        ? events.find((event) => event.id === activeTimelineEventId)?.event_name ?? null
        : panelFocus === 'qna'
          ? qnaItems.find((item) => item.id === activeQnaId)?.question ?? null
          : null,
  }), [panelFocus, sortedGuests, activeGuestId, events, activeTimelineEventId, qnaItems, activeQnaId]);

  const liveIssues = useMemo(() => buildCoordinatorEscalations({
    guests,
    qnaItems,
    events,
    timelineState,
  }), [guests, qnaItems, events, timelineState]);
  const primaryAction = useMemo(() => buildCoordinatorPrimaryAction({
    guests,
    qnaItems,
    events,
    timelineState,
  }), [guests, qnaItems, events, timelineState]);
  const primaryActionTarget = useMemo(() => resolveCoordinatorPrimaryActionTarget(primaryAction), [primaryAction]);
  const primaryActionBoard = useMemo(() => buildCoordinatorPrimaryActionBoard({
    action: primaryAction,
    target: primaryActionTarget,
    canAutoRunTimeline: Boolean(upNextEventId && canEditTimeline),
  }), [primaryAction, primaryActionTarget, upNextEventId, canEditTimeline]);
  const navigationBoard = useMemo(() => buildCoordinatorNavigationBoard({
    panelFocus,
    boardTargetName: panelFocus === 'check-in'
      ? checkInTargetGuest?.name ?? null
      : panelFocus === 'timeline'
        ? timelineTargetEvent?.event_name ?? null
        : panelFocus === 'qna'
          ? qnaTargetItem?.question ?? null
          : null,
    reviewOnly: panelFocus === 'check-in' ? checkInReviewOnly : false,
  }), [panelFocus, checkInTargetGuest?.name, timelineTargetEvent?.event_name, qnaTargetItem?.question, checkInReviewOnly]);
  const secondaryCommandLabel = useMemo(
    () => commandSummaryItems.find((item) => item.label !== priorityCommandLabel)?.label ?? null,
    [commandSummaryItems, priorityCommandLabel],
  );
  const commandBoard = useMemo(() => buildCoordinatorCommandBoard({
    priority: priorityCommandLabel,
    reason: priorityCommandReason,
    targetReason: priorityCommandTargetReason,
    cta: priorityCommandCta,
    secondary: secondaryCommandLabel,
    primaryActionTitle: primaryAction.title,
  }), [priorityCommandLabel, priorityCommandReason, priorityCommandTargetReason, priorityCommandCta, secondaryCommandLabel, primaryAction.title]);
  const commandModeLabel = useMemo(() => getCoordinatorCommandModeLabel(commandSource), [commandSource]);
  const commandModeGuidance = useMemo(() => getCoordinatorCommandModeGuidance(commandSource), [commandSource]);
  const correctionCues = useMemo(() => buildCoordinatorCorrectionCues({
    guests,
    events,
    timelineState,
  }), [guests, events, timelineState]);
  const correctionGuestId = useMemo(() => getCoordinatorCorrectionGuestId(sortedGuests), [sortedGuests]);
  const correctionEventId = useMemo(() => getCoordinatorCorrectionEventId(events, timelineState), [events, timelineState]);
  const timelineBoard = useMemo(() => buildCoordinatorTimelineBoard({
    events,
    timelineState,
    liveEventId,
    upNextEventId,
  }), [events, timelineState, liveEventId, upNextEventId]);

  useEffect(() => {
    if (commandSource !== 'primary-action') return;
    if (primaryAction.key !== 'all-clear') return;
    setCommandSource(null);
    setNeutralFocusReason(getCoordinatorNeutralFocusReason(panelFocus));
  }, [commandSource, primaryAction.key, panelFocus]);

  useEffect(() => {
    if (commandSource !== 'escalation') return;
    if (liveIssues.length > 0) return;
    setCommandSource(null);
    setNeutralFocusReason(getCoordinatorNeutralFocusReason(panelFocus));
  }, [commandSource, liveIssues.length, panelFocus]);

  useEffect(() => {
    if (commandSource !== 'correction') return;
    if (correctionCues.length > 0) return;
    setCommandSource(null);
    setNeutralFocusReason(getCoordinatorNeutralFocusReason(panelFocus));
  }, [commandSource, correctionCues.length, panelFocus]);

  const filteredAlertLog = useMemo(
    () => filterCoordinatorAlertLog({ alertLog, channelFilter: alertChannelFilter, timingFilter: alertTimingFilter }),
    [alertLog, alertChannelFilter, alertTimingFilter],
  );
  const filteredAlertLogView = useMemo(() => buildCoordinatorAlertLogView(filteredAlertLog), [filteredAlertLog]);
  const {
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
  } = useMemo(() => buildCoordinatorDashboardFocusActions({
    alertTargetCueAligned: alertTargetCue.aligned,
    canEditQna,
    canSendAlerts,
    checkInBoardTargetId,
    checkInQueue,
    checkInWatchCount,
    liveEventId,
    nextArrivals,
    panelFocus,
    preferredAlertSuggestion,
    priorityCommandLabel,
    qnaBoardTargetId,
    qnaItems,
    timelineBoardTargetId,
    upNextEventId,
    setActiveGuestId,
    setActiveQnaId,
    setActiveTimelineEventId,
    setAlertForm,
    setCheckInFilter,
    setCheckInReviewOnly,
    setCommandJumpLabel,
    setCommandJumpPanelFocus,
    setCommandJumpTargetId,
    setCommandSource,
    setManualOverrideUpdatedAt,
    setNeutralFocusReason,
    setOverrideCueShownAt,
    setPanelFocus,
    setQnaFilter,
    setQnaInput,
    setSummaryFeedback,
    setSummaryFeedbackShownAt,
    setAlertOverrideUpdatedAt,
    toast,
  }), [
    alertTargetCue.aligned,
    canEditQna,
    canSendAlerts,
    checkInBoardTargetId,
    checkInQueue,
    checkInWatchCount,
    liveEventId,
    nextArrivals,
    panelFocus,
    preferredAlertSuggestion,
    priorityCommandLabel,
    qnaBoardTargetId,
    qnaItems,
    timelineBoardTargetId,
    upNextEventId,
    setActiveGuestId,
    setActiveQnaId,
    setActiveTimelineEventId,
    setAlertForm,
    setCheckInFilter,
    setCheckInReviewOnly,
    setCommandJumpLabel,
    setCommandJumpPanelFocus,
    setCommandJumpTargetId,
    setCommandSource,
    setManualOverrideUpdatedAt,
    setNeutralFocusReason,
    setOverrideCueShownAt,
    setPanelFocus,
    setQnaFilter,
    setQnaInput,
    setSummaryFeedback,
    setSummaryFeedbackShownAt,
    setAlertOverrideUpdatedAt,
    toast,
  ]);

  const sendDayOfAlert = async () => {
    if (!siteId) return;
    if (!canSendAlerts) {
      toast('Your collaborator role cannot send coordinator alerts.', 'info');
      return;
    }
    if (alertForm.scheduleType === 'later' && !canScheduleAlerts) {
      toast('Your collaborator role cannot schedule coordinator alerts.', 'info');
      return;
    }
    if (alertValidationError) {
      toast(alertValidationError, 'error');
      return;
    }
    const scheduledFor = resolveCoordinatorScheduledFor(alertForm);
    const status = scheduledFor ? 'scheduled' : 'queued';

    setAlertBusy(true);
    try {
      if (!isDemoMode) {
        await createCoordinatorAlertMessage({
          siteId,
          subject: alertForm.subject.trim(),
          body: alertForm.body.trim(),
          channel: alertForm.channel,
          audience: alertForm.audience,
          recipientCount: alertAudienceCount,
          status,
          scheduledFor,
        });
      }

      setAlertLog((prev) => appendCoordinatorAlertLogItem(prev, {
        id: `${Date.now()}`,
        subject: alertForm.subject.trim(),
        audience: alertForm.audience,
        channel: alertForm.channel,
        queuedAt: new Date().toISOString(),
        sendAt: scheduledFor,
      }));
      setPreviousAlertAligned(alertTargetCue.aligned);
      setAlertOverrideLabelState(alertTargetCue.aligned ? null : alertOverrideLabel);
      setAlertForm((prev) => {
        const reset = resetCoordinatorAlertFormAfterSend(prev);
        return preferredAlertSuggestion
          ? applyCoordinatorAlertSuggestion({ form: reset, suggestion: preferredAlertSuggestion })
          : reset;
      });
      toast(scheduledFor ? 'Coordinator alert scheduled.' : 'Coordinator alert queued.', 'success');
    } catch {
      toast('Couldn’t prepare that update right now.', 'error');
    } finally {
      setAlertBusy(false);
    }
  };

  const addQnaItem = async () => {
    if (!canEditQna) {
      toast('Your collaborator role cannot add guest questions here.', 'info');
      return;
    }

    const q = qnaInput.trim();
    if (!q) return;

    focusCoordinatorQnaLane();

    if (!isDemoMode && siteId) {
      try {
        const data = await createCoordinatorQnaQuestion(siteId, q);
        setQnaItems((prev) => [data, ...prev].slice(0, 30));
      } catch {
        toast('Couldn’t save that guest question right now.', 'error');
        return;
      }
    } else {
      setQnaItems((prev) => [{ id: `${Date.now()}`, question: q, status: 'new' as const }, ...prev].slice(0, 30));
    }
    setQnaInput('');
  };




  useEffect(() => {
    if (shouldResetCoordinatorCommandJumpLabel({
      jumpLabel: commandJumpLabel,
      panelFocus,
      expectedPanelFocus: commandJumpPanelFocus,
    })) {
      setCommandJumpLabel(null);
      setCommandJumpPanelFocus(null);
      setCommandJumpTargetId(null);
    }
  }, [commandJumpLabel, commandJumpPanelFocus, panelFocus]);


  useEffect(() => {
    const currentTargetId = panelFocus === 'check-in'
      ? activeGuestId
      : panelFocus === 'timeline'
        ? activeTimelineEventId
        : panelFocus === 'qna'
          ? activeQnaId
          : null;

    if (shouldResetCoordinatorCommandJumpLabelForTargetChange({
      jumpLabel: commandJumpLabel,
      panelFocus,
      expectedPanelFocus: commandJumpPanelFocus,
      currentTargetId,
      expectedTargetId: commandJumpTargetId,
    })) {
      setCommandJumpLabel(null);
      setCommandJumpPanelFocus(null);
      setCommandJumpTargetId(null);
      setCommandJumpTargetId(null);
    }
  }, [commandJumpLabel, commandJumpPanelFocus, commandJumpTargetId, panelFocus, activeGuestId, activeTimelineEventId, activeQnaId]);


  useEffect(() => {
    const currentTargetId = panelFocus === 'check-in'
      ? activeGuestId
      : panelFocus === 'timeline'
        ? activeTimelineEventId
        : panelFocus === 'qna'
          ? activeQnaId
          : null;

    const boardTargetId = panelFocus === 'check-in'
      ? checkInBoardTargetId
      : panelFocus === 'timeline'
        ? timelineBoardTargetId
        : panelFocus === 'qna'
          ? qnaBoardTargetId
          : null;

    if (shouldResetCoordinatorManualOverride({
      manualOverrideLabel,
      panelFocus,
      boardTargetId,
      currentTargetId,
    })) {
      setManualOverrideLabel(null);
      setManualOverrideUpdatedAt(null);
      setOverrideCueShownAt(null);
      const realignment = getCoordinatorRealignmentLabel(panelFocus);
      if (realignment) {
        setSummaryFeedback(createCoordinatorSummaryFeedback({
          label: realignment,
          panelFocus,
          targetId: currentTargetId,
          kind: 'realignment',
        }));
        setSummaryFeedbackShownAt(Date.now());
      }
    }
  }, [manualOverrideLabel, panelFocus, activeGuestId, activeTimelineEventId, activeQnaId, checkInBoardTargetId, timelineBoardTargetId, qnaBoardTargetId]);

  useEffect(() => {
    const currentTargetId = panelFocus === 'check-in'
      ? activeGuestId
      : panelFocus === 'timeline'
        ? activeTimelineEventId
        : panelFocus === 'qna'
          ? activeQnaId
          : null;

    const boardTargetId = panelFocus === 'check-in'
      ? checkInBoardTargetId
      : panelFocus === 'timeline'
        ? timelineBoardTargetId
        : panelFocus === 'qna'
          ? qnaBoardTargetId
          : null;

    if (!panelFocus || !currentTargetId || !boardTargetId || currentTargetId === boardTargetId) return;

    const nextManualOverrideLabel = getCoordinatorManualOverrideLabel(panelFocus);
    if (!nextManualOverrideLabel || manualOverrideLabel === nextManualOverrideLabel) return;

    const nextManualOverrideTime = Date.now();
    setManualOverrideLabel(nextManualOverrideLabel);
    setManualOverrideUpdatedAt(nextManualOverrideTime);
    setOverrideCueShownAt(nextManualOverrideTime);
  }, [manualOverrideLabel, panelFocus, activeGuestId, activeTimelineEventId, activeQnaId, checkInBoardTargetId, timelineBoardTargetId, qnaBoardTargetId]);


  useEffect(() => {
    const currentTargetId = panelFocus === 'check-in'
      ? activeGuestId
      : panelFocus === 'timeline'
        ? activeTimelineEventId
        : panelFocus === 'qna'
          ? activeQnaId
          : null;

    if (shouldResetCoordinatorSummaryFeedback({
      feedbackLabel: summaryFeedback?.label ?? null,
      panelFocus,
      expectedPanelFocus: summaryFeedback?.panelFocus ?? null,
      currentTargetId,
      expectedTargetId: summaryFeedback?.targetId ?? null,
    })) {
      setSummaryFeedback(null);
      setSummaryFeedbackShownAt(null);
    }
  }, [summaryFeedback, panelFocus, activeGuestId, activeTimelineEventId, activeQnaId]);


  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (shouldExpireCoordinatorOverrideCue({
        shownAt: overrideCueShownAt,
        now: Date.now(),
        maxAgeMs: 5000,
        hasSummaryFeedback: !!summaryFeedback,
      })) {
        setAlertOverrideLabelState(null);
        setAlertOverrideUpdatedAt(null);
        setManualOverrideLabel(null);
        setManualOverrideUpdatedAt(null);
        setOverrideCueShownAt(null);
      }
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [overrideCueShownAt, summaryFeedback]);

  useEffect(() => {
    if (!summaryFeedback) return;
    const timer = window.setTimeout(() => {
      if (shouldExpireCoordinatorCue({
        shownAt: summaryFeedbackShownAt,
        now: Date.now(),
        maxAgeMs: 5000,
      })) {
        setSummaryFeedback(null);
        setSummaryFeedbackShownAt(null);
      }
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [summaryFeedback, summaryFeedbackShownAt]);

  const {
    focusArrivalGuest,
    returnToBoard,
    runCorrectionCue,
    runEscalationIssue,
    runPrimaryAction,
    runTimelineAction,
    saveQnaAnswer,
    selectTimelineState,
  } = useMemo(() => buildCoordinatorDashboardBoardActions({
    alertForm,
    alertSuggestions,
    alertTargetCueAligned: alertTargetCue.aligned,
    canEditQna,
    canEditTimeline,
    correctionCues,
    correctionEventId,
    correctionGuestId,
    events,
    guests,
    isDemoMode,
    liveIssues,
    panelFocus,
    primaryAction,
    qnaBoardTargetId,
    qnaDraftAnswers,
    qnaItems,
    sortedGuests,
    siteId,
    timelineBoardTargetId,
    timelineState,
    upNextEvent,
    upNextEventId,
    setActiveGuestId,
    setActiveQnaId,
    setActiveTimelineEventId,
    setAlertForm,
    setCheckInFilter,
    setCheckInReviewOnly,
    setCommandSource,
    setLastAlertSuggestionKey,
    setNeutralFocusReason,
    setPanelFocus,
    setQnaDraftAnswers,
    setQnaItems,
    setSummaryFeedback,
    setSummaryFeedbackShownAt,
    setTimelineState,
    clearCoordinatorTransientState,
    focusCoordinatorCheckInLane,
    focusCoordinatorQnaLane,
    focusCoordinatorTimelineLane,
    toast,
    updateCoordinatorQnaAnswer,
  }), [
    alertForm,
    alertSuggestions,
    alertTargetCue.aligned,
    canEditQna,
    canEditTimeline,
    correctionCues,
    correctionEventId,
    correctionGuestId,
    events,
    guests,
    isDemoMode,
    liveIssues,
    panelFocus,
    primaryAction,
    qnaBoardTargetId,
    qnaDraftAnswers,
    qnaItems,
    sortedGuests,
    siteId,
    timelineBoardTargetId,
    timelineState,
    upNextEvent,
    upNextEventId,
    setActiveGuestId,
    setActiveQnaId,
    setActiveTimelineEventId,
    setAlertForm,
    setCheckInFilter,
    setCheckInReviewOnly,
    setCommandSource,
    setLastAlertSuggestionKey,
    setNeutralFocusReason,
    setPanelFocus,
    setQnaDraftAnswers,
    setQnaItems,
    setSummaryFeedback,
    setSummaryFeedbackShownAt,
    setTimelineState,
    clearCoordinatorTransientState,
    focusCoordinatorCheckInLane,
    focusCoordinatorQnaLane,
    focusCoordinatorTimelineLane,
    toast,
    updateCoordinatorQnaAnswer,
  ]);

  return (
    <DashboardLayout currentPage="coordinator">
      <div className="max-w-6xl mx-auto space-y-5">
        <DashboardPageHero
          eyebrow="Day-of view"
          title="Give helpers the next useful thing, not every planning detail."
          description="Check-in, schedule updates, guest questions, and day-of messages stay focused so a planner or coordinator can act quickly."
          stats={[
            { label: 'Guests', value: stats.total, detail: `${stats.confirmed} attending` },
            { label: 'Checked in', value: stats.checkedIn, detail: 'arrivals marked' },
            { label: 'Questions', value: qnaCounts.open, detail: 'open guest questions' },
          ]}
          actions={
            <CoordinatorRoleSelector
              activeSiteRole={activeSiteRole}
              coordinatorRole={coordinatorRole}
              onRoleChange={setCoordinatorRole}
            />
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <CoordinatorStatCards loading={loading} stats={stats} />
          <CoordinatorAttentionPanel
            correctionCues={correctionCues}
            liveIssues={liveIssues}
            nextArrivals={nextArrivals}
            hasUncheckedGuests={sortedGuests.some((guest) => !guest.checked_in_at)}
            onArrivalClick={focusArrivalGuest}
            onCorrectionCueClick={runCorrectionCue}
            onEscalationClick={runEscalationIssue}
          />
        </div>

        <CoordinatorHandoffPanel coordinatorRole={coordinatorRole} />

        <CoordinatorHelperAccessPanel
          coordinatorRole={coordinatorRole}
          roleBoard={roleBoard}
          roleCapabilities={roleCapabilities}
        />

        <CoordinatorDayOfSummaryPanel
          alertOverrideBadge={alertOverrideBadge}
          alertOverrideCurrentLabel={alertOverrideCurrentLabel}
          alertOverrideTargetLabel={alertOverrideTargetLabel}
          commandBoard={commandBoard}
          commandDeckItems={commandDeckItems}
          commandModeGuidance={commandModeGuidance}
          commandModeLabel={commandModeLabel}
          commandSource={commandSource}
          commandSummaryItems={commandSummaryItems}
          executionBoard={executionBoard}
          manualOverrideActionLabel={manualOverrideActionLabel}
          manualOverrideBadge={manualOverrideBadge}
          manualOverrideCurrentTargetLabel={manualOverrideCurrentTargetLabel}
          manualOverrideTargetLabel={manualOverrideTargetLabel}
          navigationBoard={navigationBoard}
          neutralFocusReason={neutralFocusReason}
          onCommandClick={jumpToCommandSummaryItem}
          onOpsSnapshotClick={jumpToOpsSnapshotLane}
          onPrimaryAction={runPrimaryAction}
          onReturnToBoard={returnToBoard}
          onReturnToBoardTarget={returnToBoardTarget}
          onRevisitNeutralFocus={revisitNeutralFocus}
          onStablePromptClick={jumpToStablePrompt}
          opsSnapshotItems={opsSnapshotItems}
          overrideBadgeToneClassName={overrideBadgeToneClassName}
          hasPanelFocus={Boolean(panelFocus)}
          primaryAction={primaryAction}
          primaryActionBoard={primaryActionBoard}
          priorityCommandCta={priorityCommandCta}
          priorityCommandLabel={priorityCommandLabel}
          priorityCommandReason={priorityCommandReason}
          priorityCommandTargetReason={priorityCommandTargetReason}
          stablePrompt={stablePrompt}
          stablePromptBadgeToneClassName={stablePromptBadgeToneClassName}
          stablePromptStateToneClassName={stablePromptStateToneClassName}
          stablePromptTargetLabel={stablePromptTargetLabel}
          standingPromptBadge={standingPromptBadge}
          standingPromptCopy={standingPromptCopy}
          standingPromptMode={standingPromptMode}
          standingPromptStateLabel={standingPromptStateLabel}
          summaryDisplayCue={summaryDisplayCue}
          summaryFeedbackBadge={summaryFeedbackBadge}
          summaryFeedbackBadgeToneClassName={summaryFeedbackBadgeToneClassName}
          summaryFeedbackCopy={summaryFeedbackCopy}
          summaryFeedbackLayout={summaryFeedbackLayout}
          summaryFeedbackTone={summaryFeedbackTone}
        />

        {coordinatorRole === 'planner' && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            Planner view is on. This view stays focused on guest movement, timeline decisions, and day-of updates.
          </div>
        )}
        {coordinatorRole === 'viewer' && (
          <div className="rounded-lg border border-border/40 bg-surface-subtle px-3 py-2 text-xs text-text-tertiary">
            Viewer mode is on — timeline, check-in, alerts, and Q&A edits are turned off here.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <CoordinatorCheckInQueuePanel
            activeGuestId={activeGuestId}
            canCheckIn={canCheckIn}
            canEditQna={canEditQna}
            checkInBoard={checkInBoard}
            checkInBoardTargetId={checkInBoardTargetId}
            checkInBusyGuestId={checkInBusyGuestId}
            checkInFilter={checkInFilter}
            checkInQuery={checkInQuery}
            checkInQueue={checkInQueue}
            checkInReviewOnly={checkInReviewOnly}
            checkInTargetState={checkInTargetState}
            checkInWatchCount={checkInWatchCount}
            isFocused={panelFocus === 'check-in'}
            nextArrivals={nextArrivals}
            onActiveGuestCheckIn={() => {
              const activeGuest = checkInQueue.find((guest) => guest.id === activeGuestId);
              if (!activeGuest) return;
              focusCoordinatorCheckInLane();
              void toggleCheckIn(activeGuest);
            }}
            onCheckInGuest={(guest) => { void toggleCheckIn(guest); }}
            onEscalateDoorReview={escalateDoorReview}
            onFocusFirstQueueGuest={focusFirstCoordinatorQueueGuest}
            onFocusLane={focusCoordinatorCheckInLane}
            onReadyNowClick={() => {
              focusCoordinatorCheckInLane();
              setCheckInFilter('arrivals');
              setCheckInReviewOnly(false);
              setActiveGuestId(nextArrivals[0]?.id ?? null);
            }}
            onReviewOnlyClick={() => {
              focusCoordinatorCheckInLane();
              setCheckInFilter('arrivals');
              setCheckInReviewOnly((prev) => !prev);
              setActiveGuestId(checkInBoardTargetId);
            }}
            onSelectGuest={setActiveGuestId}
            onSetFilter={(filter) => {
              setCheckInFilter(filter);
              setCheckInReviewOnly(false);
            }}
            onSetQuery={setCheckInQuery}
          />

          <div className="space-y-4 rounded-xl border border-border-subtle bg-white p-4 shadow-sm">
            <CoordinatorTimelinePanel
              activeTimelineEventId={activeTimelineEventId}
              canEditTimeline={canEditTimeline}
              events={events}
              liveEventId={liveEventId}
              panelFocus={panelFocus}
              timelineBoard={timelineBoard}
              timelineBoardTargetId={timelineBoardTargetId}
              timelineState={timelineState}
              timelineTargetState={timelineTargetState}
              upNextEventId={upNextEventId}
              onFocusLane={focusCoordinatorTimelineLane}
              onJumpToEvent={jumpToTimelineEvent}
              onRunAction={runTimelineAction}
              onSelectEvent={setActiveTimelineEventId}
              onSelectState={selectTimelineState}
            />

            <CoordinatorDayOfMessagePanel
              alertActivityBoard={alertActivityBoard}
              alertBoard={alertBoard}
              alertBusy={alertBusy}
              alertChannelFilter={alertChannelFilter}
              alertForm={alertForm}
              alertLaneLabel={alertLaneLabel}
              alertLog={alertLog}
              alertOverrideCurrentLabel={alertOverrideCurrentLabel}
              alertOverrideLabel={alertOverrideLabel}
              alertOverrideTargetLabel={alertOverrideTargetLabel}
              alertStats={alertStats}
              alertSuggestions={alertSuggestions}
              alertSummary={alertSummary}
              alertTargetCue={alertTargetCue}
              alertTimingFilter={alertTimingFilter}
              alertValidationError={alertValidationError}
              canScheduleAlerts={canScheduleAlerts}
              canSendAlerts={canSendAlerts}
              eventAudienceOptions={eventAudienceOptions}
              filteredAlertLogCount={filteredAlertLog.length}
              filteredAlertLogView={filteredAlertLogView}
              preferredAlertSuggestion={preferredAlertSuggestion}
              onFocusLane={focusCoordinatorAlertLane}
              onSendAlert={() => void sendDayOfAlert()}
              onSetAlertChannelFilter={setAlertChannelFilter}
              onSetAlertForm={setAlertForm}
              onSetAlertTimingFilter={setAlertTimingFilter}
              onSetLastAlertSuggestionKey={setLastAlertSuggestionKey}
            />

            <div className="border-t border-border/60 pt-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-text-primary">Guest questions{panelFocus === 'qna' ? ' · focus' : ''}{activeQnaId ? ` · ${getCoordinatorActiveTargetLabel('qna')}` : ''}{qnaTargetState.label ? ` · ${qnaTargetState.label}` : ''}</p>
                <p className="text-[11px] text-text-tertiary">{qnaCounts.open} open · {qnaCounts.answered} answered</p>
              </div>
              <fieldset disabled={!canEditQna}>
              <div className="mb-2 rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-text-primary">Q&A board</p>
                    <p className="mt-1 text-[11px] text-text-secondary">Focused · {qnaBoard.activeLabel}</p>
                    <p className="text-[11px] text-text-secondary">Next up · {qnaBoard.nextLabel}</p>
                  </div>
                  <span className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${qnaBoard.tone === 'ready' ? 'border-primary/20 bg-primary/5 text-primary' : qnaBoard.tone === 'warning' ? 'border-primary/20 bg-accent-light text-primary' : 'border-border bg-white text-text-tertiary'}`}>
                    {qnaBoard.statusLabel}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
                    <p className="text-[10px] text-text-tertiary">Backlog</p>
                    <p className="mt-1 text-[11px] text-text-primary">{qnaBoard.backlogLabel}</p>
                  </div>
                  <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
                    <p className="text-[10px] text-text-tertiary">Focused draft</p>
                    <p className="mt-1 text-[11px] text-text-primary">{qnaBoard.draftLabel}</p>
                  </div>
                </div>
              </div>
              {activeQnaItem && (
                <div className="mb-2 rounded-lg border border-border/50 bg-surface-subtle/30 px-3 py-2">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-text-primary">Focused question</p>
                      <p className="mt-1 text-sm text-text-primary">{activeQnaItem.question}</p>
                      <p className="mt-1 text-[11px] text-text-tertiary">
                        {activeQnaItem.status === 'answered' ? 'Answered' : 'Needs answer'} · {activeQnaDraftStateLabel}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {qnaBoardTargetId && qnaBoardTargetId !== activeQnaItem.id && (
                        <button
                          type="button"
                          onClick={() => {
                            focusCoordinatorQnaLane();
                            setQnaFilter('open');
                            setActiveQnaId(qnaBoardTargetId);
                          }}
                          className="rounded-lg border border-border bg-white px-2.5 py-1 text-[11px] text-text-secondary hover:border-primary/35 hover:text-primary"
                        >
                          Jump to suggested question
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          focusCoordinatorQnaLane();
                          setActiveQnaId(activeQnaItem.id);
                          void saveQnaAnswer(activeQnaItem.id);
                        }}
                        className="rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] text-primary"
                      >
                        {(qnaDraftAnswers[activeQnaItem.id] ?? activeQnaItem.answer ?? '').trim() ? 'Save focused reply' : 'Reopen focused question'}
                      </button>
                      {qnaCounts.open > 0 && (
                        <button
                          type="button"
                          onClick={focusNextCoordinatorQna}
                          className="rounded-lg border border-border bg-white px-2.5 py-1 text-[11px] text-text-secondary hover:border-primary/35 hover:text-primary"
                        >
                          Open next question
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-2 mb-2">
                <Input
                  value={qnaInput}
                  onChange={(e) => { focusCoordinatorQnaLane(); setQnaInput(e.target.value); }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' || e.shiftKey) return;
                    e.preventDefault();
                    if (qnaInput.trim()) {
                      void addQnaItem();
                      return;
                    }
                    focusFirstCoordinatorOpenQna();
                  }}
                  placeholder="Add a guest question"
                />
                <button onClick={addQnaItem} className="px-3 py-2 text-xs rounded-md border border-border bg-white text-text-secondary disabled:opacity-40">Add question</button>
              </div>
              <div className="mb-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { focusCoordinatorQnaLane(); setQnaFilter('open'); if (!activeQnaId) setActiveQnaId(getFirstOpenCoordinatorQnaId(qnaItems)); }}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] ${qnaFilter === 'open' ? 'border-primary/35 bg-primary/5 text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/35 hover:text-primary'}`}
                >
                  Open only · {qnaCounts.open}
                </button>
                <button
                  type="button"
                  onClick={() => { focusCoordinatorQnaLane(); setQnaFilter('answered'); }}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] ${qnaFilter === 'answered' ? 'border-primary/20 bg-accent-light text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/35 hover:text-primary'}`}
                >
                  Answered · {qnaCounts.answered}
                </button>
                <button
                  type="button"
                  onClick={() => { focusCoordinatorQnaLane(); setQnaFilter('all'); }}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] ${qnaFilter === 'all' ? 'border-border/70 bg-surface-subtle/40 text-text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/35 hover:text-primary'}`}
                >
                  All · {qnaItems.length}
                </button>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-auto">
                {filteredQnaItems.length === 0 ? (
                  <p className="text-xs text-text-tertiary">No guest questions match this triage view right now.</p>
                ) : (
                  filteredQnaItems.slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      className={`text-xs border rounded-md px-2.5 py-2 space-y-2 cursor-pointer ${activeQnaId === item.id ? 'border-primary/40 ring-2 ring-primary/10 bg-primary/5' : 'border-border/50'}`}
                      onClick={() => {
                        focusCoordinatorQnaLane();
                        setActiveQnaId(item.id);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span className="text-text-secondary">{item.question}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {qnaBoardTargetId === item.id && (
                              <span className={`px-2 py-0.5 rounded border whitespace-nowrap ${qnaTargetState.isBoardTargetActive ? 'border-primary/25 bg-primary/10 text-primary' : 'border-primary/20 bg-accent-light text-primary'}`}>
                                {qnaTargetState.isBoardTargetActive ? 'Suggested question in progress' : 'Suggested question'}
                              </span>
                            )}
                            {activeQnaId === item.id && qnaBoardTargetId !== item.id && (
                              <span className="px-2 py-0.5 rounded border whitespace-nowrap border-primary/20 bg-primary/5 text-primary">
                                Selected question
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded border whitespace-nowrap ${item.status === 'answered' ? 'border-primary/20 bg-accent-light text-primary' : 'border-border-subtle bg-surface-subtle text-text-secondary'}`}>
                          {item.status === 'answered' ? 'Answered' : 'New'}
                        </span>
                      </div>
                      <Textarea
                        value={qnaDraftAnswers[item.id] ?? item.answer ?? ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => { focusCoordinatorQnaLane(); setQnaDraftAnswers((prev) => ({ ...prev, [item.id]: e.target.value })); setActiveQnaId(item.id); }}
                        rows={2}
                        placeholder="Add the answer the coordinator should use"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] text-text-tertiary">
                          {getCoordinatorQnaDraftStateLabel({ draftAnswer: qnaDraftAnswers[item.id] ?? item.answer ?? '', savedAnswer: item.answer })}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); focusCoordinatorQnaLane(); setActiveQnaId(item.id); void saveQnaAnswer(item.id); }}
                          className="px-2.5 py-1 rounded border border-border bg-white text-text-secondary disabled:opacity-40"
                        >
                          {(qnaDraftAnswers[item.id] ?? item.answer ?? '').trim() ? 'Save answer' : 'Mark unresolved'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              </fieldset>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardCoordinatorMode;
