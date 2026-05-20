import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
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
import { setCoordinatorEventTimelineState } from '../../lib/coordinatorTimelineState';
import { resolveCoordinatorTimelineAlertIntent } from '../../lib/coordinatorTimelineAlertIntent';
import { validateCoordinatorAlertForm } from '../../lib/coordinatorAlertFlow';
import { updateCoordinatorQnaItem } from '../../lib/coordinatorQnaFlow';
import { type CoordinatorQnaFilter } from '../../lib/coordinatorQnaTriage';
import { resolveCoordinatorQnaFocusAfterItemsChange, resolveCoordinatorTimelineFocusAfterStateChange } from '../../lib/coordinatorResolvedFocus';
import { getCoordinatorStablePromptTarget } from '../../lib/coordinatorStablePromptTarget';
import { getCoordinatorStandingPromptReason } from '../../lib/coordinatorStandingPromptReason';
import { getCoordinatorStandingPromptReasonTightened } from '../../lib/coordinatorStandingPromptReasonTighten';
import { normalizeCoordinatorIssueDraftForTypeChange } from '../../lib/coordinatorIssueDraft';
import type { GuestLiteForCoordinator } from '../../lib/coordinatorTypes';
import { copyTextOrDownload } from '../../lib/copyText';
import type {
  CoordinatorEventHandoff,
  CoordinatorIssueStatus,
  CoordinatorIssueType,
  CoordinatorRunnerTaskStatus,
} from './coordinator/coordinatorDashboardTypes';
import {
  updateCoordinatorGuestSeatAssignment,
  updateCoordinatorQnaAnswer,
  upsertCoordinatorEventHandoff,
  upsertCoordinatorIssueLog,
} from './coordinator/coordinatorService';
import { buildCoordinatorDashboardBoardActions } from './coordinator/buildCoordinatorDashboardBoardActions';
import { buildCoordinatorDashboardRouteContentProps } from './coordinator/buildCoordinatorDashboardRouteContentProps';
import { buildCoordinatorDashboardRouteSupport } from './coordinator/buildCoordinatorDashboardRouteSupport';
import { CoordinatorDashboardRouteContent } from './coordinator/CoordinatorDashboardRouteContent';
import { useCoordinatorDashboardActions } from './coordinator/useCoordinatorDashboardActions';
import { buildCoordinatorDashboardFocusActions } from './coordinator/buildCoordinatorDashboardFocusActions';
import { buildCoordinatorDashboardDerivedState } from './coordinator/buildCoordinatorDashboardDerivedState';
import {
  buildCoordinatorIssueOperationalMetadata,
  buildCoordinatorShiftSnapshotHtml,
  buildCoordinatorShiftSnapshotText,
  readCoordinatorIssueOperationalMetadata,
} from './coordinator/coordinatorFullSuiteUtils';
import { useCoordinatorDashboardData } from './coordinator/useCoordinatorDashboardData';
import { useCoordinatorDashboardCueLifecycle } from './coordinator/useCoordinatorDashboardCueLifecycle';
import { useCoordinatorDashboardUiState, useCoordinatorDashboardUiStateSync } from './coordinator/useCoordinatorDashboardUiState';

type CoordinatorIssueDraft = {
  issueType: CoordinatorIssueType;
  status: CoordinatorIssueStatus;
  title: string;
  note: string;
  assignedTo: string;
  incidentOwner: string;
  nextAction: string;
  resolvedOutcome: string;
  runnerTaskMode: 'none' | 'runner' | 'escort';
  runnerTaskAssignee: string;
  runnerTaskStatus: CoordinatorRunnerTaskStatus;
  runnerTaskDetail: string;
  runnerTaskCompletionNote: string;
  replacementName: string;
  replacementPartySize: string;
  itineraryEventId: string | null;
  tableId: string | null;
};

const createEmptyIssueDraft = (): CoordinatorIssueDraft => ({
  issueType: 'seat-change',
  status: 'open',
  title: '',
  note: '',
  assignedTo: '',
  incidentOwner: '',
  nextAction: '',
  resolvedOutcome: '',
  runnerTaskMode: 'none',
  runnerTaskAssignee: '',
  runnerTaskStatus: 'queued',
  runnerTaskDetail: '',
  runnerTaskCompletionNote: '',
  replacementName: '',
  replacementPartySize: '1',
  itineraryEventId: null,
  tableId: null,
});

