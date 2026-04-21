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
import { getCoordinatorAlertSuggestionState } from '../../lib/coordinatorAlertSuggestionState';
import { getCoordinatorAlertOverrideLabel } from '../../lib/coordinatorAlertOverrideLabel';
import { getCoordinatorAlertOverrideTargetLabel } from '../../lib/coordinatorAlertOverrideTargetLabel';
import { getCoordinatorAlertOverrideCurrentLabel } from '../../lib/coordinatorAlertOverrideCurrentLabel';
import { shouldResetCoordinatorAlertOverride } from '../../lib/coordinatorAlertOverrideReset';
import { getCoordinatorAlertSummaryStateLabel } from '../../lib/coordinatorAlertSummaryStateLabel';
import { getCoordinatorAlertSummaryTransitionLabel } from '../../lib/coordinatorAlertSummaryTransitionLabel';
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
import { resolveCoordinatorQnaFocusAfterItemsChange, resolveCoordinatorTimelineFocusAfterStateChange } from '../../lib/coordinatorResolvedFocus';


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
  const [activeSiteRole, setActiveSiteRole] = useState<PlannerAccessRole>('owner');
  const [alertChannelFilter, setAlertChannelFilter] = useState<'all' | 'email' | 'sms'>('all');
  const [alertTimingFilter, setAlertTimingFilter] = useState<'all' | 'now' | 'scheduled'>('all');
  const [qnaInput, setQnaInput] = useState('');
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
  const [alertOverrideLabelState, setAlertOverrideLabelState] = useState<string | null>(null);
  const [previousAlertAligned, setPreviousAlertAligned] = useState<boolean | null>(null);
  const [realignmentLabel, setRealignmentLabel] = useState<string | null>(null);
  const [checkInQuery, setCheckInQuery] = useState('');
  const [checkInFilter, setCheckInFilter] = useState<CoordinatorCheckInFilter>('arrivals');
  const [checkInReviewOnly, setCheckInReviewOnly] = useState(false);
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
          setSiteId('demo-site');
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
        if (qnaData && qnaData.length > 0) {
          setQnaItems((qnaData as Array<{ id: string; question: string; status: 'new' | 'answered'; answer?: string | null }>));
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
      if (isDemoMode) {
        const rawQna = localStorage.getItem(`dayof.qna.${siteId}`);
        if (rawQna) setQnaItems(normalizeCoordinatorQnaItems(JSON.parse(rawQna)) as QnaItem[]);
        else setQnaItems([
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
      setCheckInReviewOnly(sessionState.checkInReviewOnly);
      setPanelFocus(sessionState.panelFocus);

      const rawDraftState = localStorage.getItem(`dayof.coordinator.draft.${siteId}`);
      const draftState = normalizeCoordinatorDraftState(rawDraftState ? JSON.parse(rawDraftState) : null);
      setAlertForm((prev) => ({ ...prev, ...draftState.alertForm }));
      setQnaDraftAnswers(draftState.qnaDraftAnswers);

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
    if (!siteId || !isDemoMode) return;
    try { localStorage.setItem(`dayof.qna.${siteId}`, JSON.stringify(qnaItems)); } catch {}
  }, [siteId, qnaItems, isDemoMode]);

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
        checkInReviewOnly,
        panelFocus,
      }));
    } catch {}
  }, [siteId, checkInFilter, checkInReviewOnly, panelFocus]);

  useEffect(() => {
    if (!siteId) return;
    try {
      localStorage.setItem(`dayof.coordinator.draft.${siteId}`, JSON.stringify({
        alertForm,
        qnaDraftAnswers,
      }));
    } catch {}
  }, [siteId, alertForm, qnaDraftAnswers]);

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
    if (!siteId || isDemoMode) return;
    const next = guest.checked_in_at ? null : new Date().toISOString();
    const { error } = await supabase
      .from('guests')
      .update({ checked_in_at: next })
      .eq('id', guest.id)
      .eq('wedding_site_id', siteId);
    if (error) return;
    setGuests((prev) => prev.map((g) => (g.id === guest.id ? { ...g, checked_in_at: next } : g)));
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
    label: `${e.event_name}${e.start_time ? ` — ${new Date(e.start_time).toLocaleString()}` : ''}`,
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

  const handoffCopy = {
    title: coordinatorRole === 'viewer' ? 'Viewer handoff' : coordinatorRole === 'coordinator' ? 'Coordinator handoff' : 'Planner handoff',
    detail: coordinatorRole === 'viewer'
      ? 'Use this board for visibility only and escalate changes to the active operator.'
      : coordinatorRole === 'coordinator'
        ? 'Keep live updates moving and flag anything sensitive back to the couple.'
        : 'Run the room, keep communications aligned, and escalate only the decisions that need the couple.'
  };

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

  useEffect(() => {
    if (shouldResetCoordinatorAlertOverride({
      overrideLabel: alertOverrideLabelState,
      aligned: alertTargetCue.aligned,
    })) {
      setAlertOverrideLabelState(null);
    }
  }, [alertOverrideLabelState, alertTargetCue.aligned]);

  useEffect(() => {
    if (!preferredAlertSuggestion) return;
    setAlertForm((prev) => {
      if (prev.subject.trim() || prev.body.trim()) return prev;
      return {
        ...prev,
        audience: prev.audience || preferredAlertSuggestion.audience,
        subject: preferredAlertSuggestion.subject,
        body: preferredAlertSuggestion.body,
      };
    });
  }, [preferredAlertSuggestion]);

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


  const nextArrivals = useMemo(
    () => sortedGuests.filter((g) => !g.checked_in_at && getCoordinatorDoorStatus(g) === 'ready').slice(0, 5),
    [sortedGuests],
  );
  const checkInWatchCount = useMemo(() => guests.filter((guest) => getCoordinatorDoorStatus(guest) === 'watch').length, [guests]);

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
  const timelineTargetEvent = useMemo(() => events.find((event) => event.id === timelineBoardTargetId) ?? null, [events, timelineBoardTargetId]);
  const qnaTargetItem = useMemo(() => qnaItems.find((item) => item.id === qnaBoardTargetId) ?? null, [qnaItems, qnaBoardTargetId]);
  const commandSummaryItems = useMemo(() => buildCoordinatorCommandSummary({
    checkInLabel: checkInTargetState.label,
    timelineLabel: timelineTargetState.label,
    qnaLabel: qnaTargetState.label,
    alertLabel: alertSummaryStateLabel,
  }), [checkInTargetState.label, timelineTargetState.label, qnaTargetState.label, alertSummaryStateLabel]);
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
  const commandModeLabel = useMemo(() => getCoordinatorCommandModeLabel(commandSource), [commandSource]);
  const commandModeGuidance = useMemo(() => getCoordinatorCommandModeGuidance(commandSource), [commandSource]);
  const correctionCues = useMemo(() => buildCoordinatorCorrectionCues({
    guests,
    events,
    timelineState,
  }), [guests, events, timelineState]);
  const correctionGuestId = useMemo(() => getCoordinatorCorrectionGuestId(sortedGuests), [sortedGuests]);
  const correctionEventId = useMemo(() => getCoordinatorCorrectionEventId(events, timelineState), [events, timelineState]);

  const filteredAlertLog = useMemo(
    () => alertLog.filter((a) => {
      if (alertChannelFilter !== 'all' && a.channel !== alertChannelFilter) return false;
      if (alertTimingFilter === 'scheduled' && !a.sendAt) return false;
      if (alertTimingFilter === 'now' && !!a.sendAt) return false;
      return true;
    }),
    [alertLog, alertChannelFilter, alertTimingFilter],
  );

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
    setQnaInput(buildCoordinatorDoorEscalationPrompt(guest));
    setCommandSource('escalation');
    setPanelFocus('qna');
    setActiveQnaId(getFirstOpenCoordinatorQnaId(qnaItems));
    toast('Door issue moved into guest Q&A triage.', 'success');
  };





  const revisitNeutralFocus = () => {
    const target = resolveCoordinatorNeutralFocusTarget(panelFocus);
    setPanelFocus(target.panelFocus);
    setCheckInReviewOnly(target.reviewOnly);
    if (target.panelFocus === 'check-in') {
      setCheckInFilter('arrivals');
    }
    if (target.panelFocus === 'qna') {
      setActiveQnaId(getFirstOpenCoordinatorQnaId(qnaItems));
    }
  };


  const jumpToCommandSummaryItem = (label: 'Check-in' | 'Timeline' | 'Q&A' | 'Alerting') => {
    const target = getCoordinatorCommandSummaryTarget(label);
    setPanelFocus(target.panelFocus);
    setCheckInReviewOnly(target.reviewOnly);
    setCommandJumpLabel(getCoordinatorCommandJumpLabel(label));
    setCommandJumpPanelFocus(target.panelFocus);
    if (label === 'Check-in') {
      setCheckInFilter('arrivals');
      setCommandJumpTargetId(checkInBoardTargetId);
      if (checkInBoardTargetId) setActiveGuestId(checkInBoardTargetId);
      return;
    }
    if (label === 'Timeline') {
      setCommandJumpTargetId(timelineBoardTargetId);
      if (timelineBoardTargetId) setActiveTimelineEventId(timelineBoardTargetId);
      return;
    }
    if (label === 'Q&A') {
      const nextQnaId = qnaBoardTargetId ?? getFirstOpenCoordinatorQnaId(qnaItems);
      setCommandJumpTargetId(nextQnaId);
      setActiveQnaId(nextQnaId);
      return;
    }
    setCommandJumpTargetId(null);
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
    if (panelFocus === 'check-in' && checkInBoardTargetId) {
      setActiveGuestId(checkInBoardTargetId);
      setCheckInFilter('arrivals');
      setCheckInReviewOnly(true);
      setManualOverrideLabel(null);
      return;
    }
    if (panelFocus === 'timeline' && timelineBoardTargetId) {
      setActiveTimelineEventId(timelineBoardTargetId);
      setManualOverrideLabel(null);
      return;
    }
    if (panelFocus === 'qna') {
      const nextQnaId = qnaBoardTargetId ?? getFirstOpenCoordinatorQnaId(qnaItems);
      setActiveQnaId(nextQnaId);
      setManualOverrideLabel(null);
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
      setRealignmentLabel(getCoordinatorRealignmentLabel(panelFocus));
    }
  }, [manualOverrideLabel, panelFocus, activeGuestId, activeTimelineEventId, activeQnaId, checkInBoardTargetId, timelineBoardTargetId, qnaBoardTargetId]);

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
    setTimelineState((prev) => setCoordinatorEventTimelineState(prev, eventId, nextState));
    setActiveTimelineEventId(eventId);
    const suggestedIntent = resolveCoordinatorTimelineAlertIntent(alertSuggestions, eventId);
    if (suggestedIntent) {
      setLastAlertSuggestionKey(suggestedIntent);
    }
    setPanelFocus('timeline');
  };

  const runCorrectionCue = (cue: (typeof correctionCues)[number]) => {
    const target = resolveCoordinatorCorrectionCueTarget(cue);
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

          <div className="rounded-2xl border border-border/35 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)] p-4">
            <p className="text-sm font-medium text-text-primary mb-2">Attention now</p>
            <p className="text-[11px] text-text-tertiary mb-2">This pulls together the live exceptions the coordinator should resolve first.</p>
            <div className="space-y-2">
              {liveIssues.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    const focus = resolveCoordinatorQueueFocus(item.key);
                    const nextPanelFocus = resolveCoordinatorPanelFocus(item.key);
                    const timelineTarget = resolveCoordinatorEscalationTimelineTarget({ escalationKey: item.key, upNextEvent });
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
                  {nextArrivals.map((guest) => <p key={guest.id} className="text-xs text-text-secondary">• {guest.name} — {guest.rsvp_status}</p>)}
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href="/dashboard/rsvp-board" className="rounded border border-border px-2.5 py-1 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary">Open RSVP board</a>
              <a href="/dashboard/seating-lookup" className="rounded border border-border px-2.5 py-1 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary">Open seating lookup</a>
              <a href="/dashboard/planning" className="rounded border border-border px-2.5 py-1 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary">Open planning workspace</a>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
          <p className="font-medium">{handoffCopy.title}</p>
          <p className="mt-1 text-primary/80">{handoffCopy.detail}</p>
          <p className="mt-2 text-primary/70">Final couple decisions still sit above this workspace when something needs approval.</p>
        </div>

        <div className="rounded-lg border border-border/35 bg-white px-3 py-2 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <p className="text-xs font-medium text-text-primary">Live command summary</p>
              {commandJumpLabel && <p className="text-[11px] text-primary">{commandJumpLabel}</p>}
              {!commandJumpLabel && alertSummaryTransitionLabel && <p className="text-[11px] text-primary">{alertSummaryTransitionLabel}</p>}
              {!commandJumpLabel && !alertSummaryTransitionLabel && realignmentLabel && <p className="text-[11px] text-primary">{realignmentLabel}</p>}
                {!commandJumpLabel && !alertSummaryTransitionLabel && alertOverrideLabelState && (
                  <p className="text-[11px] text-amber-700">{alertOverrideLabelState}</p>
                )}
                {!commandJumpLabel && manualOverrideLabel && (
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <p className="text-amber-700">{manualOverrideLabel}</p>
                  {manualOverrideTargetLabel && <p className="text-amber-800/80">{manualOverrideTargetLabel}</p>}
                  {manualOverrideCurrentTargetLabel && <p className="text-text-secondary">{manualOverrideCurrentTargetLabel}</p>}
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
            <p className="text-[11px] text-text-tertiary">What the board thinks matters right now</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {commandSummaryItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => jumpToCommandSummaryItem(item.label as 'Check-in' | 'Timeline' | 'Q&A' | 'Alerting')}
                className={`rounded-full border px-2.5 py-1 text-left hover:border-primary/35 hover:bg-primary/[0.04] ${priorityCommandLabel === item.label ? 'border-primary/30 bg-primary/[0.06]' : 'border-border/50 bg-surface-subtle/40'}`}
              >
                <span className="text-[10px] font-medium text-text-primary">{item.label}</span>
                {priorityCommandLabel === item.label && (
                  <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-primary/20 bg-white/80 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                    <span>Priority — {priorityCommandReason}{priorityCommandTargetReason ? ` ${priorityCommandTargetReason}` : ''}</span>
                    <span className="rounded-full border border-primary/15 bg-primary/[0.05] px-1.5 py-0.5">{priorityCommandCta}</span>
                  </span>
                )}
                <span className="mx-1 text-[10px] text-text-tertiary">·</span>
                <span className="text-[10px] text-text-secondary">{item.detail}</span>
              </button>
            ))}
          </div>
        </div>

        {coordinatorRole === 'planner' && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            Planner view is on — this workspace stays focused on live guest movement, timeline decisions, and day-of updates.
          </div>
        )}
        {coordinatorRole === 'viewer' && (
          <div className="rounded-lg border border-border/40 bg-surface-subtle px-3 py-2 text-xs text-text-tertiary">
            Viewer mode is on — timeline, check-in, alerts, and Q&A edits are turned off here.
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
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={checkInQuery}
                  onChange={(e) => setCheckInQuery(e.target.value)}
                  placeholder="Search guest name or RSVP status"
                />
                <select
                  value={checkInFilter}
                  onChange={(e) => { setCheckInFilter(e.target.value as CoordinatorCheckInFilter); setCheckInReviewOnly(false); setPanelFocus('check-in'); }}
                  className="sm:w-40 text-xs rounded-md border border-border bg-white px-2 py-2 text-text-secondary"
                >
                  <option value="arrivals">Arrivals</option>
                  <option value="checked-in">Checked in</option>
                  <option value="all">All guests</option>
                </select>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-auto divide-y divide-border-subtle/70">
              {checkInQueue.map((g) => {
                const doorStatus = getCoordinatorDoorStatus(g);
                return (
                  <div key={g.id} className={`flex items-center justify-between gap-3 px-4 py-2.5 ${activeGuestId === g.id ? 'bg-primary/5' : ''}`}>
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
                          onClick={() => escalateDoorReview(g)}
                          className="px-3 py-1.5 text-xs rounded-md border border-amber-200 text-amber-700 bg-amber-50"
                        >
                          Escalate
                        </button>
                      )}
                      <button
                        onClick={() => { setActiveGuestId(g.id); canCheckIn && void toggleCheckIn(g); }}
                        disabled={!canCheckIn || doorStatus === 'watch'}
                        className={`px-3 py-1.5 text-xs rounded-md border disabled:opacity-40 ${g.checked_in_at ? 'border-success/40 text-success bg-success/5' : doorStatus === 'watch' ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-border text-text-secondary bg-white'}`}
                      >
                        {g.checked_in_at ? getCoordinatorCheckInActionLabel(g) : doorStatus === 'watch' ? 'Review first' : getCoordinatorCheckInActionLabel(g)}
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
              <div className="space-y-2">
                {events.length === 0 ? (
                  <p className="text-xs text-text-tertiary">No itinerary events yet.</p>
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
                      <div key={e.id} className={`rounded-lg border px-3 py-2 ${activeTimelineEventId === e.id ? 'ring-2 ring-primary/10 ' : ''}${isLive ? 'border-primary/35 bg-primary/5' : isUpNext ? 'border-amber-200 bg-amber-50' : 'border-border/50 bg-surface-subtle/40'}`}>
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
                            onChange={(ev) => { if (canEditTimeline) { setActiveTimelineEventId(e.id); setTimelineState((prev) => setCoordinatorEventTimelineState(prev, e.id, ev.target.value as TimelineState)); } }}
                            disabled={!canEditTimeline}
                            className="text-[11px] rounded-md border border-border bg-white px-2 py-1 text-text-secondary disabled:opacity-40"
                          >
                            <option value="up-next">Up next</option>
                            <option value="live">Live</option>
                            <option value="done">Done</option>
                          </select>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <p className="text-xs text-text-tertiary">{e.start_time ? new Date(e.start_time).toLocaleString() : 'Time TBD'}</p>
                          <div className="flex items-center gap-2">
                            {correctionAction && (
                              <button
                                type="button"
                                disabled={!canEditTimeline}
                                onClick={() => runTimelineAction(e.id, correctionAction.nextState)}
                                className="text-[11px] px-2.5 py-1 rounded border border-amber-200 bg-amber-50 text-amber-700 disabled:opacity-40"
                              >
                                {correctionAction.label}
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={!canEditTimeline || !primaryAction.nextState}
                              onClick={() => runTimelineAction(e.id, primaryAction.nextState)}
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
                      onClick={() => {
                        setAlertForm((prev) => ({
                          ...prev,
                          subject: suggestion.subject,
                          body: suggestion.body,
                          audience: suggestion.audience,
                        }));
                        setLastAlertSuggestionKey(suggestion.key);
                      }}
                      className={`text-[11px] px-2 py-1 rounded-full border inline-flex items-center gap-1.5 ${suggestionState.isDraftMatch ? 'border-primary/35 bg-primary/10 text-primary' : suggestionState.isBoardTarget ? 'border-primary/25 bg-primary/5 text-primary hover:bg-primary/10' : 'border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary'}`}
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
                  onClick={() => setAlertForm((prev) => ({ ...prev, channel: 'sms', scheduleType: 'now' }))}
                  className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary"
                >
                  Text now
                </button>
                <button
                  type="button"
                  onClick={() => setAlertForm((prev) => ({ ...prev, channel: 'email', scheduleType: 'later' }))}
                  className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary"
                >
                  Schedule email
                </button>
                {alertStats.byAudience.map(([audience, count]) => (
                  <button
                    key={audience}
                    type="button"
                    onClick={() => setAlertForm((prev) => ({ ...prev, audience }))}
                    className="text-[11px] px-2 py-1 rounded-full border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary"
                  >
                    {audience} ({count})
                  </button>
                ))}
              </div>

              <fieldset disabled={!canSendAlerts} className="space-y-2.5">
                <Input
                  value={alertForm.subject}
                  onChange={(e) => setAlertForm((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="Message subject"
                />
                <Textarea
                  value={alertForm.body}
                  onChange={(e) => setAlertForm((prev) => ({ ...prev, body: e.target.value }))}
                  rows={3}
                  placeholder="Write the update you want guests to receive"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={alertForm.audience}
                    onChange={(e) => setAlertForm((prev) => ({ ...prev, audience: e.target.value }))}
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
                    onChange={(e) => setAlertForm((prev) => ({ ...prev, channel: e.target.value as 'email' | 'sms' }))}
                    className="text-xs rounded-md border border-border bg-white px-2 py-2 text-text-secondary"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={alertForm.scheduleType}
                    onChange={(e) => setAlertForm((prev) => ({ ...prev, scheduleType: (canScheduleAlerts ? e.target.value : 'now') as 'now' | 'later' }))}
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
                        onChange={(e) => setAlertForm((prev) => ({ ...prev, scheduleDate: e.target.value }))}
                        className="text-xs rounded-md border border-border bg-white px-2 py-2 text-text-secondary"
                      />
                      <input
                        type="time"
                        value={alertForm.scheduleTime}
                        onChange={(e) => setAlertForm((prev) => ({ ...prev, scheduleTime: e.target.value }))}
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
                            onClick={() => setAlertForm((prev) => applyCoordinatorAlertSuggestion({ form: prev, suggestion: preferredAlertSuggestion }))}
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
                  onClick={() => void sendDayOfAlert()}
                  disabled={alertBusy || !!alertValidationError}
                  className="w-full px-3 py-2 text-sm rounded-md border border-primary/30 bg-primary/10 text-primary disabled:opacity-50"
                >
                  {alertBusy ? 'Saving...' : alertForm.scheduleType === 'later' ? 'Schedule message' : 'Send message'}
                </button>
                {alertLog.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => setAlertChannelFilter('all')} className={`text-[11px] px-2 py-0.5 rounded-full border ${alertChannelFilter === 'all' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>All</button>
                      <button type="button" onClick={() => setAlertChannelFilter('email')} className={`text-[11px] px-2 py-0.5 rounded-full border ${alertChannelFilter === 'email' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>Email</button>
                      <button type="button" onClick={() => setAlertChannelFilter('sms')} className={`text-[11px] px-2 py-0.5 rounded-full border ${alertChannelFilter === 'sms' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>SMS</button>
                      <button type="button" onClick={() => setAlertTimingFilter('all')} className={`text-[11px] px-2 py-0.5 rounded-full border ${alertTimingFilter === 'all' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>Any time</button>
                      <button type="button" onClick={() => setAlertTimingFilter('now')} className={`text-[11px] px-2 py-0.5 rounded-full border ${alertTimingFilter === 'now' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>Send now</button>
                      <button type="button" onClick={() => setAlertTimingFilter('scheduled')} className={`text-[11px] px-2 py-0.5 rounded-full border ${alertTimingFilter === 'scheduled' ? 'border-primary/35 text-primary bg-primary/5' : 'border-border text-text-secondary bg-white'}`}>Scheduled</button>
                    </div>
                    {filteredAlertLog.slice(0, 4).map((item) => (
                      <div key={item.id} className="text-[11px] text-text-tertiary border border-border/50 rounded-md px-2 py-1.5">
                        {item.subject} · {item.channel.toUpperCase()} · {item.audience}{item.sendAt ? ` · Scheduled ${new Date(item.sendAt).toLocaleString()}` : ''}
                      </div>
                    ))}
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
              <div className="flex gap-2 mb-2">
                <Input
                  value={qnaInput}
                  onChange={(e) => setQnaInput(e.target.value)}
                  placeholder="Add a guest question"
                />
                <button onClick={addQnaItem} className="px-3 py-2 text-xs rounded-md border border-border bg-white text-text-secondary disabled:opacity-40">Add question</button>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-auto">
                {qnaItems.length === 0 ? (
                  <p className="text-xs text-text-tertiary">No guest questions yet.</p>
                ) : (
                  qnaItems.slice(0, 8).map((item) => (
                    <div key={item.id} className={`text-xs border rounded-md px-2.5 py-2 space-y-2 ${activeQnaId === item.id ? 'border-primary/40 ring-2 ring-primary/10 bg-primary/5' : 'border-border/50'}`}>
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
                        onChange={(e) => { setQnaDraftAnswers((prev) => ({ ...prev, [item.id]: e.target.value })); setActiveQnaId(item.id); }}
                        rows={2}
                        placeholder="Add the answer the coordinator should use"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={() => { setActiveQnaId(item.id); void saveQnaAnswer(item.id); }}
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
