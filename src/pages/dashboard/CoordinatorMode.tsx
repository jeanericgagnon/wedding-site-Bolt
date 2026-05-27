import React, { useEffect, useMemo, useState } from 'react';
import { Input, Textarea } from '../../components/ui';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { PLANNER_ROLE_OPTIONS, readPlannerAccessRole, writePlannerAccessRole, type PlannerAccessRole } from '../../lib/plannerAccess';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { isAttendingRsvpStatus, isPendingRsvpStatus } from '../../lib/rsvpStatus';
import { useToast } from '../../components/ui/Toast';
import { filterCoordinatorCheckInQueue, type CoordinatorCheckInFilter } from '../../lib/coordinatorCheckInQueue';
import { getNextCoordinatorCheckInFocusId } from '../../lib/coordinatorCheckInAdvance';
import { getCoordinatorDoorStatus, getCoordinatorDoorStatusLabel } from '../../lib/coordinatorCheckInStatus';
import { getCoordinatorCheckInActionLabel, getCoordinatorTimelineCorrectionAction } from '../../lib/coordinatorCorrectionActions';
import { buildCoordinatorDoorEscalationPrompt } from '../../lib/coordinatorDoorEscalation';
import { buildCoordinatorEscalations } from '../../lib/coordinatorEscalations';
import { buildCoordinatorPrimaryAction } from '../../lib/coordinatorPrimaryAction';
import { buildCoordinatorCorrectionCues } from '../../lib/coordinatorCorrectionsSummary';
import { resolveCoordinatorCorrectionCueTarget } from '../../lib/coordinatorCorrectionCueTarget';
import { getCoordinatorCorrectionEventId, getCoordinatorCorrectionGuestId } from '../../lib/coordinatorCorrectionTarget';
import { resolveCoordinatorPrimaryActionTarget } from '../../lib/coordinatorPrimaryActionTarget';
import { resolveCoordinatorQueueFocus } from '../../lib/coordinatorQueueFocus';
import { resolveCoordinatorPanelFocus, type CoordinatorPanelFocus } from '../../lib/coordinatorPanelFocus';
import { getPlannerHandoffCopy } from '../../lib/plannerHandoffState';
import { resolveCoordinatorEscalationTimelineTarget } from '../../lib/coordinatorEscalationAction';
import { normalizeCoordinatorModeSessionState } from '../../lib/coordinatorModeSessionState';
import { normalizeCoordinatorDraftState } from '../../lib/coordinatorDraftState';
import { normalizeCoordinatorActiveWorkState } from '../../lib/coordinatorActiveWorkState';
import { normalizeCoordinatorGuestWorkState } from '../../lib/coordinatorGuestWorkState';
import { normalizeCoordinatorCommandState } from '../../lib/coordinatorCommandState';
import { getCoordinatorCommandModeLabel } from '../../lib/coordinatorCommandModeLabel';
import { getCoordinatorCommandModeGuidance } from '../../lib/coordinatorCommandModeGuidance';
import { resolveCoordinatorReturnToBoardState } from '../../lib/coordinatorReturnToBoard';
import { getCoordinatorNeutralFocusReason } from '../../lib/coordinatorNeutralFocusReason';
import { resolveCoordinatorNeutralFocusTarget } from '../../lib/coordinatorNeutralFocusTarget';
import { getCoordinatorActionHint } from '../../lib/coordinatorActionCopy';
import { getCoordinatorActiveTargetLabel } from '../../lib/coordinatorActiveTargetLabel';
import { getCoordinatorCheckInBoardTargetId, getCoordinatorCheckInTargetState } from '../../lib/coordinatorCheckInTargetState';
import { getCoordinatorTimelineBoardTargetId, getCoordinatorTimelineTargetState } from '../../lib/coordinatorTimelineTargetState';
import { getCoordinatorQnaTargetState } from '../../lib/coordinatorQnaTargetState';
import { getCoordinatorTimelineTransitionLabel, syncCoordinatorAlertDraftForTimelineTransition } from '../../lib/coordinatorTimelineTransition';
import { buildCoordinatorCommandSummary } from '../../lib/coordinatorCommandSummary';
import { formatCoordinatorEventDateTime } from './coordinatorEventTime';
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
import { getCoordinatorAlertSuggestionState } from '../../lib/coordinatorAlertSuggestionState';
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
import { normalizeCoordinatorTimelineWorkState } from '../../lib/coordinatorTimelineWorkState';
import { canManageCoordinatorCheckIn, canManageCoordinatorQna, canManageCoordinatorTimeline, canScheduleCoordinatorAlerts, canSendImmediateCoordinatorAlerts } from '../../lib/coordinatorRoleAccess';
import type { GuestLiteForCoordinator } from '../../lib/coordinatorTypes';
import { normalizeCoordinatorAlertLog, normalizeCoordinatorQnaItems, normalizeCoordinatorTimelineState } from '../../lib/coordinatorModePersistence';
import { setCoordinatorEventTimelineState } from '../../lib/coordinatorTimelineState';
import { getCoordinatorLiveEventId, getCoordinatorUpNextEventId } from '../../lib/coordinatorTimelineFocus';
import { getCoordinatorPrimaryTimelineAction } from '../../lib/coordinatorTimelineActions';
import { resolveCoordinatorTimelineAlertIntent } from '../../lib/coordinatorTimelineAlertIntent';
import { appendCoordinatorAlertLogItem, resolveCoordinatorScheduledFor, validateCoordinatorAlertForm } from '../../lib/coordinatorAlertFlow';
import { resetCoordinatorAlertFormAfterSend } from '../../lib/coordinatorAlertReset';
import { buildCoordinatorAlertSuggestions } from '../../lib/coordinatorAlertSuggestions';
import { buildCoordinatorAlertSummary } from '../../lib/coordinatorAlertSummary';
import { getCoordinatorAlertLaneLabel } from '../../lib/coordinatorAlertLane';
import { normalizeCoordinatorAlertIntentState, resolveCoordinatorPreferredAlertSuggestion } from '../../lib/coordinatorAlertIntent';
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
import { getCoordinatorDemoSiteId } from './coordinatorDemoContext';
import { buildDayOfBrainBriefing, type DayOfBrainAction } from './dayOfBrain';
import { DayOfBrainCard } from './DayOfBrainCard';
import { buildDayOfRelayModel, type DayOfRelayStep } from './dayOfRelay';
import { DayOfRelayCard } from './DayOfRelayCard';


type AudienceOption = { value: string; label: string; count: number };

type EventLite = {
  id: string;
  event_name: string;
  start_time: string | null;
};

type TimelineState = 'up-next' | 'live' | 'done';

type AlertLog = {
  id: string;
  subject: string;
  audience: string;
  channel: 'email' | 'sms';
  queuedAt: string;
  sendAt?: string | null;
};

type QnaItem = {
  id: string;
  question: string;
  status: 'new' | 'answered';
  answer?: string | null;
};