const buildCoordinatorIssueTitle = ({
  guest,
  eventName,
  issueType,
}: {
  guest: GuestLiteForCoordinator;
  eventName: string | null;
  issueType: CoordinatorIssueType;
}) => {
  const eventLabel = eventName ? ` for ${eventName}` : '';
  switch (issueType) {
    case 'help-desk':
      return `Help desk follow-up for ${guest.name}${eventLabel}`;
    case 'manager-decision':
      return `Manager decision for ${guest.name}${eventLabel}`;
    case 'plus-one-swap':
      return `Plus-one swap for ${guest.name}${eventLabel}`;
    case 'seat-change':
      return `Seat change for ${guest.name}${eventLabel}`;
    case 'substitute-attendee':
      return `Substitute attendee for ${guest.name}${eventLabel}`;
    case 'walk-in':
      return `Walk-in review for ${guest.name}${eventLabel}`;
    default:
      return `${guest.name}${eventLabel}`;
  }
};


export const DashboardCoordinatorMode: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const { toast } = useToast();
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
    eventHandoffs,
    eventGuestIds,
    eventSeatingConfiguredIds,
    eventSeatingEventIds,
    eventSeatingTables,
    events,
    guests,
    issueLogs,
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
    setEventHandoffs,
    setEventSeatingEventIds,
    setGuests,
    setIssueLogs,
    setLastAlertSuggestionKey,
    setPanelFocus,
    setQnaDraftAnswers,
    setQnaFilter,
    setQnaInput,
    setQnaItems,
    setTimelineState,
    siteId,
    siteSlug,
    timelineState,
  } = useCoordinatorDashboardData({
    isDemoMode,
    toast,
    userId: user?.id,
  });
  const previousSiteIdRef = useRef<string | null>(null);
  const [handoffBusyEventId, setHandoffBusyEventId] = useState<string | null>(null);
  const [issueBusy, setIssueBusy] = useState(false);
  const [snapshotCopyNotice, setSnapshotCopyNotice] = useState<'copied' | 'downloaded' | null>(null);
  const [copyingShiftSnapshot, setCopyingShiftSnapshot] = useState(false);
  const shiftSnapshotCopyRequestIdRef = useRef(0);
  const coordinatorModeMountedRef = useRef(true);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [issueDraft, setIssueDraft] = useState<CoordinatorIssueDraft>(createEmptyIssueDraft);
  const resetCoordinatorPageInteractionState = () => {
    shiftSnapshotCopyRequestIdRef.current += 1;
    setHandoffBusyEventId(null);
    setIssueBusy(false);
    setSnapshotCopyNotice(null);
    setCopyingShiftSnapshot(false);
    setSelectedIssueId(null);
    setIssueDraft(createEmptyIssueDraft());
  };

  useEffect(() => () => {
    coordinatorModeMountedRef.current = false;
    shiftSnapshotCopyRequestIdRef.current += 1;
  }, []);
  const {
    canCheckIn,
    canEditQna,
    canEditTimeline,
    canScheduleAlerts,
    canSendAlerts,
  } = buildCoordinatorDashboardRouteSupport({
    coordinatorPermissions,
    coordinatorRole,
  });
  const {
    alertOverrideLabelState,
    alertOverrideUpdatedAt,
    commandJumpLabel,
    commandJumpPanelFocus,
    commandJumpTargetId,
    manualOverrideLabel,
    manualOverrideUpdatedAt,
    neutralFocusReason,
    overrideCueShownAt,
    previousAlertAligned,
    setAlertOverrideLabelState,
    setAlertOverrideUpdatedAt,
    setCommandJumpLabel,
    setCommandJumpPanelFocus,
    setCommandJumpTargetId,
    setManualOverrideLabel,
    setManualOverrideUpdatedAt,
    setNeutralFocusReason,
    setOverrideCueShownAt,
    setPreviousAlertAligned,
    setSummaryFeedback,
    setSummaryFeedbackShownAt,
    summaryFeedback,
    summaryFeedbackShownAt,
  } = useCoordinatorDashboardUiState({ siteId, isDemoMode });

  useEffect(() => {
    if (previousSiteIdRef.current && siteId && previousSiteIdRef.current !== siteId) {
      resetCoordinatorPageInteractionState();
    }
    previousSiteIdRef.current = siteId;
  }, [siteId]);

  useEffect(() => {
    if (!siteId && !isDemoMode) {
      resetCoordinatorPageInteractionState();
    }
  }, [isDemoMode, siteId]);

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
    checkInEventId,
    checkInEventName,
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
    eventSeatingConfiguredIds,
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
    eventSeatingConfiguredIds,
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
  useCoordinatorDashboardUiStateSync({
    commandSource,
    correctionCueCount: correctionCues.length,
    liveIssueCount: liveIssues.length,
    panelFocus,
    primaryActionKey: primaryAction.key,
    setCommandSource,
    setNeutralFocusReason,
  });
  const canEditHandoffs = coordinatorRole !== 'viewer';
  const activeIssueGuest = useMemo(
    () => guests.find((guest) => guest.id === activeGuestId) ?? null,
    [guests, activeGuestId],
  );
  const issueDraftEventId = issueDraft.itineraryEventId ?? checkInEventId;
  const issueDraftTables = issueDraftEventId ? (eventSeatingTables[issueDraftEventId] ?? []) : [];
  const shiftSnapshot = useMemo(() => buildCoordinatorShiftSnapshotText({
    events,
    eventHandoffs,
    generatedAtLabel: new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).replace(',', ''),
    issueLogs,
    stats,
  }), [eventHandoffs, events, issueLogs, stats]);
  const shiftSnapshotContextKey = `${shiftSnapshot.filename}\n${shiftSnapshot.text}`;
  const shiftSnapshotContextKeyRef = useRef(shiftSnapshotContextKey);
  shiftSnapshotContextKeyRef.current = shiftSnapshotContextKey;

  useEffect(() => {
    shiftSnapshotCopyRequestIdRef.current += 1;
    setCopyingShiftSnapshot(false);
    setSnapshotCopyNotice(null);
  }, [shiftSnapshotContextKey]);
  const {
    clearCoordinatorTransientState,
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
    checkInStatusContext,
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
    checkInStatusContext,
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
    routeGuestAtDoor,
    routeUnmatchedDoorIssue,
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
    currentDoorEventId: checkInEventId,
    focusCoordinatorQnaLane,
    isDemoMode,
    preferredAlertSuggestion,
    qnaInput,
    setActiveGuestId,
    setActiveQnaId,
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

  const updateIssueDraft = (patch: Partial<CoordinatorIssueDraft>) => {
    setIssueDraft((prev) => {
      if (!patch.issueType || patch.issueType === prev.issueType) {
        return { ...prev, ...patch };
      }
      return {
        ...prev,
        ...normalizeCoordinatorIssueDraftForTypeChange(prev, patch.issueType),
        ...patch,
      };
    });
  };

  const clearIssueDraft = () => {
    setSelectedIssueId(null);
    setIssueDraft(createEmptyIssueDraft());
  };

  const copyShiftSnapshot = async () => {
    if (copyingShiftSnapshot) return;
    const requestId = shiftSnapshotCopyRequestIdRef.current + 1;
    shiftSnapshotCopyRequestIdRef.current = requestId;
    const requestContextKey = shiftSnapshotContextKeyRef.current;
    const isCurrentShiftSnapshotCopy = () => (
      coordinatorModeMountedRef.current &&
      requestId === shiftSnapshotCopyRequestIdRef.current &&
      requestContextKey === shiftSnapshotContextKeyRef.current
    );
    setSnapshotCopyNotice(null);
    setCopyingShiftSnapshot(true);
    try {
      const result = await copyTextOrDownload(shiftSnapshot.text, shiftSnapshot.filename);
      if (!isCurrentShiftSnapshotCopy()) return;
      setSnapshotCopyNotice(result);
      toast(result === 'copied' ? 'Shift snapshot copied.' : 'Shift snapshot downloaded.', 'success');
    } catch {
      if (!isCurrentShiftSnapshotCopy()) return;
      toast('Couldn’t copy the shift snapshot right now.', 'error');
    } finally {
      if (isCurrentShiftSnapshotCopy()) {
        setCopyingShiftSnapshot(false);
      }
    }
  };

  const printShiftSnapshot = () => {
    if (typeof window === 'undefined') return;
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=1000,height=900');
    if (!popup) {
      toast('Popup blocked. Please allow popups to print the shift snapshot.', 'error');
      return;
    }
    popup.document.open();
    popup.document.write(buildCoordinatorShiftSnapshotHtml(shiftSnapshot.text));
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const upsertLocalHandoff = (eventId: string, patch: Partial<CoordinatorEventHandoff>) => {
    setEventHandoffs((prev) => {
      const existing = prev.find((item) => item.itinerary_event_id === eventId);
      if (!existing) {
        return [
          ...prev,
          {
            id: `draft-${eventId}`,
            itinerary_event_id: eventId,
            handoff_status: 'ready',
            lead_name: null,
            support_name: null,
            note: null,
            updated_at: null,
            ...patch,
          },
        ];
      }
      return prev.map((item) => (
        item.itinerary_event_id === eventId
          ? { ...item, ...patch }
          : item
      ));
    });
  };

  const saveHandoff = async (eventId: string) => {
    const handoff = eventHandoffs.find((item) => item.itinerary_event_id === eventId) ?? {
      id: `draft-${eventId}`,
      itinerary_event_id: eventId,
      handoff_status: 'ready' as const,
      lead_name: null,
      support_name: null,
      note: null,
      updated_at: null,
    };
    setHandoffBusyEventId(eventId);
    try {
      const saved = isDemoMode
        ? {
          ...handoff,
          lead_name: handoff.lead_name?.trim() || null,
          support_name: handoff.support_name?.trim() || null,
          note: handoff.note?.trim() || null,
          updated_at: new Date().toISOString(),
        }
        : siteId
          ? await upsertCoordinatorEventHandoff({
            siteId,
            itineraryEventId: eventId,
            handoffStatus: handoff.handoff_status,
            leadName: handoff.lead_name?.trim() || null,
            supportName: handoff.support_name?.trim() || null,
            note: handoff.note?.trim() || null,
          })
          : null;
      if (!saved) {
        toast('Couldn’t save that handoff right now.', 'error');
        return;
      }
      setEventHandoffs((prev) => [
        ...prev.filter((item) => item.itinerary_event_id !== eventId),
        saved,
      ]);
      toast('Event handoff saved.', 'success');
    } catch {
      toast('Couldn’t save that handoff right now.', 'error');
    } finally {
      setHandoffBusyEventId((current) => (current === eventId ? null : current));
    }
  };

  const prefillIssueType = (issueType: CoordinatorIssueType) => {
    if (!activeIssueGuest) {
      toast('Pick a guest in the check-in queue first.', 'info');
      return;
    }
    const eventId = issueDraft.itineraryEventId ?? checkInEventId;
    const eventName = events.find((event) => event.id === eventId)?.event_name ?? checkInEventName ?? null;
    setSelectedIssueId(null);
    setIssueDraft({
      ...createEmptyIssueDraft(),
      issueType,
      title: buildCoordinatorIssueTitle({
        guest: activeIssueGuest,
        eventName,
        issueType,
      }),
      itineraryEventId: eventId,
      status: issueType === 'seat-change' ? 'working' : 'open',
    });
  };

  const selectIssue = (issueId: string) => {
    const issue = issueLogs.find((item) => item.id === issueId);
    if (!issue) return;
    const metadata = readCoordinatorIssueOperationalMetadata(issue.metadata);
    setSelectedIssueId(issueId);
    if (issue.guest_id) setActiveGuestId(issue.guest_id);
    setIssueDraft({
      issueType: issue.issue_type,
      status: issue.status,
      title: issue.title,
      note: issue.note ?? '',
      assignedTo: issue.assigned_to ?? '',
      incidentOwner: metadata.incident_owner ?? '',
      nextAction: metadata.next_action ?? '',
      resolvedOutcome: metadata.resolved_outcome ?? '',
      runnerTaskMode: metadata.runner_task?.mode ?? 'none',
      runnerTaskAssignee: metadata.runner_task?.assignee ?? '',
      runnerTaskStatus: metadata.runner_task?.status ?? 'queued',
      runnerTaskDetail: metadata.runner_task?.detail ?? '',
      runnerTaskCompletionNote: metadata.runner_task?.completion_note ?? '',
      replacementName: issue.replacement_name ?? '',
      replacementPartySize: issue.replacement_party_size ? String(issue.replacement_party_size) : '1',
      itineraryEventId: issue.itinerary_event_id ?? checkInEventId,
      tableId: issue.table_id ?? null,
    });
  };

  const saveIssue = async () => {
    if (!activeIssueGuest) {
      toast('Pick a guest before saving an issue.', 'info');
      return;
    }
    const itineraryEventId = issueDraft.itineraryEventId ?? checkInEventId;
    const eventName = events.find((event) => event.id === itineraryEventId)?.event_name ?? checkInEventName ?? null;
    const title = issueDraft.title.trim() || buildCoordinatorIssueTitle({
      guest: activeIssueGuest,
      eventName,
      issueType: issueDraft.issueType,
    });
    if (issueDraft.issueType === 'seat-change' && (!itineraryEventId || !issueDraft.tableId)) {
      toast('Choose an event and target table for a seat change.', 'error');
      return;
    }
    if (
      (issueDraft.issueType === 'substitute-attendee' || issueDraft.issueType === 'plus-one-swap')
      && !issueDraft.replacementName.trim()
    ) {
      toast('Add the arriving substitute or plus-one name.', 'error');
      return;
    }
    if (issueDraft.replacementPartySize.trim() && Number.isNaN(Number(issueDraft.replacementPartySize.trim()))) {
      toast('Replacement party size must be a number.', 'error');
      return;
    }
    if (!issueDraft.incidentOwner.trim()) {
      toast('Set an owner before saving the issue.', 'error');
      return;
    }
    if (issueDraft.status !== 'resolved' && !issueDraft.nextAction.trim()) {
      toast('Add the next action before saving the issue.', 'error');
      return;
    }
    if (issueDraft.status === 'resolved' && !issueDraft.resolvedOutcome.trim()) {
      toast('Capture the resolved outcome before closing the issue.', 'error');
      return;
    }
    if (issueDraft.runnerTaskMode !== 'none' && !issueDraft.runnerTaskDetail.trim()) {
      toast('Add the runner or escort task detail before saving.', 'error');
      return;
    }
    if (
      issueDraft.runnerTaskMode !== 'none'
      && issueDraft.runnerTaskStatus !== 'queued'
      && !issueDraft.runnerTaskAssignee.trim()
    ) {
      toast('Assign the runner or escort before moving the task forward.', 'error');
      return;
    }

    setIssueBusy(true);
    try {
      let resolvedSeatingEventId = itineraryEventId
        ? (eventSeatingEventIds[itineraryEventId] ?? activeIssueGuest.event_arrivals?.[itineraryEventId]?.seating_event_id ?? null)
        : null;
      const nextTable = issueDraft.tableId
        ? issueDraftTables.find((table) => table.id === issueDraft.tableId)
        : null;

      if (itineraryEventId && issueDraft.tableId) {
        if (!isDemoMode) {
          if (!siteId) {
            toast('Couldn’t save that issue right now.', 'error');
            return;
          }
          const seatingResult = await updateCoordinatorGuestSeatAssignment({
            siteId,
            guestId: activeIssueGuest.id,
            itineraryEventId,
            tableId: issueDraft.tableId,
          });
          resolvedSeatingEventId = seatingResult.seatingEventId;
          if (!eventSeatingEventIds[itineraryEventId]) {
            setEventSeatingEventIds((prev) => ({ ...prev, [itineraryEventId]: seatingResult.seatingEventId }));
          }
        }

        setGuests((prev) => prev.map((guest) => {
          if (guest.id !== activeIssueGuest.id) return guest;
          return {
            ...guest,
            door_route: null,
            event_arrivals: {
              ...(guest.event_arrivals ?? {}),
              [itineraryEventId]: {
                seating_event_id: resolvedSeatingEventId,
                table_id: issueDraft.tableId,
                table_name: nextTable?.table_name ?? 'Unassigned',
                checked_in_at: guest.event_arrivals?.[itineraryEventId]?.checked_in_at ?? null,
                is_seated: Boolean(issueDraft.tableId),
              },
            },
          };
        }));
      }

      const replacementPartySize = issueDraft.replacementPartySize.trim();
      const previousMetadata = issueLogs.find((item) => item.id === selectedIssueId)?.metadata ?? null;
      const metadata = buildCoordinatorIssueOperationalMetadata({
        activeGuestName: activeIssueGuest.name,
        existingMetadata: previousMetadata,
        householdMembers: activeIssueGuest.household_id
          ? guests
            .filter((guest) => guest.household_id === activeIssueGuest.household_id)
            .map((guest) => ({ id: guest.id, name: guest.name }))
          : [],
        incidentOwner: issueDraft.incidentOwner,
        nextAction: issueDraft.nextAction,
        resolvedOutcome: issueDraft.resolvedOutcome,
        runnerTask: {
          mode: issueDraft.runnerTaskMode,
          assignee: issueDraft.runnerTaskAssignee,
          status: issueDraft.runnerTaskStatus,
          detail: issueDraft.runnerTaskDetail,
          completionNote: issueDraft.runnerTaskCompletionNote,
        },
        now: new Date().toISOString(),
      });

      const saved = isDemoMode
        ? {
          id: selectedIssueId ?? `demo-issue-${Date.now()}`,
          guest_id: activeIssueGuest.id,
          itinerary_event_id: itineraryEventId ?? null,
          issue_type: issueDraft.issueType,
          status: issueDraft.status,
          title,
          note: issueDraft.note.trim() || null,
          assigned_to: issueDraft.assignedTo.trim() || null,
          replacement_name: issueDraft.replacementName.trim() || null,
          replacement_party_size: replacementPartySize ? Number(replacementPartySize) : null,
          table_id: issueDraft.tableId ?? null,
          table_name: nextTable?.table_name ?? null,
          metadata,
          created_at: issueLogs.find((item) => item.id === selectedIssueId)?.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        : siteId
          ? await upsertCoordinatorIssueLog({
            siteId,
            issueId: selectedIssueId,
            guestId: activeIssueGuest.id,
            itineraryEventId: itineraryEventId ?? null,
            issueType: issueDraft.issueType,
            status: issueDraft.status,
            title,
            note: issueDraft.note.trim() || null,
            assignedTo: issueDraft.assignedTo.trim() || null,
            replacementName: issueDraft.replacementName.trim() || null,
            replacementPartySize: replacementPartySize ? Number(replacementPartySize) : null,
            tableId: issueDraft.tableId ?? null,
            tableName: nextTable?.table_name ?? null,
            metadata,
          })
          : null;

      if (!saved) {
        toast('Couldn’t save that issue right now.', 'error');
        return;
      }

      setIssueLogs((prev) => [
        saved,
        ...prev.filter((item) => item.id !== saved.id),
      ].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)));
      setSelectedIssueId(saved.id);
      const savedMetadata = readCoordinatorIssueOperationalMetadata(saved.metadata);
      setIssueDraft({
        issueType: saved.issue_type,
        status: saved.status,
        title: saved.title,
        note: saved.note ?? '',
        assignedTo: saved.assigned_to ?? '',
        incidentOwner: savedMetadata.incident_owner ?? issueDraft.incidentOwner,
        nextAction: savedMetadata.next_action ?? '',
        resolvedOutcome: savedMetadata.resolved_outcome ?? '',
        runnerTaskMode: savedMetadata.runner_task?.mode ?? 'none',
        runnerTaskAssignee: savedMetadata.runner_task?.assignee ?? '',
        runnerTaskStatus: savedMetadata.runner_task?.status ?? 'queued',
        runnerTaskDetail: savedMetadata.runner_task?.detail ?? '',
        runnerTaskCompletionNote: savedMetadata.runner_task?.completion_note ?? '',
        replacementName: saved.replacement_name ?? '',
        replacementPartySize: saved.replacement_party_size ? String(saved.replacement_party_size) : '1',
        itineraryEventId: saved.itinerary_event_id,
        tableId: saved.table_id,
      });
      toast('Day-of issue saved.', 'success');
    } catch {
      toast('Couldn’t save that issue right now.', 'error');
    } finally {
      setIssueBusy(false);
    }
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
    doorStatusContext: checkInStatusContext,
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
    siteSlug,
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

  const coordinatorDashboardRouteContentProps = buildCoordinatorDashboardRouteContentProps({
    attentionPanelProps: {
          correctionCues,
          liveIssues,
          nextArrivals,
          onArrivalClick: focusArrivalGuest,
          onCorrectionCueClick: runCorrectionCue,
          onEscalationClick: runEscalationIssue,
        },
    handoffPanelProps: {
          canEditHandoffs,
          events,
          eventHandoffs,
          handoffBusyEventId,
          onChangeHandoff: upsertLocalHandoff,
          onSaveHandoff: (eventId) => { void saveHandoff(eventId); },
        },
    checkInQueuePanelProps: {
          activeGuestId,
          canCheckIn,
          canEditQna,
          checkInBoard,
          checkInEventName,
          checkInBoardTargetId,
          checkInBusyGuestId,
          checkInFilter,
          checkInQuery,
          checkInQueue,
          checkInReviewOnly,
          checkInStatusContext,
          checkInTargetState,
          checkInWatchCount,
          isFocused: panelFocus === 'check-in',
          nextArrivals,
          siteSlug,
          onCheckInGuest: toggleCheckIn,
          onEscalateDoorReview: (guest) => {
            setActiveGuestId(guest.id);
            setPanelFocus('check-in');
            prefillIssueType('manager-decision');
          },
          onFocusFirstQueueGuest: focusFirstCoordinatorQueueGuest,
          onFocusLane: focusCoordinatorCheckInLane,
          onRouteGuest: routeGuestAtDoor,
          onRouteNoMatch: (route) => { void routeUnmatchedDoorIssue(checkInQuery, route); },
          onSelectGuest: setActiveGuestId,
          onSetFilter: (filter) => {
            setCheckInFilter(filter);
            setCheckInReviewOnly(false);
          },
          onSetQuery: setCheckInQuery,
        },
    coordinatorRole,
    dayOfMessagePanelProps: {
          alertActivityBoard,
          alertBoard,
          alertBusy,
          alertChannelFilter,
          alertForm,
          alertLaneLabel,
          alertLog,
          alertOverrideCurrentLabel,
          alertOverrideLabel,
          alertOverrideTargetLabel,
          alertStats,
          alertSuggestions,
          alertSummary,
          alertTargetCue,
          alertTimingFilter,
          alertValidationError,
          canScheduleAlerts,
          canSendAlerts,
          eventAudienceOptions,
          filteredAlertLogCount: filteredAlertLog.length,
          filteredAlertLogView,
          onFocusLane: focusCoordinatorAlertLane,
          onSendAlert: () => void sendDayOfAlert(),
          onSetAlertChannelFilter: setAlertChannelFilter,
          onSetAlertForm: setAlertForm,
          onSetAlertTimingFilter: setAlertTimingFilter,
          onSetLastAlertSuggestionKey: setLastAlertSuggestionKey,
          preferredAlertSuggestion,
        },
    dayOfSummaryPanelProps: {
          alertOverrideBadge,
          alertOverrideCurrentLabel,
          alertOverrideTargetLabel,
          commandBoard,
          commandDeckItems,
          commandModeGuidance,
          commandModeLabel,
          commandSource,
          commandSummaryItems,
          executionBoard,
          hasPanelFocus: Boolean(panelFocus),
          manualOverrideActionLabel,
          manualOverrideBadge,
          manualOverrideCurrentTargetLabel,
          manualOverrideTargetLabel,
          navigationBoard,
          neutralFocusReason,
          onCommandClick: jumpToCommandSummaryItem,
          onOpsSnapshotClick: jumpToOpsSnapshotLane,
          onPrimaryAction: runPrimaryAction,
          onReturnToBoard: returnToBoard,
          onReturnToBoardTarget: returnToBoardTarget,
          onRevisitNeutralFocus: revisitNeutralFocus,
          onStablePromptClick: jumpToStablePrompt,
          opsSnapshotItems,
          overrideBadgeToneClassName,
          primaryAction,
          primaryActionBoard,
          priorityCommandCta,
          priorityCommandLabel,
          priorityCommandReason,
          priorityCommandTargetReason,
          stablePrompt,
          stablePromptBadgeToneClassName,
          stablePromptStateToneClassName,
          stablePromptTargetLabel,
          standingPromptBadge,
          standingPromptCopy,
          standingPromptMode,
          standingPromptStateLabel,
          summaryDisplayCue,
          summaryFeedbackBadge,
          summaryFeedbackBadgeToneClassName,
          summaryFeedbackCopy,
          summaryFeedbackLayout,
          summaryFeedbackTone,
        },
    hasUncheckedGuests: sortedGuests.some((guest) => !guest.checked_in_at),
    helperAccessPanelProps: {
          coordinatorRole,
          roleBoard,
          roleCapabilities,
        },
    onActiveGuestCheckIn: () => {
          const activeGuest = checkInQueue.find((guest) => guest.id === activeGuestId);
          if (!activeGuest) return;
          focusCoordinatorCheckInLane();
          void toggleCheckIn(activeGuest);
        },
    onReadyNowClick: () => {
          focusCoordinatorCheckInLane();
          setCheckInFilter('arrivals');
          setCheckInReviewOnly(false);
          setActiveGuestId(nextArrivals[0]?.id ?? null);
        },
    onReviewOnlyClick: () => {
          focusCoordinatorCheckInLane();
          setCheckInFilter('arrivals');
          setCheckInReviewOnly((prev) => !prev);
          setActiveGuestId(checkInBoardTargetId);
        },
    issueDeskPanelProps: {
          activeGuest: activeIssueGuest,
          canEditIssues: canEditQna,
          currentEventId: checkInEventId,
          currentEventName: checkInEventName,
          events,
          guests,
          issueBusy,
          issueDraft,
          issueLogs,
          selectedIssueId,
          seatingTables: issueDraftTables,
          onClearIssueDraft: clearIssueDraft,
          onDraftChange: updateIssueDraft,
          onPrefillIssueType: prefillIssueType,
          onSaveIssue: () => { void saveIssue(); },
          onSelectIssue: selectIssue,
        },
    continuityPanelProps: {
          activeGuest: activeIssueGuest,
          eventHandoffs,
          events,
          issueLogs,
          onSelectIssue: selectIssue,
        },
    runnerBoardPanelProps: {
          issueLogs,
          onSelectIssue: selectIssue,
          selectedIssueId,
        },
    shiftSnapshotPanelProps: {
          onCopySnapshot: () => { void copyShiftSnapshot(); },
          onPrintSnapshot: printShiftSnapshot,
          snapshotCopyNotice,
          copyingSnapshot: copyingShiftSnapshot,
          snapshotDetail: `${issueLogs.filter((issue) => issue.status !== 'resolved').length} unresolved incidents and ${eventHandoffs.length} event handoffs are included in the export.`,
        },
    qnaPanelProps: {
          activeQnaDraftStateLabel,
          activeQnaId,
          activeQnaItem,
          canEditQna,
          filteredQnaItems,
          focusCoordinatorQnaLane,
          focusFirstCoordinatorOpenQna,
          focusNextCoordinatorQna,
          onAddQnaItem: () => { void addQnaItem(); },
          onChangeDraftAnswer: (id, value) => setQnaDraftAnswers((prev) => ({ ...prev, [id]: value })),
          onChangeQnaInput: setQnaInput,
          onSaveQnaAnswer: (id) => { void saveQnaAnswer(id); },
          onSelectQna: setActiveQnaId,
          onSetQnaFilter: setQnaFilter,
          panelFocus,
          qnaBoard,
          qnaBoardTargetId,
          qnaCounts,
          qnaDraftAnswers,
          qnaFilter,
          qnaInput,
          qnaItemsCount: qnaItems.length,
          qnaTargetState,
        },
    roleSelectorProps: {
          activeSiteRole,
          coordinatorRole,
          onRoleChange: setCoordinatorRole,
        },
    statsCardProps: {
          loading,
          stats,
        },
    timelinePanelProps: {
          activeTimelineEventId,
          canEditTimeline,
          events,
          liveEventId,
          onFocusLane: focusCoordinatorTimelineLane,
          onJumpToEvent: jumpToTimelineEvent,
          onRunAction: runTimelineAction,
          onSelectEvent: setActiveTimelineEventId,
          onSelectState: selectTimelineState,
          panelFocus,
          timelineBoard,
          timelineBoardTargetId,
          timelineState,
          timelineTargetState,
          upNextEventId,
        },
  });

  return (
    <DashboardLayout currentPage="coordinator">
      <CoordinatorDashboardRouteContent
        {...coordinatorDashboardRouteContentProps}
      />
    </DashboardLayout>
  );
};

export default DashboardCoordinatorMode;
