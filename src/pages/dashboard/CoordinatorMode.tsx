import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { DashboardPageHero } from '../../components/dashboard/DashboardPageHero';
import { useAuth } from '../../hooks/useAuth';
import { type PlannerAccessRole, type PlannerPermissionKey } from '../../lib/plannerAccess';
import { useToast } from '../../components/ui/Toast';
import { resolveCoordinatorCorrectionCueTarget } from '../../lib/coordinatorCorrectionCueTarget';
import { resolveCoordinatorPanelFocus, type CoordinatorPanelFocus } from '../../lib/coordinatorPanelFocus';
import { resolveCoordinatorEscalationTimelineTarget } from '../../lib/coordinatorEscalationAction';
import { resolveCoordinatorReturnToBoardState } from '../../lib/coordinatorReturnToBoard';
import { getCoordinatorNeutralFocusReason } from '../../lib/coordinatorNeutralFocusReason';
import { resolveCoordinatorNeutralFocusTarget } from '../../lib/coordinatorNeutralFocusTarget';
import { getCoordinatorTimelineTransitionLabel, syncCoordinatorAlertDraftForTimelineTransition } from '../../lib/coordinatorTimelineTransition';
import { getCoordinatorCommandSummaryTarget } from '../../lib/coordinatorCommandSummaryTarget';
import { getCoordinatorCommandJumpLabel } from '../../lib/coordinatorCommandJumpLabel';
import { shouldResetCoordinatorAlertOverride } from '../../lib/coordinatorAlertOverrideReset';
import { createCoordinatorSummaryFeedback, type CoordinatorSummaryFeedback } from '../../lib/coordinatorSummaryFeedback';
import { canManageCoordinatorCheckIn, canManageCoordinatorQna, canManageCoordinatorTimeline, canScheduleCoordinatorAlerts, canSendImmediateCoordinatorAlerts } from '../../lib/coordinatorRoleAccess';
import { setCoordinatorEventTimelineState } from '../../lib/coordinatorTimelineState';
import { resolveCoordinatorTimelineAlertIntent } from '../../lib/coordinatorTimelineAlertIntent';
import { validateCoordinatorAlertForm } from '../../lib/coordinatorAlertFlow';
import { updateCoordinatorQnaItem } from '../../lib/coordinatorQnaFlow';
import { type CoordinatorQnaFilter } from '../../lib/coordinatorQnaTriage';
import { resolveCoordinatorQnaFocusAfterItemsChange, resolveCoordinatorTimelineFocusAfterStateChange } from '../../lib/coordinatorResolvedFocus';
import { getCoordinatorStablePromptTarget } from '../../lib/coordinatorStablePromptTarget';
import { getCoordinatorStandingPromptReason } from '../../lib/coordinatorStandingPromptReason';
import { getCoordinatorStandingPromptReasonTightened } from '../../lib/coordinatorStandingPromptReasonTighten';
import { updateCoordinatorQnaAnswer } from './coordinator/coordinatorService';
import { buildCoordinatorDashboardBoardActions } from './coordinator/buildCoordinatorDashboardBoardActions';
import { CoordinatorAttentionPanel, CoordinatorCheckInQueuePanel, CoordinatorDayOfMessagePanel, CoordinatorDayOfSummaryPanel, CoordinatorHandoffPanel, CoordinatorHelperAccessPanel, CoordinatorQnaPanel, CoordinatorRoleSelector, CoordinatorStatCards, CoordinatorTimelinePanel } from './coordinator/CoordinatorModePanels';
import { useCoordinatorDashboardActions } from './coordinator/useCoordinatorDashboardActions';
import { buildCoordinatorDashboardFocusActions } from './coordinator/buildCoordinatorDashboardFocusActions';
import { buildCoordinatorDashboardDerivedState } from './coordinator/buildCoordinatorDashboardDerivedState';
import { useCoordinatorDashboardData } from './coordinator/useCoordinatorDashboardData';
import { useCoordinatorDashboardCueLifecycle } from './coordinator/useCoordinatorDashboardCueLifecycle';


export const DashboardCoordinatorMode: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const { toast } = useToast();
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

  const {
    addQnaItem,
    alertBusy,
    checkInBusyGuestId,
    sendDayOfAlert,
    toggleCheckIn,
  } = useCoordinatorDashboardActions({
    alertAudienceCount,
    alertForm,
    alertOverrideLabel,
    alertTargetCueAligned: alertTargetCue.aligned,
    canCheckIn,
    canEditQna,
    canScheduleAlerts,
    canSendAlerts,
    checkInFilter,
    checkInQueue,
    focusCoordinatorQnaLane,
    isDemoMode,
    preferredAlertSuggestion,
    qnaInput,
    setActiveGuestId,
    setAlertForm,
    setAlertLog,
    setAlertOverrideLabelState,
    setGuests,
    setPreviousAlertAligned,
    setQnaInput,
    setQnaItems,
    siteId,
    toast,
    validationError: alertValidationError,
  });
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

            <CoordinatorQnaPanel
              activeQnaDraftStateLabel={activeQnaDraftStateLabel}
              activeQnaId={activeQnaId}
              activeQnaItem={activeQnaItem}
              canEditQna={canEditQna}
              filteredQnaItems={filteredQnaItems}
              focusCoordinatorQnaLane={focusCoordinatorQnaLane}
              focusFirstCoordinatorOpenQna={focusFirstCoordinatorOpenQna}
              focusNextCoordinatorQna={focusNextCoordinatorQna}
              onAddQnaItem={() => { void addQnaItem(); }}
              onChangeDraftAnswer={(id, value) => setQnaDraftAnswers((prev) => ({ ...prev, [id]: value }))}
              onChangeQnaInput={setQnaInput}
              onSaveQnaAnswer={(id) => { void saveQnaAnswer(id); }}
              onSelectQna={setActiveQnaId}
              onSetQnaFilter={setQnaFilter}
              panelFocus={panelFocus}
              qnaBoard={qnaBoard}
              qnaBoardTargetId={qnaBoardTargetId}
              qnaCounts={qnaCounts}
              qnaDraftAnswers={qnaDraftAnswers}
              qnaFilter={qnaFilter}
              qnaInput={qnaInput}
              qnaItemsCount={qnaItems.length}
              qnaTargetState={qnaTargetState}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardCoordinatorMode;
