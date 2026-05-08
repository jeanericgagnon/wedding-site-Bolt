import React, { useEffect, useMemo, useState } from 'react';
import { Input, Textarea } from '../../components/ui';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { DashboardPageHero } from '../../components/dashboard/DashboardPageHero';
import { useAuth } from '../../hooks/useAuth';
import { type PlannerAccessRole, type PlannerPermissionKey } from '../../lib/plannerAccess';
import { useToast } from '../../components/ui/Toast';
import { getNextCoordinatorCheckInFocusId } from '../../lib/coordinatorCheckInAdvance';
import { getCoordinatorDoorStatus } from '../../lib/coordinatorCheckInStatus';
import { buildCoordinatorDoorEscalationPrompt } from '../../lib/coordinatorDoorEscalation';
import { resolveCoordinatorCorrectionCueTarget } from '../../lib/coordinatorCorrectionCueTarget';
import { resolveCoordinatorQueueFocus } from '../../lib/coordinatorQueueFocus';
import { resolveCoordinatorPanelFocus, type CoordinatorPanelFocus } from '../../lib/coordinatorPanelFocus';
import { resolveCoordinatorEscalationTimelineTarget } from '../../lib/coordinatorEscalationAction';
import { resolveCoordinatorReturnToBoardState } from '../../lib/coordinatorReturnToBoard';
import { getCoordinatorNeutralFocusReason } from '../../lib/coordinatorNeutralFocusReason';
import { resolveCoordinatorNeutralFocusTarget } from '../../lib/coordinatorNeutralFocusTarget';
import { getCoordinatorActiveTargetLabel } from '../../lib/coordinatorActiveTargetLabel';
import { getCoordinatorTimelineTransitionLabel, syncCoordinatorAlertDraftForTimelineTransition } from '../../lib/coordinatorTimelineTransition';
import { getCoordinatorCommandSummaryTarget } from '../../lib/coordinatorCommandSummaryTarget';
import { getCoordinatorCommandJumpLabel } from '../../lib/coordinatorCommandJumpLabel';
import { applyCoordinatorAlertSuggestion } from '../../lib/coordinatorAlertSuggestionApply';
import { shouldResetCoordinatorAlertOverride } from '../../lib/coordinatorAlertOverrideReset';
import { createCoordinatorSummaryFeedback, type CoordinatorSummaryFeedback } from '../../lib/coordinatorSummaryFeedback';
import { canManageCoordinatorCheckIn, canManageCoordinatorQna, canManageCoordinatorTimeline, canScheduleCoordinatorAlerts, canSendImmediateCoordinatorAlerts } from '../../lib/coordinatorRoleAccess';
import type { GuestLiteForCoordinator } from '../../lib/coordinatorTypes';
import { setCoordinatorEventTimelineState } from '../../lib/coordinatorTimelineState';
import { resolveCoordinatorTimelineAlertIntent } from '../../lib/coordinatorTimelineAlertIntent';
import { appendCoordinatorAlertLogItem, resolveCoordinatorScheduledFor, validateCoordinatorAlertForm } from '../../lib/coordinatorAlertFlow';
import { resetCoordinatorAlertFormAfterSend } from '../../lib/coordinatorAlertReset';
import { updateCoordinatorQnaItem } from '../../lib/coordinatorQnaFlow';
import { getFirstOpenCoordinatorQnaId, getNextCoordinatorQnaFocusId } from '../../lib/coordinatorQnaFocus';
import { getCoordinatorQnaDraftStateLabel, type CoordinatorQnaFilter } from '../../lib/coordinatorQnaTriage';
import { resolveCoordinatorQnaFocusAfterItemsChange, resolveCoordinatorTimelineFocusAfterStateChange } from '../../lib/coordinatorResolvedFocus';
import { getCoordinatorStablePromptTarget } from '../../lib/coordinatorStablePromptTarget';
import { getCoordinatorStandingPromptReason } from '../../lib/coordinatorStandingPromptReason';
import { getCoordinatorStandingPromptReasonTightened } from '../../lib/coordinatorStandingPromptReasonTighten';
import type { AlertLog, EventLite, QnaItem, TimelineState } from './coordinator/coordinatorDashboardTypes';
import {
  createCoordinatorAlertMessage,
  createCoordinatorQnaQuestion,
  updateCoordinatorGuestCheckIn,
  updateCoordinatorQnaAnswer,
} from './coordinator/coordinatorService';
import { buildCoordinatorDashboardBoardActions } from './coordinator/buildCoordinatorDashboardBoardActions';
import { CoordinatorAttentionPanel, CoordinatorCheckInQueuePanel, CoordinatorDayOfMessagePanel, CoordinatorDayOfSummaryPanel, CoordinatorHandoffPanel, CoordinatorHelperAccessPanel, CoordinatorRoleSelector, CoordinatorStatCards, CoordinatorTimelinePanel } from './coordinator/CoordinatorModePanels';
import { buildCoordinatorDashboardFocusActions } from './coordinator/buildCoordinatorDashboardFocusActions';
import { buildCoordinatorDashboardDerivedState } from './coordinator/buildCoordinatorDashboardDerivedState';
import { useCoordinatorDashboardData } from './coordinator/useCoordinatorDashboardData';
import { useCoordinatorDashboardCueLifecycle } from './coordinator/useCoordinatorDashboardCueLifecycle';


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
  const canCheckIn = canManageCoordinatorCheckIn(coordinatorRole, coordinatorPermissions);
  const canEditQna = canManageCoordinatorQna(coordinatorRole, coordinatorPermissions);
  const canEditTimeline = canManageCoordinatorTimeline(coordinatorRole, coordinatorPermissions);
  const canSendAlerts = canSendImmediateCoordinatorAlerts(coordinatorRole, coordinatorPermissions);
  const canScheduleAlerts = canScheduleCoordinatorAlerts(coordinatorRole, coordinatorPermissions);

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


  const {
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
    checkInBoardTargetId,
    checkInQueue,
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
  } = useMemo(() => buildCoordinatorDashboardDerivedState({
    activeGuestId,
    activeQnaId,
    activeTimelineEventId,
    alertChannelFilter,
    alertForm,
    alertLog,
    alertOverrideLabelState,
    alertOverrideUpdatedAt,
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
    manualOverrideLabel,
    manualOverrideUpdatedAt,
    panelFocus,
    previousAlertAligned,
    qnaDraftAnswers,
    qnaFilter,
    qnaItems,
    summaryFeedback,
    timelineState,
    canEditTimeline,
    canScheduleAlerts,
  }), [
    activeGuestId,
    activeQnaId,
    activeTimelineEventId,
    alertChannelFilter,
    alertForm,
    alertLog,
    alertOverrideLabelState,
    alertOverrideUpdatedAt,
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
    manualOverrideLabel,
    manualOverrideUpdatedAt,
    panelFocus,
    previousAlertAligned,
    qnaDraftAnswers,
    qnaFilter,
    qnaItems,
    summaryFeedback,
    timelineState,
    canEditTimeline,
    canScheduleAlerts,
  ]);
  const alertValidationError = validateCoordinatorAlertForm(alertForm, alertAudienceCount);


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
  useCoordinatorDashboardCueLifecycle({
    activeGuestId,
    activeQnaId,
    activeTimelineEventId,
    alertOverrideLabelState,
    checkInBoardTargetId,
    commandJumpLabel,
    commandJumpPanelFocus,
    commandJumpTargetId,
    manualOverrideLabel,
    overrideCueShownAt,
    panelFocus,
    qnaBoardTargetId,
    summaryFeedback,
    summaryFeedbackShownAt,
    timelineBoardTargetId,
    setAlertOverrideLabelState,
    setAlertOverrideUpdatedAt,
    setCommandJumpLabel,
    setCommandJumpPanelFocus,
    setCommandJumpTargetId,
    setManualOverrideLabel,
    setManualOverrideUpdatedAt,
    setOverrideCueShownAt,
    setSummaryFeedback,
    setSummaryFeedbackShownAt,
  });

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