export const DashboardCoordinatorMode: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<GuestLiteForCoordinator[]>([]);
  const [events, setEvents] = useState<EventLite[]>([]);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [eventGuestIds, setEventGuestIds] = useState<Record<string, Set<string>>>({});
  const [timelineState, setTimelineState] = useState<Record<string, TimelineState>>({});
  const [alertLog, setAlertLog] = useState<AlertLog[]>([]);
  const [alertBusy, setAlertBusy] = useState(false);
  const [qnaItems, setQnaItems] = useState<QnaItem[]>([]);
  const [coordinatorRole, setCoordinatorRole] = useState<PlannerAccessRole>('owner');
  const plannerHandoff = getPlannerHandoffCopy(coordinatorRole, 'coordinator');
  const [activeSiteRole, setActiveSiteRole] = useState<PlannerAccessRole>('owner');
  const [alertChannelFilter, setAlertChannelFilter] = useState<'all' | 'email' | 'sms'>('all');
  const [alertTimingFilter, setAlertTimingFilter] = useState<'all' | 'now' | 'scheduled'>('all');
  const [qnaInput, setQnaInput] = useState('');
  const [qnaFilter, setQnaFilter] = useState<CoordinatorQnaFilter>('open');
  const [qnaDraftAnswers, setQnaDraftAnswers] = useState<Record<string, string>>({});
  const [activeQnaId, setActiveQnaId] = useState<string | null>(null);
  const [activeTimelineEventId, setActiveTimelineEventId] = useState<string | null>(null);
  const [activeGuestId, setActiveGuestId] = useState<string | null>(null);
  const [lastAlertSuggestionKey, setLastAlertSuggestionKey] = useState<string | null>(null);
  const [commandSource, setCommandSource] = useState<'primary-action' | 'escalation' | 'correction' | null>(null);
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
  const [checkInQuery, setCheckInQuery] = useState('');
  const [checkInFilter, setCheckInFilter] = useState<CoordinatorCheckInFilter>('arrivals');
  const [checkInReviewOnly, setCheckInReviewOnly] = useState(false);
  const [checkInBusyGuestId, setCheckInBusyGuestId] = useState<string | null>(null);
  const [panelFocus, setPanelFocus] = useState<CoordinatorPanelFocus | null>(null);
  const [alertForm, setAlertForm] = useState({
    subject: 'Day-of update',
    body: 'Quick update from the couple: ',
    audience: 'all',
    channel: 'email' as 'email' | 'sms',
    scheduleType: 'now' as 'now' | 'later',
    scheduleDate: '',
    scheduleTime: '',
  });

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!user) return;
      setLoading(true);
      try {
        if (isDemoMode) {
          if (!mounted) return;
          const now = new Date().toISOString();
          setSiteId(getCoordinatorDemoSiteId());
          setActiveSiteRole('owner');
          setCoordinatorRole('owner');
          setGuests([
            { id: '1', first_name: 'Alex', last_name: 'Rivera', name: 'Alex Rivera', rsvp_status: 'confirmed', checked_in_at: now },
            { id: '2', first_name: 'Sam', last_name: 'Lee', name: 'Sam Lee', rsvp_status: 'pending', checked_in_at: null },
          ]);
          setEvents([{ id: 'e1', event_name: 'Ceremony', start_time: now }]);
          setEventGuestIds({ e1: new Set(['1', '2']) });
          return;
        }

        const activeSite = await resolveActiveSiteForUser(user.id);
        const resolvedSiteId = activeSite?.id ?? null;
        if (!resolvedSiteId) return;
        if (!mounted) return;
        setSiteId(resolvedSiteId);
        setActiveSiteRole(activeSite?.role ?? 'owner');
        setCoordinatorRole(activeSite?.role ?? 'owner');

        const [{ data: guestsData }, { data: eventsData }] = await Promise.all([
          supabase.from('guests').select('id, first_name, last_name, name, rsvp_status, checked_in_at').eq('wedding_site_id', resolvedSiteId),
          supabase.from('itinerary_events').select('id, event_name, start_time').eq('wedding_site_id', resolvedSiteId).order('start_time', { ascending: true }),
        ]);

        const eventIds = ((eventsData as EventLite[]) || []).map((e) => e.id);
        let inviteMap: Record<string, Set<string>> = {};
        if (eventIds.length > 0) {
          const { data: inviteRows } = await supabase
            .from('event_invitations')
            .select('event_id, guest_id')
            .in('event_id', eventIds);
          inviteMap = {};
          eventIds.forEach((id) => { inviteMap[id] = new Set<string>(); });
          (inviteRows ?? []).forEach((row: any) => {
            if (!inviteMap[row.event_id]) inviteMap[row.event_id] = new Set<string>();
            inviteMap[row.event_id].add(row.guest_id as string);
          });
        }

        const { data: qnaData } = await supabase
          .from('guest_qna_items')
          .select('id, question, answer, status, created_at')
          .eq('wedding_site_id', resolvedSiteId)
          .order('created_at', { ascending: false })
          .limit(30);

        if (!mounted) return;
        setGuests((guestsData as GuestLiteForCoordinator[]) || []);
        setEvents((eventsData as EventLite[]) || []);
        setEventGuestIds(inviteMap);
        const rawCachedQna = typeof window !== 'undefined' && resolvedSiteId
          ? localStorage.getItem(`dayof.qna.${resolvedSiteId}`)
          : null;
        const cachedQna = rawCachedQna
          ? normalizeCoordinatorQnaItems(JSON.parse(rawCachedQna)) as QnaItem[]
          : [];
        if (qnaData && qnaData.length > 0) {
          setQnaItems((qnaData as Array<{ id: string; question: string; status: 'new' | 'answered'; answer?: string | null }>));
        } else if (cachedQna.length > 0) {
          setQnaItems(cachedQna);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void run();
    return () => { mounted = false; };
  }, [user, isDemoMode]);

  useEffect(() => {
    if (!siteId) return;
    try {
      const rawTimeline = localStorage.getItem(`dayof.timeline.${siteId}`);
      if (rawTimeline) setTimelineState(normalizeCoordinatorTimelineState(JSON.parse(rawTimeline)) as Record<string, TimelineState>);
      const rawAlerts = localStorage.getItem(`dayof.alertlog.${siteId}`);
      if (rawAlerts) setAlertLog(normalizeCoordinatorAlertLog(JSON.parse(rawAlerts)) as AlertLog[]);
      const rawQna = localStorage.getItem(`dayof.qna.${siteId}`);
      if (rawQna) {
        setQnaItems(normalizeCoordinatorQnaItems(JSON.parse(rawQna)) as QnaItem[]);
      } else if (isDemoMode) {
        setQnaItems([
          { id: 'q1', question: 'What time should we arrive?', status: 'new' },
          { id: 'q2', question: 'Is parking available at the venue?', status: 'answered' },
        ]);
      }
      const storedRole = readPlannerAccessRole('coordinator', siteId);
      if (activeSiteRole === 'owner' && storedRole) setCoordinatorRole(storedRole);
      if (activeSiteRole !== 'owner') setCoordinatorRole(activeSiteRole);

      const rawSessionState = localStorage.getItem(`dayof.coordinator.session.${siteId}`);
      const sessionState = normalizeCoordinatorModeSessionState(rawSessionState ? JSON.parse(rawSessionState) : null);
      setCheckInFilter(sessionState.checkInFilter);
      setCheckInQuery(sessionState.checkInQuery);
      setCheckInReviewOnly(sessionState.checkInReviewOnly);
      setPanelFocus(sessionState.panelFocus);
      setAlertChannelFilter(sessionState.alertChannelFilter);
      setAlertTimingFilter(sessionState.alertTimingFilter);

      const rawDraftState = localStorage.getItem(`dayof.coordinator.draft.${siteId}`);
      const draftState = normalizeCoordinatorDraftState(rawDraftState ? JSON.parse(rawDraftState) : null);
      setAlertForm((prev) => ({ ...prev, ...draftState.alertForm }));
      setQnaDraftAnswers(draftState.qnaDraftAnswers);
      setQnaInput(draftState.qnaInput);

      const rawActiveWorkState = localStorage.getItem(`dayof.coordinator.active.${siteId}`);
      const activeWorkState = normalizeCoordinatorActiveWorkState(rawActiveWorkState ? JSON.parse(rawActiveWorkState) : null);
      setActiveQnaId(activeWorkState.activeQnaId);

      const rawGuestWorkState = localStorage.getItem(`dayof.coordinator.guest.${siteId}`);
      const guestWorkState = normalizeCoordinatorGuestWorkState(rawGuestWorkState ? JSON.parse(rawGuestWorkState) : null);
      setActiveGuestId(guestWorkState.activeGuestId);

      const rawTimelineWorkState = localStorage.getItem(`dayof.coordinator.timelinework.${siteId}`);
      const timelineWorkState = normalizeCoordinatorTimelineWorkState(rawTimelineWorkState ? JSON.parse(rawTimelineWorkState) : null);
      setActiveTimelineEventId(timelineWorkState.activeTimelineEventId);

      const rawCommandState = localStorage.getItem(`dayof.coordinator.command.${siteId}`);
      const savedCommandState = normalizeCoordinatorCommandState(rawCommandState ? JSON.parse(rawCommandState) : null);
      setCommandSource(savedCommandState.source);

      const rawAlertIntentState = localStorage.getItem(`dayof.coordinator.alertintent.${siteId}`);
      const alertIntentState = normalizeCoordinatorAlertIntentState(rawAlertIntentState ? JSON.parse(rawAlertIntentState) : null);
      setLastAlertSuggestionKey(alertIntentState.lastSuggestionKey);
    } catch {}
  }, [siteId, activeSiteRole]);

  useEffect(() => {
    if (!siteId) return;
    try { localStorage.setItem(`dayof.timeline.${siteId}`, JSON.stringify(timelineState)); } catch {}
  }, [siteId, timelineState]);

  useEffect(() => {
    if (!siteId) return;
    try { localStorage.setItem(`dayof.alertlog.${siteId}`, JSON.stringify(alertLog)); } catch {}
  }, [siteId, alertLog]);

  useEffect(() => {
    if (!siteId) return;
    try { localStorage.setItem(`dayof.qna.${siteId}`, JSON.stringify(qnaItems)); } catch {}
  }, [siteId, qnaItems]);

  useEffect(() => {
    if (!siteId) return;
    if (activeSiteRole !== 'owner') return;
    try {
      writePlannerAccessRole('coordinator', siteId, coordinatorRole);
    } catch {
      // noop
    }
  }, [siteId, coordinatorRole, activeSiteRole]);

  useEffect(() => {
    if (!siteId) return;
    try {
      localStorage.setItem(`dayof.coordinator.session.${siteId}`, JSON.stringify({
        checkInFilter,
        checkInQuery,
        checkInReviewOnly,
        panelFocus,
        alertChannelFilter,
        alertTimingFilter,
      }));
    } catch {}
  }, [siteId, checkInFilter, checkInQuery, checkInReviewOnly, panelFocus, alertChannelFilter, alertTimingFilter]);

  useEffect(() => {
    if (!siteId) return;
    try {
      localStorage.setItem(`dayof.coordinator.draft.${siteId}`, JSON.stringify({
        alertForm,
        qnaDraftAnswers,
        qnaInput,
      }));
    } catch {}
  }, [siteId, alertForm, qnaDraftAnswers, qnaInput]);

  useEffect(() => {
    if (!siteId) return;
    try {
      localStorage.setItem(`dayof.coordinator.active.${siteId}`, JSON.stringify({
        activeQnaId,
      }));
    } catch {}
  }, [siteId, activeQnaId]);

  useEffect(() => {
    if (!siteId) return;
    try {
      localStorage.setItem(`dayof.coordinator.guest.${siteId}`, JSON.stringify({
        activeGuestId,
      }));
    } catch {}
  }, [siteId, activeGuestId]);

  useEffect(() => {
    if (!siteId) return;
    try {
      localStorage.setItem(`dayof.coordinator.timelinework.${siteId}`, JSON.stringify({
        activeTimelineEventId,
      }));
    } catch {}
  }, [siteId, activeTimelineEventId]);

  useEffect(() => {
    if (!activeTimelineEventId) return;
    if (events.some((event) => event.id === activeTimelineEventId)) return;
    setActiveTimelineEventId(null);
  }, [events, activeTimelineEventId]);

  useEffect(() => {
    if (!siteId) return;
    try {
      localStorage.setItem(`dayof.coordinator.command.${siteId}`, JSON.stringify({
        source: commandSource,
        panelFocus,
        checkInFilter,
        checkInReviewOnly,
      }));
    } catch {}
  }, [siteId, commandSource, panelFocus, checkInFilter, checkInReviewOnly]);

  useEffect(() => {
    if (!siteId) return;
    try {
      localStorage.setItem(`dayof.coordinator.alertintent.${siteId}`, JSON.stringify({
        lastSuggestionKey: lastAlertSuggestionKey,
      }));
    } catch {}
  }, [siteId, lastAlertSuggestionKey]);

  const stats = useMemo(() => {
    const total = guests.length;
    const confirmed = guests.filter((g) => isAttendingRsvpStatus(g.rsvp_status)).length;
    const pending = guests.filter((g) => isPendingRsvpStatus(g.rsvp_status)).length;
    const checkedIn = guests.filter((g) => !!g.checked_in_at).length;
    return { total, confirmed, pending, checkedIn };
  }, [guests]);

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

      const { error } = await supabase
        .from('guests')
        .update({ checked_in_at: next })
        .eq('id', guest.id)
        .eq('wedding_site_id', siteId);
      if (error) {
        toast(error.message || 'Could not update check-in right now.', 'error');
        return;
      }

      setGuests((prev) => prev.map((g) => (g.id === guest.id ? { ...g, checked_in_at: next } : g)));
      setActiveGuestId(nextFocusGuestId);
      toast(next ? 'Guest checked in. Door focus moved to the next guest.' : 'Guest moved back to arrivals.', 'success');
    } finally {
      setCheckInBusyGuestId((current) => (current === guest.id ? null : current));
    }
  };

  const sortedGuests = [...guests].sort((a, b) => {
    const aChecked = !!a.checked_in_at;
    const bChecked = !!b.checked_in_at;
    if (aChecked !== bChecked) return aChecked ? 1 : -1;
    const al = (a.last_name || '').toLowerCase();
    const bl = (b.last_name || '').toLowerCase();
    if (al !== bl) return al.localeCompare(bl);
    return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
  });

  const eventAudienceOptions: AudienceOption[] = events.map((e) => ({
    value: `event:${e.id}`,
    label: `${e.event_name}${e.start_time ? ` — ${formatCoordinatorEventDateTime(e.start_time)}` : ''}`,
    count: eventGuestIds[e.id]?.size ?? 0,
  }));

  const alertAudienceCount = (() => {
    if (alertForm.audience.startsWith('event:')) {
      const eventId = alertForm.audience.replace('event:', '');
      return eventGuestIds[eventId]?.size ?? 0;
    }
    if (alertForm.audience === 'checked-in') return guests.filter((g) => !!g.checked_in_at).length;
    if (alertForm.audience === 'pending') return guests.filter((g) => isPendingRsvpStatus(g.rsvp_status)).length;
    return guests.length;
  })();

  const canCheckIn = canManageCoordinatorCheckIn(coordinatorRole);
  const canEditTimeline = canManageCoordinatorTimeline(coordinatorRole);
  const canEditQna = canManageCoordinatorQna(coordinatorRole);
  const canSendAlerts = canSendImmediateCoordinatorAlerts(coordinatorRole);
  const canScheduleAlerts = canScheduleCoordinatorAlerts(coordinatorRole);

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

  const handoffCopy = {
    title: coordinatorRole === 'viewer' ? 'Viewer handoff' : coordinatorRole === 'coordinator' ? 'Coordinator handoff' : 'Planner handoff',
    detail: coordinatorRole === 'viewer'
      ? 'Use this board for visibility only and escalate changes to the active operator.'
      : coordinatorRole === 'coordinator'
        ? 'Keep live updates moving and flag anything sensitive back to the couple.'
        : 'Run the room, keep communications aligned, and escalate only the decisions that need the couple.'
  };
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
  const dayOfBrainBriefing = useMemo(() => buildDayOfBrainBriefing({
    daysUntilWedding: 0,
    totalGuests: stats.total,
    confirmedGuests: stats.confirmed,
    pendingGuests: stats.pending,
    itineraryEventCount: events.length,
    checkedInCount: stats.checkedIn,
    liveIssueCount: liveIssues.length + correctionCues.length,
    watchCount: checkInWatchCount,
    openQnaCount: qnaCounts.open,
    scheduledAlertCount: alertStats.scheduled,
    invalidSeatCount: 0,
    unassignedSeatCount: 0,
    splitHouseholdCount: 0,
    isArchiveLike: false,
  }), [
    stats.total,
    stats.confirmed,
    stats.pending,
    stats.checkedIn,
    liveIssues.length,
    correctionCues.length,
    checkInWatchCount,
    qnaCounts.open,
    alertStats.scheduled,
  ]);
  const dayOfRelay = useMemo(() => buildDayOfRelayModel({
    daysUntilWedding: 0,
    pendingGuestCount: stats.pending,
    invalidSeatCount: 0,
    unassignedSeatCount: 0,
    splitHouseholdCount: 0,
    liveIssueCount: liveIssues.length + correctionCues.length,
    checkedInCount: stats.checkedIn,
  }), [correctionCues.length, liveIssues.length, stats.checkedIn, stats.pending]);
  const activeTimelineEvent = useMemo(
    () => events.find((event) => event.id === activeTimelineEventId) ?? null,
    [events, activeTimelineEventId],
  );
  const timelineBoard = useMemo(() => buildCoordinatorTimelineBoard({
    events,
    timelineState,
    liveEventId,
    upNextEventId,
  }), [events, timelineState, liveEventId, upNextEventId]);
  const activeTimelineEventState = useMemo<TimelineState | null>(
    () => (activeTimelineEvent ? (timelineState[activeTimelineEvent.id] || 'up-next') : null),
    [activeTimelineEvent, timelineState],
  );
  const activeTimelinePrimaryAction = useMemo(
    () => activeTimelineEvent
      ? getCoordinatorPrimaryTimelineAction({
          event: activeTimelineEvent,
          liveEventId,
          upNextEventId,
          timelineState,
        })
      : null,
    [activeTimelineEvent, liveEventId, upNextEventId, timelineState],
  );
  const activeTimelineCorrectionAction = useMemo(
    () => (activeTimelineEventState ? getCoordinatorTimelineCorrectionAction(activeTimelineEventState) : null),
    [activeTimelineEventState],
  );

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
    () => alertLog.filter((a) => {
      if (alertChannelFilter !== 'all' && a.channel !== alertChannelFilter) return false;
      if (alertTimingFilter === 'scheduled' && !a.sendAt) return false;
      if (alertTimingFilter === 'now' && !!a.sendAt) return false;
      return true;
    }),
    [alertLog, alertChannelFilter, alertTimingFilter],
  );
  const filteredAlertLogView = useMemo(() => buildCoordinatorAlertLogView(filteredAlertLog), [filteredAlertLog]);

  const clearCoordinatorTransientState = () => {
    setNeutralFocusReason(null);
    setSummaryFeedback(null);
    setSummaryFeedbackShownAt(null);
    setAlertOverrideUpdatedAt(null);
    setManualOverrideUpdatedAt(null);
    setOverrideCueShownAt(null);
    setCommandJumpLabel(null);
    setCommandJumpPanelFocus(null);
    setCommandJumpTargetId(null);
  };

  const focusCoordinatorAlertLane = () => {
    clearCoordinatorTransientState();
    setPanelFocus('timeline');
    setCommandSource(null);
  };

  const focusCoordinatorCheckInLane = () => {
    clearCoordinatorTransientState();
    setPanelFocus('check-in');
    setCommandSource(null);
  };

  const focusCoordinatorTimelineLane = () => {
    clearCoordinatorTransientState();
    setPanelFocus('timeline');
    setCommandSource(null);
  };

  const jumpToTimelineEvent = (eventId: string | null | undefined) => {
    if (!eventId) return;
    focusCoordinatorTimelineLane();
    setActiveTimelineEventId(eventId);
  };

  const focusFirstCoordinatorQueueGuest = () => {
    const firstGuest = checkInQueue[0];
    if (!firstGuest) return;
    focusCoordinatorCheckInLane();
    setActiveGuestId(firstGuest.id);
  };

  const focusFirstCoordinatorOpenQna = () => {
    const nextQnaId = getFirstOpenCoordinatorQnaId(qnaItems) ?? qnaItems[0]?.id ?? null;
    if (!nextQnaId) return;
    focusCoordinatorQnaLane();
    setActiveQnaId(nextQnaId);
  };

  const focusCoordinatorQnaLane = () => {
    clearCoordinatorTransientState();
    setPanelFocus('qna');
    setCommandSource(null);
  };

  const focusNextCoordinatorQna = () => {
    const nextQnaId = getFirstOpenCoordinatorQnaId(qnaItems) ?? qnaItems[0]?.id ?? null;
    if (!nextQnaId) return;
    focusCoordinatorQnaLane();
    setQnaFilter('open');
    setActiveQnaId(nextQnaId);
  };

  const runDayOfBrainAction = (action: DayOfBrainAction) => {
    if (action.target === 'coordinator') {
      if (liveIssues.length > 0 || checkInWatchCount > 0 || nextArrivals.length > 0) {
        focusCoordinatorCheckInLane();
        setCheckInFilter('arrivals');
        setCheckInReviewOnly(checkInWatchCount > 0);
        setActiveGuestId((checkInWatchCount > 0 ? checkInBoardTargetId : nextArrivals[0]?.id) ?? activeGuestId);
        return;
      }
      if (qnaCounts.open > 0) {
        focusCoordinatorQnaLane();
        setQnaFilter('open');
        setActiveQnaId(getFirstOpenCoordinatorQnaId(qnaItems));
        return;
      }
      focusCoordinatorTimelineLane();
      setActiveTimelineEventId(liveEventId ?? upNextEventId ?? activeTimelineEventId);
      return;
    }

    if (action.target === 'messages') {
      focusCoordinatorAlertLane();
      return;
    }

    if (action.target === 'seating') {
      window.location.assign('/dashboard/seating');
      return;
    }

    if (action.target === 'guests') {
      window.location.assign('/dashboard/guests');
      return;
    }

    if (action.target === 'planning') {
      window.location.assign('/dashboard/planning');
      return;
    }

    if (action.target === 'itinerary') {
      window.location.assign('/dashboard/itinerary#itinerary-readiness');
    }
  };

  const runDayOfRelayAction = (step: DayOfRelayStep) => {
    if (step.target === 'coordinator') {
      if (liveIssues.length > 0 || checkInWatchCount > 0 || nextArrivals.length > 0) {
        focusCoordinatorCheckInLane();
        setCheckInFilter('arrivals');
        return;
      }
      if (qnaCounts.open > 0) {
        focusCoordinatorQnaLane();
        setQnaFilter('open');
        setActiveQnaId(getFirstOpenCoordinatorQnaId(qnaItems));
        return;
      }
      focusCoordinatorTimelineLane();
      return;
    }

    if (step.target === 'check-in') {
      focusCoordinatorCheckInLane();
      setCheckInFilter('arrivals');
      return;
    }

    if (step.target === 'messages') {
      focusCoordinatorAlertLane();
      return;
    }

    if (step.target === 'guests') {
      window.location.assign('/dashboard/guests');
      return;
    }

    window.location.assign('/dashboard/seating');
  };

  const jumpToOpsSnapshotLane = (key: 'check-in' | 'timeline' | 'qna' | 'alerting') => {
    if (key === 'check-in') {
      focusCoordinatorCheckInLane();
      if (checkInBoardTargetId) {
        setCheckInReviewOnly(checkInWatchCount > 0);
        setActiveGuestId(checkInBoardTargetId);
      } else if (nextArrivals[0]) {
        setCheckInFilter('arrivals');
        setCheckInReviewOnly(false);
        setActiveGuestId(nextArrivals[0].id);
      }
      return;
    }

    if (key === 'timeline') {
      focusCoordinatorTimelineLane();
      if (liveEventId) {
        setActiveTimelineEventId(liveEventId);
      } else if (upNextEventId) {
        setActiveTimelineEventId(upNextEventId);
      } else if (timelineBoardTargetId) {
        setActiveTimelineEventId(timelineBoardTargetId);
      }
      return;
    }

    if (key === 'qna') {
      focusCoordinatorQnaLane();
      if (qnaBoardTargetId) setActiveQnaId(qnaBoardTargetId);
      return;
    }

    focusCoordinatorAlertLane();
    if (preferredAlertSuggestion && !alertTargetCue.aligned && canSendAlerts) {
      setAlertForm((prev) => applyCoordinatorAlertSuggestion({ form: prev, suggestion: preferredAlertSuggestion }));
    }
  };

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
        const { error } = await supabase.from('messages').insert({
          wedding_site_id: siteId,
          subject: alertForm.subject.trim(),
          body: alertForm.body.trim(),
          channel: alertForm.channel,
          audience_filter: alertForm.audience,
          recipient_filter: { audience: alertForm.audience, recipient_count: alertAudienceCount },
          status,
          sent_at: scheduledFor ? null : new Date().toISOString(),
          scheduled_for: scheduledFor,
        });
        if (error) throw error;
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
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not queue that alert right now.', 'error');
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
      const { data, error } = await supabase
        .from('guest_qna_items')
        .insert({ wedding_site_id: siteId, question: q, status: 'new', source: 'manual' })
        .select('id, question, answer, status')
        .single();
      if (error) {
        toast(error.message || 'Could not save that question.', 'error');
        return;
      }
      if (data) {
        setQnaItems((prev) => [data as QnaItem, ...prev].slice(0, 30));
      }
    } else {
      setQnaItems((prev) => [{ id: `${Date.now()}`, question: q, status: 'new' as const }, ...prev].slice(0, 30));
    }
    setQnaInput('');
  };


  const escalateDoorReview = (guest: GuestLiteForCoordinator) => {
    if (!canEditQna) {
      toast('Your collaborator role cannot escalate door issues into guest Q&A.', 'info');
      return;
    }
    clearCoordinatorTransientState();
    setQnaInput(buildCoordinatorDoorEscalationPrompt(guest));
    setCommandSource('escalation');
    setPanelFocus('qna');
    setActiveQnaId(getFirstOpenCoordinatorQnaId(qnaItems));
    toast('Door issue moved into guest Q&A triage.', 'success');
  };





  const revisitNeutralFocus = () => {
    const target = resolveCoordinatorNeutralFocusTarget(panelFocus);
    clearCoordinatorTransientState();
    setNeutralFocusReason(getCoordinatorNeutralFocusReason(target.panelFocus));
    setPanelFocus(target.panelFocus);
    setCheckInReviewOnly(target.reviewOnly);
    if (target.panelFocus === 'check-in') {
      setCheckInFilter('arrivals');
    }
    if (target.panelFocus === 'qna') {
      setActiveQnaId(getFirstOpenCoordinatorQnaId(qnaItems));
    }
  };



  const jumpToStablePrompt = () => {
    const target = getCoordinatorStablePromptTarget(priorityCommandLabel);
    setPanelFocus(target.panelFocus);
    setCheckInReviewOnly(target.reviewOnly);

    if (priorityCommandLabel === 'Check-in') {
      setCheckInFilter('arrivals');
      if (checkInBoardTargetId) setActiveGuestId(checkInBoardTargetId);
      return;
    }

    if (priorityCommandLabel === 'Timeline') {
      if (timelineBoardTargetId) setActiveTimelineEventId(timelineBoardTargetId);
      return;
    }

    if (priorityCommandLabel === 'Q&A') {
      const nextQnaId = qnaBoardTargetId ?? getFirstOpenCoordinatorQnaId(qnaItems);
      setActiveQnaId(nextQnaId);
    }
  };

  const jumpToCommandSummaryItem = (label: 'Check-in' | 'Timeline' | 'Q&A' | 'Alerting') => {
    const target = getCoordinatorCommandSummaryTarget(label);
    clearCoordinatorTransientState();
    setPanelFocus(target.panelFocus);
    setCheckInReviewOnly(target.reviewOnly);
    const jumpLabel = getCoordinatorCommandJumpLabel(label);
    setCommandJumpLabel(jumpLabel);
    setCommandJumpPanelFocus(target.panelFocus);
    if (label === 'Check-in') {
      setCheckInFilter('arrivals');
      setCommandJumpTargetId(checkInBoardTargetId);
      setSummaryFeedback(createCoordinatorSummaryFeedback({ label: jumpLabel, panelFocus: 'check-in', targetId: checkInBoardTargetId, kind: 'jump' }));
      setSummaryFeedbackShownAt(Date.now());
      if (checkInBoardTargetId) setActiveGuestId(checkInBoardTargetId);
      return;
    }
    if (label === 'Timeline') {
      setCommandJumpTargetId(timelineBoardTargetId);
      setSummaryFeedback(createCoordinatorSummaryFeedback({ label: jumpLabel, panelFocus: 'timeline', targetId: timelineBoardTargetId, kind: 'jump' }));
      setSummaryFeedbackShownAt(Date.now());
      if (timelineBoardTargetId) setActiveTimelineEventId(timelineBoardTargetId);
      return;
    }
    if (label === 'Q&A') {
      const nextQnaId = qnaBoardTargetId ?? getFirstOpenCoordinatorQnaId(qnaItems);
      setCommandJumpTargetId(nextQnaId);
      setSummaryFeedback(createCoordinatorSummaryFeedback({ label: jumpLabel, panelFocus: 'qna', targetId: nextQnaId, kind: 'jump' }));
      setSummaryFeedbackShownAt(Date.now());
      setActiveQnaId(nextQnaId);
      return;
    }
    setCommandJumpTargetId(null);
    setSummaryFeedback(createCoordinatorSummaryFeedback({ label: jumpLabel, panelFocus: null, targetId: null, kind: 'jump' }));
    setSummaryFeedbackShownAt(Date.now());
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


  const returnToBoardTarget = () => {
    clearCoordinatorTransientState();
    if (panelFocus === 'check-in' && checkInBoardTargetId) {
      setActiveGuestId(checkInBoardTargetId);
      setCheckInFilter('arrivals');
      setCheckInReviewOnly(true);
      setManualOverrideLabel(null);
      setManualOverrideUpdatedAt(null);
      setOverrideCueShownAt(null);
      return;
    }
    if (panelFocus === 'timeline' && timelineBoardTargetId) {
      setActiveTimelineEventId(timelineBoardTargetId);
      setManualOverrideLabel(null);
      setManualOverrideUpdatedAt(null);
      setOverrideCueShownAt(null);
      return;
    }
    if (panelFocus === 'qna') {
      const nextQnaId = qnaBoardTargetId ?? getFirstOpenCoordinatorQnaId(qnaItems);
      setActiveQnaId(nextQnaId);
      setManualOverrideLabel(null);
      setManualOverrideUpdatedAt(null);
      setOverrideCueShownAt(null);
    }
  };


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

  const returnToBoard = () => {
    const next = resolveCoordinatorReturnToBoardState({
      hasDoorReview: guests.some((guest) => getCoordinatorDoorStatus(guest) === 'watch'),
      hasOpenQna: qnaItems.some((item) => item.status === 'new'),
      hasLiveEvent: events.some((event) => (timelineState[event.id] || 'up-next') === 'live'),
    });
    setCommandSource(next.commandSource);
    setPanelFocus(next.panelFocus);
    setCheckInFilter(next.checkInFilter);
    setCheckInReviewOnly(next.checkInReviewOnly);
    setNeutralFocusReason(getCoordinatorNeutralFocusReason(next.panelFocus));
    if (next.panelFocus === 'qna') {
      setActiveQnaId(getFirstOpenCoordinatorQnaId(qnaItems));
    }
  };

  const runPrimaryAction = () => {
    const target = resolveCoordinatorPrimaryActionTarget(primaryAction);
    clearCoordinatorTransientState();
    if (target.panelFocus === 'check-in') {
      setCommandSource('primary-action');
      setCheckInFilter('arrivals');
      setCheckInReviewOnly(target.reviewOnly);
      setPanelFocus('check-in');
      return;
    }
    if (target.panelFocus === 'qna') {
      setCommandSource('primary-action');
      setActiveQnaId(getFirstOpenCoordinatorQnaId(qnaItems));
      setPanelFocus('qna');
      return;
    }
    if (target.panelFocus === 'timeline') {
      if (upNextEventId && canEditTimeline) {
        setCommandSource('primary-action');
        runTimelineAction(upNextEventId, 'live');
      } else {
        setCommandSource('primary-action');
    setPanelFocus('timeline');
      }
    }
  };

  const runTimelineAction = (eventId: string, nextState: TimelineState | null) => {
    if (!nextState || !canEditTimeline) return;
    clearCoordinatorTransientState();
    const transitionEvent = events.find((event) => event.id === eventId) ?? null;
    setTimelineState((prev) => setCoordinatorEventTimelineState(prev, eventId, nextState));
    setActiveTimelineEventId(eventId);
    const suggestedIntent = resolveCoordinatorTimelineAlertIntent(alertSuggestions, eventId);
    const nextSuggestion = suggestedIntent
      ? alertSuggestions.find((suggestion) => suggestion.key === suggestedIntent) ?? null
      : null;
    const shouldSyncAlertDraft = alertTargetCue.aligned || (!alertForm.subject.trim() && !alertForm.body.trim());
    if (suggestedIntent) {
      setLastAlertSuggestionKey(suggestedIntent);
    }
    if (nextSuggestion) {
      setAlertForm((prev) => syncCoordinatorAlertDraftForTimelineTransition({
        form: prev,
        nextSuggestion,
        shouldSync: shouldSyncAlertDraft,
      }));
    }
    if (transitionEvent) {
      setSummaryFeedback(createCoordinatorSummaryFeedback({
        label: getCoordinatorTimelineTransitionLabel({
          eventName: transitionEvent.event_name,
          nextState,
          syncedAlert: Boolean(nextSuggestion) && shouldSyncAlertDraft,
        }),
        panelFocus: 'timeline',
        targetId: eventId,
        kind: 'transition',
      }));
      setSummaryFeedbackShownAt(Date.now());
    }
    setPanelFocus('timeline');
  };

  const selectTimelineState = (eventId: string, nextState: TimelineState) => {
    runTimelineAction(eventId, nextState);
  };

  const runCorrectionCue = (cue: (typeof correctionCues)[number]) => {
    const target = resolveCoordinatorCorrectionCueTarget(cue);
    clearCoordinatorTransientState();
    setCommandSource('correction');
    setPanelFocus(target.panelFocus);
    setCheckInReviewOnly(target.reviewOnly);

    if (cue.key === 'undo-check-in') {
      setCheckInFilter('checked-in');
      if (correctionGuestId) setActiveGuestId(correctionGuestId);
      return;
    }

    if (cue.key === 'reopen-event' && correctionEventId) {
      setActiveTimelineEventId(correctionEventId);
    }
  };

  const saveQnaAnswer = async (id: string) => {
    if (!canEditQna) {
      toast('Your collaborator role cannot edit guest questions here.', 'info');
      return;
    }
    focusCoordinatorQnaLane();
    const draftAnswer = qnaDraftAnswers[id] ?? qnaItems.find((item) => item.id === id)?.answer ?? '';
    const nextItems = updateCoordinatorQnaItem(qnaItems, id, draftAnswer);
    const nextItem = nextItems.find((item) => item.id === id);
    if (!nextItem) return;

    if (!isDemoMode) {
      const { error } = await supabase.from('guest_qna_items').update({
        answer: nextItem.answer ?? null,
        status: nextItem.status,
      }).eq('id', id);
      if (error) {
        toast(error.message || 'Could not save that answer.', 'error');
        return;
      }
    }

    setQnaItems(nextItems);
    setQnaDraftAnswers((prev) => ({ ...prev, [id]: nextItem.answer || '' }));
    setActiveQnaId(nextItem.status === 'answered' ? getNextCoordinatorQnaFocusId(nextItems, id) : id);
    toast(nextItem.status === 'answered' ? 'Guest question answered.' : 'Guest question reopened.', 'success');
  };

  return (
    <DashboardLayout currentPage="planning">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="rounded-2xl border border-border/35 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)] p-5 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Coordinator mode</h1>
            <p className="text-sm text-text-secondary mt-1">A live command view for the couple and the planner they invite to help run check-in, timeline updates, guest questions, and day-of messages.</p>
          </div>
          <div>
            <label className="block text-xs text-text-tertiary mb-1">Planner access view</label>
            <select
              value={coordinatorRole}
              onChange={(e) => setCoordinatorRole(e.target.value as PlannerAccessRole)}
              disabled={activeSiteRole !== 'owner'}
              className="px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary"
            >
              {PLANNER_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {activeSiteRole !== 'owner' && (
              <p className="mt-1 text-[11px] text-text-tertiary">Access view follows your actual collaborator role on this site.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Guests', stats.total],
              ['Confirmed', stats.confirmed],
              ['Pending', stats.pending],
              ['Checked In', stats.checkedIn],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-border/35 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)] p-4">
                <p className="text-xs uppercase tracking-wide text-text-tertiary">{label}</p>
                <p className="text-2xl font-semibold text-text-primary mt-1">{loading ? '—' : value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <DayOfRelayCard relay={dayOfRelay} onAction={runDayOfRelayAction} />
            <DayOfBrainCard briefing={dayOfBrainBriefing} onAction={runDayOfBrainAction} />

            <div className="rounded-2xl border border-border/35 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)] p-4">
              <p className="text-sm font-medium text-text-primary mb-2">Attention now</p>
              <p className="text-[11px] text-text-tertiary mb-2">This pulls together the live exceptions the coordinator should resolve first.</p>
              <div className="space-y-2">
              {liveIssues.length === 0 && correctionCues.length === 0 && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="text-sm font-medium text-emerald-800">Board is clear right now</p>
                  <p className="mt-1 text-xs text-emerald-700">No active escalations or recovery cues are waiting. Use the command center to review the next-best action.</p>
                </div>
              )}
              {liveIssues.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    const focus = resolveCoordinatorQueueFocus(item.key);
                    const nextPanelFocus = resolveCoordinatorPanelFocus(item.key);
                    const timelineTarget = resolveCoordinatorEscalationTimelineTarget({ escalationKey: item.key, upNextEvent });
                    clearCoordinatorTransientState();
                    if (item.key === 'open-qna') setActiveQnaId(getFirstOpenCoordinatorQnaId(qnaItems));
                    setCommandSource('escalation');
                    setCheckInFilter(focus.filter);
                    setCheckInReviewOnly(focus.reviewOnly);
                    setPanelFocus(nextPanelFocus);
                    if (timelineTarget && canEditTimeline) {
                      setTimelineState((prev) => setCoordinatorEventTimelineState(prev, timelineTarget, 'live'));
                    }
                  }}
                  className={`w-full text-left rounded-lg border px-3 py-2 ${item.tone === 'warning' ? 'border-amber-200 bg-amber-50' : item.tone === 'success' ? 'border-emerald-200 bg-emerald-50' : 'border-border/50 bg-surface-subtle/40'}`}
                >
                  <p className="text-sm font-medium text-text-primary">{item.title}</p>
                  <p className="mt-1 text-xs text-text-secondary">{item.detail}</p>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Main focus</p>
                  <p className="mt-1 text-[11px] text-text-secondary">{item.focusTitle}</p>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Decision rule</p>
                  <p className="mt-1 text-[11px] text-text-secondary">{item.decisionRule}</p>
                  <p className="mt-1 text-[10px] text-text-tertiary/80">{getCoordinatorActionHint('escalation')}</p>
                </button>
              ))}
              {correctionCues.map((cue) => (
                <button
                  key={cue.key}
                  type="button"
                  onClick={() => runCorrectionCue(cue)}
                  className="w-full text-left rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
                >
                  <p className="text-sm font-medium text-text-primary">{cue.title}</p>
                  <p className="mt-1 text-xs text-text-secondary">{cue.detail}</p>
                  <p className="mt-1 text-[10px] text-text-tertiary/80">{getCoordinatorActionHint('correction')}</p>
                </button>
              ))}
              </div>
              <div className="mt-3 rounded-lg border border-border/50 bg-surface-subtle/30 px-3 py-2">
              <p className="text-xs font-medium text-text-primary">Next arrivals</p>
              {nextArrivals.length === 0 ? (
                <p className="mt-1 text-xs text-text-tertiary">
                  {sortedGuests.some((guest) => !guest.checked_in_at)
                    ? 'No ready arrivals right now. Review-needed guests are still waiting in the queue.'
                    : 'Everyone currently in this view is already checked in.'}
                </p>
              ) : (
                <div className="mt-2 space-y-1">
                  {nextArrivals.map((guest) => (
                    <button
                      key={guest.id}
                      type="button"
                      onClick={() => {
                        focusCoordinatorCheckInLane();
                        setCheckInFilter('arrivals');
                        setCheckInReviewOnly(false);
                        setActiveGuestId(guest.id);
                      }}
                      className="block w-full text-left text-xs text-text-secondary hover:text-primary"
                    >
                      • {guest.name} — {guest.rsvp_status}
                    </button>
                  ))}
                </div>
              )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
              <a href="/dashboard/rsvp-board" className="rounded border border-border px-2.5 py-1 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary">Open RSVP board</a>
              <a href="/dashboard/seating-lookup" className="rounded border border-border px-2.5 py-1 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary">Open seating lookup</a>
              <a href="/dashboard/itinerary#itinerary-readiness" className="rounded border border-border px-2.5 py-1 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary">Open itinerary</a>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
          <p className="font-medium">{handoffCopy.title}</p>
          <p className="mt-1 text-primary/80">{handoffCopy.detail}</p>
          <p className="mt-2 text-primary/70">Final couple decisions still sit above this workspace when something needs approval.</p>
        </div>

        <div className="rounded-lg border border-border/35 bg-white px-3 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-text-primary">Role-aware live ops access</p>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {coordinatorRole === 'viewer'
                  ? 'Read-only visibility for day-of coordination.'
                  : coordinatorRole === 'coordinator'
                    ? 'Live operator access for event-day execution.'
                    : 'Broader planner access with live ops control.'}
              </p>
            </div>
            <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${coordinatorRole === 'viewer' ? 'border-border bg-surface-subtle text-text-tertiary' : coordinatorRole === 'coordinator' ? 'border-primary/20 bg-primary/5 text-primary' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
              {coordinatorRole === 'viewer' ? 'Read only' : coordinatorRole === 'coordinator' ? 'Coordinator operator' : 'Planner operator'}
            </span>
          </div>
          <div className="mt-3 rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-text-primary">Operator posture</p>
                <p className="mt-1 text-[11px] text-text-secondary">Mode · {roleBoard.modeLabel}</p>
                <p className="text-[11px] text-text-secondary">Enabled · {roleBoard.enabledLabel}</p>
              </div>
              <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${roleBoard.tone === 'ready' ? 'border-primary/20 bg-primary/5 text-primary' : roleBoard.tone === 'warning' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-border bg-white text-text-tertiary'}`}>
                {roleBoard.statusLabel}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Blocked here</p>
                <p className="mt-1 text-[11px] text-text-primary">{roleBoard.blockedLabel}</p>
              </div>
              <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Operating note</p>
                <p className="mt-1 text-[11px] text-text-primary">{roleBoard.guidanceLabel}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
            {roleCapabilities.map((item) => (
              <div
                key={item.key}
                className={`rounded-xl border px-3 py-3 ${item.enabled ? 'border-primary/20 bg-primary/[0.03]' : 'border-border/50 bg-surface-subtle/25'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-text-primary">{item.label}</p>
                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${item.enabled ? 'border-primary/20 bg-white text-primary' : 'border-border bg-white text-text-tertiary'}`}>
                    {item.enabled ? 'Enabled' : 'Blocked'}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-text-secondary">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border/35 bg-white px-3 py-2 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-xs font-medium text-text-primary">Live command summary</p>
            <p className="text-[11px] text-text-tertiary">What the board thinks matters right now</p>
          </div>

          {summaryDisplayCue ? (
            <div className="mb-3 space-y-2">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">Live signal</p>
                {summaryDisplayCue.kind === 'feedback' && summaryFeedbackTone && (
                  <div className={`mt-1 inline-flex flex-wrap items-center gap-2 rounded-full border px-2.5 text-[11px] ${summaryFeedbackTone.containerClassName} ${summaryFeedbackLayout === 'prominent' ? 'py-1.5 shadow-[0_2px_8px_rgba(15,23,42,0.08)]' : summaryFeedbackLayout === 'standard' ? 'py-1' : 'py-0.5 opacity-90'}`}>
                    <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${summaryFeedbackBadgeToneClassName}`}>{summaryFeedbackBadge ?? summaryFeedbackTone.badge}</span>
                    <span>{summaryFeedbackCopy ?? summaryDisplayCue.feedback.label}</span>
                  </div>
                )}
                {summaryDisplayCue.kind === 'alert-override' && (
                  <div className="mt-1 inline-flex flex-wrap items-center gap-2 rounded-full border border-amber-200 bg-amber-50/80 px-2.5 py-1 text-[11px] text-amber-800">
                    <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${overrideBadgeToneClassName}`}>{alertOverrideBadge}</span>
                    <span>{summaryDisplayCue.label}</span>
                    {alertOverrideTargetLabel && <span className="text-amber-800/80">{alertOverrideTargetLabel}</span>}
                    {alertOverrideCurrentLabel && <span className="text-text-secondary">{alertOverrideCurrentLabel}</span>}
                  </div>
                )}
                {summaryDisplayCue.kind === 'manual-override' && (
                  <div className="mt-1 inline-flex flex-wrap items-center gap-2 rounded-full border border-amber-200 bg-amber-50/80 px-2.5 py-1 text-[11px] text-amber-800">
                    <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${overrideBadgeToneClassName}`}>{manualOverrideBadge}</span>
                    <span>{summaryDisplayCue.label}</span>
                    {manualOverrideTargetLabel && <span className="text-amber-800/80">{manualOverrideTargetLabel}</span>}
                    {manualOverrideCurrentTargetLabel && <span className="text-text-secondary">{manualOverrideCurrentTargetLabel}</span>}
                    {manualOverrideActionLabel && (
                      <button
                        type="button"
                        onClick={returnToBoardTarget}
                        className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-amber-700"
                      >
                        {manualOverrideActionLabel}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">{standingPromptMode === 'secondary' ? 'Next up' : 'Standing prompt'}</p>
                <button
                  type="button"
                  onClick={jumpToStablePrompt}
                  className={`mt-1 inline-flex flex-wrap items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] hover:border-primary/35 hover:bg-primary/[0.04] ${standingPromptMode === 'secondary' ? 'border-border/35 bg-surface-subtle/20 text-text-tertiary' : 'border-border/50 bg-surface-subtle/40 text-text-secondary'}`}
                >
                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${stablePromptBadgeToneClassName}`}>{standingPromptBadge}</span>
                  <span>{standingPromptMode === 'secondary' ? stablePrompt.badge : stablePrompt.label}</span>
                  {standingPromptMode === 'full' && stablePromptTargetLabel && <span className="text-text-tertiary">{stablePromptTargetLabel}</span>}
                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${stablePromptStateToneClassName}`}>{standingPromptStateLabel}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">{standingPromptMode === 'secondary' ? 'Next up' : 'Standing prompt'}</p>
              <button
                type="button"
                onClick={jumpToStablePrompt}
                className={`mt-1 inline-flex flex-wrap items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] hover:border-primary/35 hover:bg-primary/[0.04] ${standingPromptMode === 'secondary' ? 'border-border/35 bg-surface-subtle/20 text-text-tertiary' : 'border-border/50 bg-surface-subtle/40 text-text-secondary'}`}
              >
                <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${stablePromptBadgeToneClassName}`}>{standingPromptBadge}</span>
                <span>{standingPromptCopy}</span>
                {stablePromptTargetLabel && <span className="text-text-tertiary">{stablePromptTargetLabel}</span>}
                <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${stablePromptStateToneClassName}`}>{standingPromptStateLabel}</span>
              </button>
            </div>
          )}

          <div className="mb-3 rounded-lg border border-border/50 bg-surface-subtle/30 px-3 py-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-medium text-text-primary">{commandModeLabel}</p>
                <p className="mt-1 text-[11px] text-text-secondary">{commandModeGuidance}</p>
                {!commandSource && neutralFocusReason && (
                  <p className="mt-1 text-[10px] text-text-tertiary">{neutralFocusReason}</p>
                )}
                <p className="mt-1 text-[10px] text-text-tertiary">{primaryAction.title} — {primaryAction.detail}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={runPrimaryAction}
                  className="rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
                >
                  {primaryAction.key === 'all-clear' ? 'Review next best action' : 'Run primary action'}
                </button>
                {commandSource && (
                  <button
                    type="button"
                    onClick={returnToBoard}
                    className="rounded-full border border-border bg-white px-3 py-1 text-[11px] text-text-secondary hover:border-primary/35 hover:text-primary"
                  >
                    Return to board
                  </button>
                )}
                {!commandSource && panelFocus && (
                  <button
                    type="button"
                    onClick={revisitNeutralFocus}
                    className="rounded-full border border-border bg-white px-3 py-1 text-[11px] text-text-secondary hover:border-primary/35 hover:text-primary"
                  >
                    Revisit board focus
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="mb-3 rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-text-primary">Primary action path</p>
                <p className="mt-1 text-[11px] text-text-secondary">Destination · {primaryActionBoard.destinationLabel}</p>
                <p className="text-[11px] text-text-secondary">Execution · {primaryActionBoard.executionLabel}</p>
              </div>
              <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${primaryActionBoard.tone === 'ready' ? 'border-primary/20 bg-primary/5 text-primary' : primaryActionBoard.tone === 'warning' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-border bg-white text-text-tertiary'}`}>
                {primaryActionBoard.statusLabel}
              </span>
            </div>
            <div className="mt-3 rounded-md border border-border/50 bg-white px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Action detail</p>
              <p className="mt-1 text-[11px] text-text-primary">{primaryActionBoard.detailLabel}</p>
            </div>
          </div>
          <div className="mb-3 rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-text-primary">Execution status</p>
                <p className="mt-1 text-[11px] text-text-secondary">Lane · {executionBoard.laneLabel}</p>
                <p className="text-[11px] text-text-secondary">Last move · {executionBoard.lastMoveLabel}</p>
              </div>
              <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${executionBoard.tone === 'ready' ? 'border-primary/20 bg-primary/5 text-primary' : executionBoard.tone === 'warning' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-border bg-white text-text-tertiary'}`}>
                {executionBoard.statusLabel}
              </span>
            </div>
            <div className="mt-3 rounded-md border border-border/50 bg-white px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Effect</p>
              <p className="mt-1 text-[11px] text-text-primary">{executionBoard.effectLabel}</p>
            </div>
          </div>
          <div className="mb-3 rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-text-primary">Navigation path</p>
                <p className="mt-1 text-[11px] text-text-secondary">Destination · {navigationBoard.destinationLabel}</p>
                <p className="text-[11px] text-text-secondary">Board target · {navigationBoard.boardTargetLabel}</p>
              </div>
              <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${navigationBoard.tone === 'ready' ? 'border-primary/20 bg-primary/5 text-primary' : navigationBoard.tone === 'warning' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-border bg-white text-text-tertiary'}`}>
                {navigationBoard.statusLabel}
              </span>
            </div>
            <div className="mt-3 rounded-md border border-border/50 bg-white px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Route mode</p>
              <p className="mt-1 text-[11px] text-text-primary">{navigationBoard.modeLabel}</p>
            </div>
          </div>
          <div className="mb-3 rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-text-primary">Command board</p>
                <p className="mt-1 text-[11px] text-text-secondary">First · {commandBoard.firstActionLabel}</p>
                <p className="text-[11px] text-text-secondary">Then · {commandBoard.secondActionLabel}</p>
              </div>
              <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${commandBoard.tone === 'ready' ? 'border-primary/20 bg-primary/5 text-primary' : commandBoard.tone === 'warning' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-border bg-white text-text-tertiary'}`}>
                {commandBoard.statusLabel}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Primary target</p>
                <p className="mt-1 text-[11px] text-text-primary">{commandBoard.firstTargetLabel}</p>
              </div>
              <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Why now</p>
                <p className="mt-1 text-[11px] text-text-primary">{commandBoard.reasonLabel}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {commandSummaryItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => jumpToCommandSummaryItem(item.label)}
                className={`rounded-xl border px-3 py-2.5 text-left transition hover:border-primary/35 hover:bg-primary/[0.04] ${item.tone === 'priority' ? 'border-primary/30 bg-primary/[0.06]' : item.tone === 'ready' ? 'border-emerald-200 bg-emerald-50/60' : 'border-border/50 bg-surface-subtle/35'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-medium text-text-primary">{item.label}</p>
                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${item.tone === 'priority' ? 'border-primary/20 bg-white text-primary' : item.tone === 'ready' ? 'border-emerald-200 bg-white text-emerald-700' : 'border-border bg-white text-text-tertiary'}`}>
                    {item.statusLabel}
                  </span>
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-text-tertiary">Target</p>
                <p className="mt-1 text-[11px] text-text-primary">{item.targetLabel}</p>
                <p className="mt-2 text-[10px] text-text-secondary">{item.detail}</p>
                <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-border/60 bg-white/80 px-2 py-1 text-[9px] font-medium text-text-secondary">
                  <span className="text-text-tertiary">Next</span>
                  <span>{item.actionLabel}</span>
                </div>
                {priorityCommandLabel === item.label && (
                  <div className="mt-2 inline-flex flex-wrap items-center gap-1 rounded-full border border-primary/20 bg-white/80 px-2 py-1 text-[9px] font-medium text-primary">
                    <span>Priority — {priorityCommandReason}{priorityCommandTargetReason ? ` ${priorityCommandTargetReason}` : ''}</span>
                    <span className="rounded-full border border-primary/15 bg-primary/[0.05] px-1.5 py-0.5">{priorityCommandCta}</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {commandDeckItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => jumpToCommandSummaryItem(item.label)}
                className={`rounded-xl border px-3 py-3 text-left transition hover:border-primary/35 hover:bg-primary/[0.04] ${item.priority ? 'border-primary/30 bg-primary/[0.06]' : 'border-border/50 bg-surface-subtle/25'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-medium text-text-primary">{item.label}</p>
                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${item.priority ? 'border-primary/20 bg-white text-primary' : 'border-border bg-white text-text-tertiary'}`}>
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-text-secondary">{item.detail}</p>
                {item.target && <p className="mt-2 text-[10px] text-text-tertiary">Target · {item.target}</p>}
                <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">{item.cta}</p>
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {opsSnapshotItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => jumpToOpsSnapshotLane(item.key)}
                className={`rounded-xl border px-3 py-3 text-left transition hover:border-primary/35 hover:bg-primary/[0.04] ${item.tone === 'warning' ? 'border-amber-200 bg-amber-50/70' : item.tone === 'success' ? 'border-emerald-200 bg-emerald-50/70' : 'border-border/50 bg-surface-subtle/30'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium text-text-primary">{item.title}</p>
                    <p className="mt-1 text-[11px] text-text-secondary">{item.detail}</p>
                  </div>
                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${item.locked ? 'border-border bg-white text-text-tertiary' : item.tone === 'warning' ? 'border-amber-200 bg-white text-amber-700' : item.tone === 'success' ? 'border-emerald-200 bg-white text-emerald-700' : 'border-primary/20 bg-white text-primary'}`}>
                    {item.locked ? 'Read only' : item.tone === 'warning' ? 'Needs action' : item.tone === 'success' ? 'On track' : 'Ready'}
                  </span>
                </div>
                <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">{item.cta}</p>
              </button>
            ))}
          </div>
        </div>

        {coordinatorRole !== 'owner' && (
          <div className={`rounded-xl border px-3 py-3 ${
            coordinatorRole === 'planner'
              ? 'border-primary/20 bg-primary/5 text-primary'
              : coordinatorRole === 'coordinator'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-border/40 bg-surface-subtle text-text-tertiary'
          }`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">Main focus</p>
            <p className="mt-1 text-sm font-semibold">{plannerHandoff.focusTitle}</p>
            <p className="mt-1 text-xs leading-5 opacity-90">{plannerHandoff.focusDetail}</p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em]">Decision rule</p>
            <p className="mt-1 text-xs leading-5 opacity-90">{plannerHandoff.decisionRule}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={`lg:col-span-2 rounded-2xl border bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)] overflow-hidden ${panelFocus === 'check-in' ? 'border-primary/40 ring-2 ring-primary/10' : 'border-border/35'}`}>
            <div className="px-4 py-3 border-b border-border/60 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">Check-in queue</p>
                  <p className="text-[11px] text-text-tertiary">Search arrivals fast and keep the live line moving.</p>
                </div>
                <p className="text-[11px] text-text-tertiary">{checkInQueue.length} shown · {checkInWatchCount} need review{checkInReviewOnly ? ' · review mode' : ''}{activeGuestId ? ` · ${getCoordinatorActiveTargetLabel('guest')}` : ''}{checkInTargetState.label ? ` · ${checkInTargetState.label}` : ''}</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-text-primary">Door board</p>
                    <p className="mt-1 text-[11px] text-text-secondary">Active · {checkInBoard.activeLabel}</p>
                    <p className="text-[11px] text-text-secondary">Next ready · {checkInBoard.nextReadyLabel}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${checkInBoard.tone === 'ready' ? 'border-primary/20 bg-primary/5 text-primary' : checkInBoard.tone === 'warning' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-border bg-white text-text-tertiary'}`}>
                    {checkInBoard.statusLabel}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Queue mix</p>
                    <p className="mt-1 text-[11px] text-text-primary">{checkInBoard.queueLabel}</p>
                  </div>
                  <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Review pressure</p>
                    <p className="mt-1 text-[11px] text-text-primary">{checkInBoard.reviewLabel}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={checkInQuery}
                  onChange={(e) => { focusCoordinatorCheckInLane(); setCheckInQuery(e.target.value); }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    const activeGuest = checkInQueue.find((guest) => guest.id === activeGuestId) ?? checkInQueue[0];
                    if (activeGuest && canCheckIn && !activeGuest.checked_in_at && getCoordinatorDoorStatus(activeGuest) !== 'watch') {
                      focusCoordinatorCheckInLane();
                      setActiveGuestId(activeGuest.id);
                      void toggleCheckIn(activeGuest);
                      return;
                    }
                    focusFirstCoordinatorQueueGuest();
                  }}
                  placeholder="Search guest name or RSVP status · Enter checks in the active ready guest"
                />
                <select
                  value={checkInFilter}
                  onChange={(e) => { focusCoordinatorCheckInLane(); setCheckInFilter(e.target.value as CoordinatorCheckInFilter); setCheckInReviewOnly(false); }}
                  className="sm:w-40 text-xs rounded-md border border-border bg-white px-2 py-2 text-text-secondary"
                >
                  <option value="arrivals">Arrivals</option>
                  <option value="checked-in">Checked in</option>
                  <option value="all">All guests</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    focusCoordinatorCheckInLane();
                    setCheckInFilter('arrivals');
                    setCheckInReviewOnly(false);
                    setActiveGuestId(nextArrivals[0]?.id ?? null);
                  }}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${!checkInReviewOnly && checkInFilter === 'arrivals' ? 'border-primary/35 bg-primary/5 text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/35 hover:text-primary'}`}
                >
                  Ready now{nextArrivals.length ? ` · ${nextArrivals.length}` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    focusCoordinatorCheckInLane();
                    setCheckInFilter('arrivals');
                    setCheckInReviewOnly((prev) => !prev);
                    setActiveGuestId(checkInBoardTargetId);
                  }}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${checkInReviewOnly ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-border bg-white text-text-secondary hover:border-amber-300 hover:text-amber-800'}`}
                >
                  Review only{checkInWatchCount ? ` · ${checkInWatchCount}` : ''}
                </button>
                {activeGuestId && (
                  <button
                    type="button"
                    onClick={() => {
                      const activeGuest = checkInQueue.find((guest) => guest.id === activeGuestId);
                      if (!activeGuest) return;
                      focusCoordinatorCheckInLane();
                      void toggleCheckIn(activeGuest);
                    }}
                    disabled={!canCheckIn || checkInBusyGuestId === activeGuestId || !(checkInQueue.find((guest) => guest.id === activeGuestId))}
                    className="rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] text-primary disabled:opacity-40"
                  >
                    {checkInBusyGuestId === activeGuestId ? 'Updating…' : 'Check in active guest'}
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-[60vh] overflow-auto divide-y divide-border-subtle/70">
              {checkInQueue.length === 0 && (
                <div className="px-4 py-4 text-xs text-text-tertiary">
                  No guests match this queue right now. Try a different filter or search to keep the door moving.
                </div>
              )}
              {checkInQueue.map((g) => {
                const doorStatus = getCoordinatorDoorStatus(g);
                return (
                  <div
                    key={g.id}
                    className={`flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer ${activeGuestId === g.id ? 'bg-primary/5' : ''}`}
                    onClick={() => {
                      focusCoordinatorCheckInLane();
                      setActiveGuestId(g.id);
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-text-primary">{g.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] border ${doorStatus === 'ready' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : doorStatus === 'watch' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-border bg-surface-subtle text-text-tertiary'}`}>
                          {getCoordinatorDoorStatusLabel(doorStatus)}
                        </span>
                        {checkInBoardTargetId === g.id && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] border ${checkInTargetState.isBoardTargetActive ? 'border-primary/25 bg-primary/10 text-primary' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                            {checkInTargetState.isBoardTargetActive ? 'Board target in progress' : 'Board target'}
                          </span>
                        )}
                        {activeGuestId === g.id && checkInBoardTargetId !== g.id && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] border border-primary/20 bg-primary/5 text-primary">
                            Working guest
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-tertiary">{g.rsvp_status}{doorStatus === 'watch' ? ' · Flag before check-in' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {doorStatus === 'watch' && canEditQna && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); escalateDoorReview(g); }}
                          className="px-3 py-1.5 text-xs rounded-md border border-amber-200 text-amber-700 bg-amber-50"
                        >
                          Escalate
                        </button>
                      )}
                      <button
                        type="button"
                          onClick={(e) => { e.stopPropagation(); focusCoordinatorCheckInLane(); setActiveGuestId(g.id); canCheckIn && void toggleCheckIn(g); }}
                        disabled={!canCheckIn || doorStatus === 'watch' || checkInBusyGuestId === g.id}
                        className={`px-3 py-1.5 text-xs rounded-md border disabled:opacity-40 ${g.checked_in_at ? 'border-success/40 text-success bg-success/5' : doorStatus === 'watch' ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-border text-text-secondary bg-white'}`}
                      >
                        {checkInBusyGuestId === g.id ? 'Updating…' : g.checked_in_at ? getCoordinatorCheckInActionLabel(g) : doorStatus === 'watch' ? 'Review first' : getCoordinatorCheckInActionLabel(g)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border/35 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)] p-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-text-primary mb-2">Run-of-show timeline{panelFocus === 'timeline' ? ' · focus' : ''}{activeTimelineEventId ? ` · ${getCoordinatorActiveTargetLabel('timeline')}` : ''}{timelineTargetState.label ? ` · ${timelineTargetState.label}` : ''}</p>
              <div className="mb-2 rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-text-primary">Timeline board</p>
                    <p className="mt-1 text-[11px] text-text-secondary">Live · {timelineBoard.liveLabel}</p>
                    <p className="text-[11px] text-text-secondary">Up next · {timelineBoard.upNextLabel}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${timelineBoard.tone === 'ready' ? 'border-primary/20 bg-primary/5 text-primary' : timelineBoard.tone === 'warning' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-border bg-white text-text-tertiary'}`}>
                    {timelineBoard.stateLabel}
                  </span>
                </div>
                <p className="mt-3 text-[11px] text-text-tertiary">Progress · {timelineBoard.progressLabel}</p>
              </div>
              {activeTimelineEvent && (
                <div className="mb-2 rounded-lg border border-border/50 bg-surface-subtle/30 px-3 py-2">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-medium text-text-primary">Focused event</p>
                      <p className="text-sm text-text-primary">{activeTimelineEvent.event_name}</p>
                      <p className="text-[11px] text-text-tertiary">
                        {formatCoordinatorEventDateTime(activeTimelineEvent.start_time)}
                        {activeTimelineEventState ? ` · ${activeTimelineEventState === 'live' ? 'Live now' : activeTimelineEventState === 'done' ? 'Completed' : 'Up next'}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeTimelineCorrectionAction && (
                        <button
                          type="button"
                          disabled={!canEditTimeline}
                          onClick={() => runTimelineAction(activeTimelineEvent.id, activeTimelineCorrectionAction.nextState)}
                          className="text-[11px] px-2.5 py-1 rounded border border-amber-200 bg-amber-50 text-amber-700 disabled:opacity-40"
                        >
                          {activeTimelineCorrectionAction.label}
                        </button>
                      )}
                      {activeTimelinePrimaryAction?.nextState && (
                        <button
                          type="button"
                          disabled={!canEditTimeline}
                          onClick={() => runTimelineAction(activeTimelineEvent.id, activeTimelinePrimaryAction.nextState)}
                          className="text-[11px] px-2.5 py-1 rounded border border-primary/25 bg-primary/5 text-primary disabled:opacity-40"
                        >
                          {activeTimelinePrimaryAction.label}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {(liveEventId || upNextEventId || timelineBoardTargetId) && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {liveEventId && (
                    <button
                      type="button"
                      onClick={() => jumpToTimelineEvent(liveEventId)}
                      className={`text-[11px] px-2 py-1 rounded-full border ${activeTimelineEventId === liveEventId ? 'border-primary/30 bg-primary/10 text-primary' : 'border-primary/20 bg-primary/5 text-primary hover:bg-primary/10'}`}
                    >
                      Jump to live event
                    </button>
                  )}
                  {upNextEventId && (
                    <button
                      type="button"
                      onClick={() => jumpToTimelineEvent(upNextEventId)}
                      className={`text-[11px] px-2 py-1 rounded-full border ${activeTimelineEventId === upNextEventId ? 'border-amber-300 bg-amber-100 text-amber-800' : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                    >
                      Jump to up next
                    </button>
                  )}
                  {timelineBoardTargetId && timelineBoardTargetId !== liveEventId && timelineBoardTargetId !== upNextEventId && (
                    <button
                      type="button"
                      onClick={() => jumpToTimelineEvent(timelineBoardTargetId)}
                      className={`text-[11px] px-2 py-1 rounded-full border ${activeTimelineEventId === timelineBoardTargetId ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/35 hover:text-primary'}`}
                    >
                      Jump to board target
                    </button>
                  )}
                </div>
              )}
              <div className="space-y-2">
                {events.length === 0 ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-surface-subtle/30 px-3 py-2">
                    <p className="text-xs text-text-tertiary">No itinerary events yet.</p>
                    <a
                      href="/dashboard/itinerary#itinerary-readiness"
                      className="rounded border border-border px-2.5 py-1 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary"
                    >
                      Open itinerary
                    </a>
                  </div>
                ) : (
                  events.map((e) => {
                    const state = timelineState[e.id] || 'up-next';
                    const isLive = e.id === liveEventId;
                    const isUpNext = e.id === upNextEventId;
                    const primaryAction = getCoordinatorPrimaryTimelineAction({
                      event: e,
                      liveEventId,
                      upNextEventId,
                      timelineState,
                    });
                    const correctionAction = getCoordinatorTimelineCorrectionAction(state);
                    return (
                      <div
                        key={e.id}
                        className={`rounded-lg border px-3 py-2 cursor-pointer ${activeTimelineEventId === e.id ? 'ring-2 ring-primary/10 ' : ''}${isLive ? 'border-primary/35 bg-primary/5' : isUpNext ? 'border-amber-200 bg-amber-50' : 'border-border/50 bg-surface-subtle/40'}`}
                        onClick={() => {
                          focusCoordinatorTimelineLane();
                          setActiveTimelineEventId(e.id);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm text-text-primary">{e.event_name}</p>
                              {timelineBoardTargetId === e.id && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] border ${timelineTargetState.isBoardTargetActive ? 'border-primary/25 bg-primary/10 text-primary' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                  {timelineTargetState.isBoardTargetActive ? 'Board event in progress' : isLive ? 'Board live event' : 'Board up-next event'}
                                </span>
                              )}
                              {activeTimelineEventId === e.id && timelineBoardTargetId !== e.id && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] border border-primary/20 bg-primary/5 text-primary">
                                  Working event
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-text-tertiary">{isLive ? 'Live now' : isUpNext ? 'Up next' : state === 'done' ? 'Completed' : 'Queued'}</p>
                          </div>
                          <select
                            value={state}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(ev) => { if (canEditTimeline) selectTimelineState(e.id, ev.target.value as TimelineState); }}
                            disabled={!canEditTimeline}
                            className="text-[11px] rounded-md border border-border bg-white px-2 py-1 text-text-secondary disabled:opacity-40"
                          >
                            <option value="up-next">Up next</option>
                            <option value="live">Live</option>
                            <option value="done">Done</option>
                          </select>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <p className="text-xs text-text-tertiary">{formatCoordinatorEventDateTime(e.start_time)}</p>
                          <div className="flex items-center gap-2">
                            {correctionAction && (
                              <button
                                type="button"
                                disabled={!canEditTimeline}
                                onClick={(ev) => { ev.stopPropagation(); runTimelineAction(e.id, correctionAction.nextState); }}
                                className="text-[11px] px-2.5 py-1 rounded border border-amber-200 bg-amber-50 text-amber-700 disabled:opacity-40"
                              >
                                {correctionAction.label}
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={!canEditTimeline || !primaryAction.nextState}
                              onClick={(ev) => { ev.stopPropagation(); runTimelineAction(e.id, primaryAction.nextState); }}
                              className="text-[11px] px-2.5 py-1 rounded border border-border bg-white text-text-secondary disabled:opacity-40"
                            >
                              {primaryAction.label}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="border-t border-border/60 pt-3">
              <p className="text-sm font-medium text-text-primary mb-1">Day-of message</p>
              <p className="text-[11px] text-text-tertiary mb-2">Use quick actions and filters to send updates to the right guests fast.</p>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                {[
                  ['Queued', alertStats.total],
                  ['Send now', alertStats.immediate],
                  ['Scheduled', alertStats.scheduled],
                  ['SMS', alertStats.sms],
                  ['Email', alertStats.email],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-border/35 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.04)] px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-text-tertiary">{label}</p>
                    <p className="text-xs font-semibold text-text-primary">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mb-3 rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-text-primary">Alert board</p>
                    <p className="mt-1 text-[11px] text-text-secondary">{alertBoard.targetLabel}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${alertBoard.statusTone === 'ready' ? 'border-primary/20 bg-primary/5 text-primary' : alertBoard.statusTone === 'warning' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-border bg-white text-text-tertiary'}`}>
                    {alertBoard.statusLabel}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Delivery</p>
                    <p className="mt-1 text-[11px] text-text-primary">{alertBoard.deliveryLabel}</p>
                  </div>
                  <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Latest activity</p>
                    <p className="mt-1 text-[11px] text-text-primary">{alertBoard.latestActivityLabel}</p>
                  </div>
                </div>
              </div>
              <div className="mb-3 rounded-lg border border-border/50 bg-surface-subtle/25 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-text-primary">Alert activity</p>
                    <p className="mt-1 text-[11px] text-text-secondary">Latest live · {alertActivityBoard.latestLiveLabel}</p>
                    <p className="text-[11px] text-text-secondary">Next scheduled · {alertActivityBoard.nextScheduledLabel}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${alertActivityBoard.tone === 'ready' ? 'border-primary/20 bg-primary/5 text-primary' : alertActivityBoard.tone === 'warning' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-border bg-white text-text-tertiary'}`}>
                    {alertActivityBoard.statusLabel}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Channel mix</p>
                    <p className="mt-1 text-[11px] text-text-primary">{alertActivityBoard.channelLabel}</p>
                  </div>
                  <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Pacing</p>
                    <p className="mt-1 text-[11px] text-text-primary">{alertActivityBoard.pacingLabel}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {alertSuggestions.map((suggestion) => {
                  const suggestionState = getCoordinatorAlertSuggestionState({
                    suggestion,
                    preferredSuggestion: preferredAlertSuggestion,
                    subject: alertForm.subject,
                    body: alertForm.body,
                    audience: alertForm.audience,
                  });

                  return (
                    <button
                      key={suggestion.key}
                      type="button"
                      disabled={!canSendAlerts}
                      onClick={() => {
                        focusCoordinatorAlertLane();
                        setAlertForm((prev) => ({
                          ...prev,
                          subject: suggestion.subject,
                          body: suggestion.body,
                          audience: suggestion.audience,
                        }));
                        setLastAlertSuggestionKey(suggestion.key);
                      }}
                      className={`text-[11px] px-2 py-1 rounded-full border inline-flex items-center gap-1.5 disabled:opacity-40 ${suggestionState.isDraftMatch ? 'border-primary/35 bg-primary/10 text-primary' : suggestionState.isBoardTarget ? 'border-primary/25 bg-primary/5 text-primary hover:bg-primary/10' : 'border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary'}`}
                    >
                      <span>{suggestion.label}</span>
                      {suggestionState.badge && (
                        <span className={`px-1.5 py-0.5 rounded-full border text-[9px] font-medium ${suggestionState.isDraftMatch ? 'border-primary/25 bg-white/80 text-primary' : 'border-primary/15 bg-primary/[0.04] text-primary/80'}`}>
                          {suggestionState.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={!canSendAlerts}
                  onClick={() => { focusCoordinatorAlertLane(); setAlertForm((prev) => ({ ...prev, channel: 'sms', scheduleType: 'now' })); }}
                  className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary disabled:opacity-40"
                >
                  Text now
                </button>
                <button
                  type="button"
                  disabled={!canSendAlerts || !canScheduleAlerts}
                  onClick={() => { focusCoordinatorAlertLane(); setAlertForm((prev) => ({ ...prev, channel: 'email', scheduleType: 'later' })); }}
                  className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary disabled:opacity-40"
                >
                  Schedule email
                </button>
                {alertStats.byAudience.map(([audience, count]) => (
                  <button
                    key={audience}
                    type="button"
                    disabled={!canSendAlerts}
                    onClick={() => { focusCoordinatorAlertLane(); setAlertForm((prev) => ({ ...prev, audience })); }}
                    className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary disabled:opacity-40"
                  >
                    {audience} ({count})
                  </button>
                ))}
              </div>

              <fieldset disabled={!canSendAlerts} className="space-y-2.5">
                <Input
                  value={alertForm.subject}
                  onChange={(e) => { focusCoordinatorAlertLane(); setAlertForm((prev) => ({ ...prev, subject: e.target.value })); }}
                  placeholder="Message subject"
                />
                <Textarea
                  value={alertForm.body}
                  onChange={(e) => { focusCoordinatorAlertLane(); setAlertForm((prev) => ({ ...prev, body: e.target.value })); }}
                  rows={3}
                  placeholder="Write the update you want guests to receive"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={alertForm.audience}
                    onChange={(e) => { focusCoordinatorAlertLane(); setAlertForm((prev) => ({ ...prev, audience: e.target.value })); }}
                    className="text-xs rounded-md border border-border bg-white px-2 py-2 text-text-secondary"
                  >
                    <option value="all">All guests</option>
                    <option value="checked-in">Checked-in guests</option>
                    <option value="pending">Pending RSVP</option>
                    {eventAudienceOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label} ({opt.count})</option>
                    ))}
                  </select>
                  <select
                    value={alertForm.channel}
                    onChange={(e) => { focusCoordinatorAlertLane(); setAlertForm((prev) => ({ ...prev, channel: e.target.value as 'email' | 'sms' })); }}
                    className="text-xs rounded-md border border-border bg-white px-2 py-2 text-text-secondary"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={alertForm.scheduleType}
                    onChange={(e) => { focusCoordinatorAlertLane(); setAlertForm((prev) => ({ ...prev, scheduleType: (canScheduleAlerts ? e.target.value : 'now') as 'now' | 'later' })); }}
                    className="text-xs rounded-md border border-border bg-white px-2 py-2 text-text-secondary"
                  >
                    <option value="now">Send now</option>
                    <option value="later" disabled={!canScheduleAlerts}>Schedule</option>
                  </select>
                  {alertForm.scheduleType === 'later' && canScheduleAlerts ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={alertForm.scheduleDate}
                        onChange={(e) => { focusCoordinatorAlertLane(); setAlertForm((prev) => ({ ...prev, scheduleDate: e.target.value })); }}
                        className="text-xs rounded-md border border-border bg-white px-2 py-2 text-text-secondary"
                      />
                      <input
                        type="time"
                        value={alertForm.scheduleTime}
                        onChange={(e) => { focusCoordinatorAlertLane(); setAlertForm((prev) => ({ ...prev, scheduleTime: e.target.value })); }}
                        className="text-xs rounded-md border border-border bg-white px-2 py-2 text-text-secondary"
                      />
                    </div>
                  ) : <div />}
                </div>
                <div className={`rounded-md border px-3 py-2 space-y-2 ${alertTargetCue.aligned ? 'border-primary/20 bg-primary/[0.03]' : 'border-amber-200 bg-amber-50/80'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-medium text-text-primary">Ready to send</p>
                      <p className="text-[10px] text-text-tertiary/80">{getCoordinatorActiveTargetLabel('alert')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${alertTargetCue.aligned ? 'border-primary/20 bg-primary/5 text-primary' : 'border-amber-300 bg-amber-100 text-amber-800'}`}>{alertTargetCue.aligned ? 'Board-aligned' : 'Customized'}</span>
                      <span className="px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-[10px] font-medium text-primary">{alertLaneLabel}</span>
                    </div>
                  </div>
                  <p className="text-[11px] font-medium text-text-primary">{alertTargetCue.title}</p>
                  <p className="text-[11px] text-text-secondary">{alertTargetCue.detail}</p>
                  {!alertTargetCue.aligned && (
                    <div className="space-y-2">
                      {alertOverrideLabel && <p className="text-[11px] text-amber-800">{alertOverrideLabel}</p>}
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        {alertOverrideTargetLabel && <p className="text-amber-800/80">{alertOverrideTargetLabel}</p>}
                        {alertOverrideCurrentLabel && <p className="text-text-secondary">{alertOverrideCurrentLabel}</p>}
                        {preferredAlertSuggestion && (
                          <button
                            type="button"
                            onClick={() => { focusCoordinatorAlertLane(); setAlertForm((prev) => applyCoordinatorAlertSuggestion({ form: prev, suggestion: preferredAlertSuggestion })); }}
                            className="inline-flex w-fit px-2.5 py-1 rounded-md border border-amber-300 bg-white text-[11px] font-medium text-amber-800"
                          >
                            Re-align to {preferredAlertSuggestion.label.toLowerCase()}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-text-secondary">{alertSummary.intentLabel} · {alertSummary.audienceLabel} · {alertSummary.recipientLabel}</p>
                  <p className="text-[11px] text-text-tertiary">{alertSummary.deliveryLabel}</p>
                </div>
                {!canScheduleAlerts && canSendAlerts && <p className="text-[11px] text-text-tertiary">Coordinators can send updates now; scheduled sends stay with planners and the couple.</p>}
                {alertValidationError && <p className="text-[11px] text-error">{alertValidationError}</p>}
                <button
                  type="button"
                  onClick={() => void sendDayOfAlert()}
                  disabled={alertBusy || !!alertValidationError || !canSendAlerts}
                  className="w-full px-3 py-2 text-sm rounded-md border border-primary/30 bg-primary/10 text-primary disabled:opacity-50"
                >
                  {alertBusy ? 'Saving...' : alertForm.scheduleType === 'later' ? 'Schedule message' : 'Send message'}
                </button>
                {alertLog.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => { focusCoordinatorAlertLane(); setAlertChannelFilter('all'); }} className={`text-[11px] px-2 py-0.5 rounded-full border ${alertChannelFilter === 'all' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>All</button>
                      <button type="button" onClick={() => { focusCoordinatorAlertLane(); setAlertChannelFilter('email'); }} className={`text-[11px] px-2 py-0.5 rounded-full border ${alertChannelFilter === 'email' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>Email</button>
                      <button type="button" onClick={() => { focusCoordinatorAlertLane(); setAlertChannelFilter('sms'); }} className={`text-[11px] px-2 py-0.5 rounded-full border ${alertChannelFilter === 'sms' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>SMS</button>
                      <button type="button" onClick={() => { focusCoordinatorAlertLane(); setAlertTimingFilter('all'); }} className={`text-[11px] px-2 py-0.5 rounded-full border ${alertTimingFilter === 'all' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>Any time</button>
                      <button type="button" onClick={() => { focusCoordinatorAlertLane(); setAlertTimingFilter('now'); }} className={`text-[11px] px-2 py-0.5 rounded-full border ${alertTimingFilter === 'now' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>Send now</button>
                      <button type="button" onClick={() => { focusCoordinatorAlertLane(); setAlertTimingFilter('scheduled'); }} className={`text-[11px] px-2 py-0.5 rounded-full border ${alertTimingFilter === 'scheduled' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>Scheduled</button>
                    </div>
                    {filteredAlertLogView.slice(0, 4).map((item) => (
                      <div key={item.id} className={`border rounded-md px-2.5 py-2 ${item.tone === 'ready' ? 'border-primary/20 bg-primary/[0.03]' : 'border-amber-200 bg-amber-50/50'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-medium text-text-primary">{item.title}</p>
                          <p className="text-[10px] text-text-tertiary">{item.meta}</p>
                        </div>
                        <p className="mt-1 text-[11px] text-text-secondary">{item.detail}</p>
                      </div>
                    ))}
                    {filteredAlertLog.length === 0 && (
                      <p className="text-[11px] text-text-tertiary">No messages match the current alert filters.</p>
                    )}
                  </div>
                )}
              </fieldset>
            </div>

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
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${qnaBoard.tone === 'ready' ? 'border-primary/20 bg-primary/5 text-primary' : qnaBoard.tone === 'warning' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-border bg-white text-text-tertiary'}`}>
                    {qnaBoard.statusLabel}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Backlog</p>
                    <p className="mt-1 text-[11px] text-text-primary">{qnaBoard.backlogLabel}</p>
                  </div>
                  <div className="rounded-md border border-border/50 bg-white px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Focused draft</p>
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
                          className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] text-text-secondary hover:border-primary/35 hover:text-primary"
                        >
                          Jump to board question
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          focusCoordinatorQnaLane();
                          setActiveQnaId(activeQnaItem.id);
                          void saveQnaAnswer(activeQnaItem.id);
                        }}
                        className="rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] text-primary"
                      >
                        {(qnaDraftAnswers[activeQnaItem.id] ?? activeQnaItem.answer ?? '').trim() ? 'Save focused reply' : 'Reopen focused question'}
                      </button>
                      {qnaCounts.open > 0 && (
                        <button
                          type="button"
                          onClick={focusNextCoordinatorQna}
                          className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] text-text-secondary hover:border-primary/35 hover:text-primary"
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
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${qnaFilter === 'open' ? 'border-primary/35 bg-primary/5 text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/35 hover:text-primary'}`}
                >
                  Open only · {qnaCounts.open}
                </button>
                <button
                  type="button"
                  onClick={() => { focusCoordinatorQnaLane(); setQnaFilter('answered'); }}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${qnaFilter === 'answered' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-border bg-white text-text-secondary hover:border-emerald-300 hover:text-emerald-800'}`}
                >
                  Answered · {qnaCounts.answered}
                </button>
                <button
                  type="button"
                  onClick={() => { focusCoordinatorQnaLane(); setQnaFilter('all'); }}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${qnaFilter === 'all' ? 'border-border/70 bg-surface-subtle/40 text-text-primary' : 'border-border bg-white text-text-secondary hover:border-primary/35 hover:text-primary'}`}
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
                              <span className={`px-2 py-0.5 rounded border whitespace-nowrap ${qnaTargetState.isBoardTargetActive ? 'border-primary/25 bg-primary/10 text-primary' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                {qnaTargetState.isBoardTargetActive ? 'Board question in progress' : 'Board question'}
                              </span>
                            )}
                            {activeQnaId === item.id && qnaBoardTargetId !== item.id && (
                              <span className="px-2 py-0.5 rounded border whitespace-nowrap border-primary/20 bg-primary/5 text-primary">
                                Working question
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded border whitespace-nowrap ${item.status === 'answered' ? 'text-success border-success/35 bg-success/5' : 'text-warning border-warning/35 bg-warning/5'}`}>
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
