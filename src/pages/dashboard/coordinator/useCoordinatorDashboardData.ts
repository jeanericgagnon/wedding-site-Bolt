import { useEffect, useState } from 'react';
import { readPlannerAccessRole, writePlannerAccessRole, type PlannerAccessRole, type PlannerPermissionKey } from '../../../lib/plannerAccess';
import type { GuestLiteForCoordinator } from '../../../lib/coordinatorTypes';
import type { AlertLog, EventLite, QnaItem, TimelineState } from './coordinatorDashboardTypes';
import {
  readStoredCoordinatorActiveWorkState,
  readStoredCoordinatorAlertIntentState,
  readStoredCoordinatorAlertLog,
  readStoredCoordinatorCommandState,
  readStoredCoordinatorDraftState,
  readStoredCoordinatorGuestWorkState,
  readStoredCoordinatorQnaItems,
  readStoredCoordinatorSessionState,
  readStoredCoordinatorTimelineState,
  readStoredCoordinatorTimelineWorkState,
  writeStoredCoordinatorActiveWorkState,
  writeStoredCoordinatorAlertIntentState,
  writeStoredCoordinatorAlertLog,
  writeStoredCoordinatorCommandState,
  writeStoredCoordinatorDraftState,
  writeStoredCoordinatorGuestWorkState,
  writeStoredCoordinatorQnaItems,
  writeStoredCoordinatorSessionState,
  writeStoredCoordinatorTimelineState,
  writeStoredCoordinatorTimelineWorkState,
} from './coordinatorStorage';
import { loadCoordinatorBootstrapData } from './coordinatorService';
import type { CoordinatorPanelFocus } from '../../../lib/coordinatorPanelFocus';
import type { CoordinatorCheckInFilter } from '../../../lib/coordinatorCheckInQueue';
import type { CoordinatorQnaFilter } from '../../../lib/coordinatorQnaTriage';

export function useCoordinatorDashboardData(args: {
  isDemoMode: boolean;
  toast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  userId: string | null | undefined;
}) {
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<GuestLiteForCoordinator[]>([]);
  const [events, setEvents] = useState<EventLite[]>([]);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [eventGuestIds, setEventGuestIds] = useState<Record<string, Set<string>>>({});
  const [eventSeatingConfiguredIds, setEventSeatingConfiguredIds] = useState<Set<string>>(new Set<string>());
  const [timelineState, setTimelineState] = useState<Record<string, TimelineState>>({});
  const [alertLog, setAlertLog] = useState<AlertLog[]>([]);
  const [qnaItems, setQnaItems] = useState<QnaItem[]>([]);
  const [coordinatorRole, setCoordinatorRole] = useState<PlannerAccessRole>('owner');
  const [activeSiteRole, setActiveSiteRole] = useState<PlannerAccessRole>('owner');
  const [coordinatorPermissions, setCoordinatorPermissions] = useState<PlannerPermissionKey[] | null>(null);
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
      if (!args.userId) return;
      setLoading(true);
      try {
        if (args.isDemoMode) {
          if (!mounted) return;
          const now = new Date().toISOString();
          setSiteId('demo-site');
          setActiveSiteRole('owner');
          setCoordinatorRole('owner');
          setGuests([
            {
              id: '1',
              first_name: 'Alex',
              last_name: 'Rivera',
              name: 'Alex Rivera',
              rsvp_status: 'confirmed',
              household_id: 'demo-household-1',
              checked_in_at: now,
              door_route: null,
              event_arrivals: {
                e1: { seating_event_id: 'demo-seating-1', table_name: 'Table 1', checked_in_at: now, is_seated: true },
              },
            },
            {
              id: '2',
              first_name: 'Sam',
              last_name: 'Lee',
              name: 'Sam Lee',
              rsvp_status: 'pending',
              household_id: 'demo-household-1',
              checked_in_at: null,
              door_route: null,
              event_arrivals: {
                e1: { seating_event_id: 'demo-seating-1', table_name: 'Unassigned', checked_in_at: null, is_seated: false },
              },
            },
          ]);
          setEvents([{ id: 'e1', event_name: 'Ceremony', start_time: now }]);
          setEventGuestIds({ e1: new Set(['1', '2']) });
          setEventSeatingConfiguredIds(new Set(['e1']));
          return;
        }

        const bootstrap = await loadCoordinatorBootstrapData(args.userId);
        if (!bootstrap.siteId) return;
        if (!mounted) return;
        const storedGuestWorkState = readStoredCoordinatorGuestWorkState(bootstrap.siteId);
        setSiteId(bootstrap.siteId);
        setActiveSiteRole(bootstrap.role);
        setCoordinatorRole(bootstrap.role);
        setCoordinatorPermissions(bootstrap.permissions);
        setGuests(bootstrap.guests.map((guest) => ({
          ...guest,
          door_route: storedGuestWorkState.doorRoutesByGuestId[guest.id] ?? guest.door_route ?? null,
        })));
        setEvents(bootstrap.events);
        setEventGuestIds(bootstrap.eventGuestIds);
        setEventSeatingConfiguredIds(bootstrap.eventSeatingConfiguredIds);
        setActiveGuestId(storedGuestWorkState.activeGuestId);
        const cachedQna = readStoredCoordinatorQnaItems(bootstrap.siteId);
        if (bootstrap.qnaItems.length > 0) {
          setQnaItems(bootstrap.qnaItems);
        } else if (cachedQna.length > 0) {
          setQnaItems(cachedQna);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [args.isDemoMode, args.userId]);

  useEffect(() => {
    if (!siteId) return;
    try {
      const storedTimelineState = readStoredCoordinatorTimelineState(siteId);
      if (Object.keys(storedTimelineState).length > 0) setTimelineState(storedTimelineState);
      const storedAlertLog = readStoredCoordinatorAlertLog(siteId);
      if (storedAlertLog.length > 0) setAlertLog(storedAlertLog);
      const storedQnaItems = readStoredCoordinatorQnaItems(siteId);
      if (storedQnaItems.length > 0) {
        setQnaItems(storedQnaItems);
      } else if (args.isDemoMode) {
        setQnaItems([
          { id: 'q1', question: 'What time should we arrive?', status: 'new' },
          { id: 'q2', question: 'Is parking available at the venue?', status: 'answered' },
        ]);
      }
      const storedRole = readPlannerAccessRole('coordinator', siteId);
      if (activeSiteRole === 'owner' && storedRole) setCoordinatorRole(storedRole);
      if (activeSiteRole !== 'owner') setCoordinatorRole(activeSiteRole);

      const sessionState = readStoredCoordinatorSessionState(siteId);
      setCheckInFilter(sessionState.checkInFilter);
      setCheckInQuery(sessionState.checkInQuery);
      setCheckInReviewOnly(sessionState.checkInReviewOnly);
      setPanelFocus(sessionState.panelFocus);
      setAlertChannelFilter(sessionState.alertChannelFilter);
      setAlertTimingFilter(sessionState.alertTimingFilter);

      const draftState = readStoredCoordinatorDraftState(siteId);
      setAlertForm((prev) => ({ ...prev, ...draftState.alertForm }));
      setQnaDraftAnswers(draftState.qnaDraftAnswers);
      setQnaInput(draftState.qnaInput);

      const activeWorkState = readStoredCoordinatorActiveWorkState(siteId);
      setActiveQnaId(activeWorkState.activeQnaId);

      const guestWorkState = readStoredCoordinatorGuestWorkState(siteId);
      setActiveGuestId(guestWorkState.activeGuestId);
      const timelineWorkState = readStoredCoordinatorTimelineWorkState(siteId);
      setActiveTimelineEventId(timelineWorkState.activeTimelineEventId);

      const savedCommandState = readStoredCoordinatorCommandState(siteId);
      setCommandSource(savedCommandState.source);

      const alertIntentState = readStoredCoordinatorAlertIntentState(siteId);
      setLastAlertSuggestionKey(alertIntentState.lastSuggestionKey);
    } catch {
      args.toast('Couldn’t restore coordinator state right now.', 'warning');
    }
  }, [siteId, activeSiteRole, args.isDemoMode, args.toast]);

  useEffect(() => {
    if (!siteId) return;
    writeStoredCoordinatorTimelineState(siteId, timelineState);
  }, [siteId, timelineState]);

  useEffect(() => {
    if (!siteId) return;
    writeStoredCoordinatorAlertLog(siteId, alertLog);
  }, [siteId, alertLog]);

  useEffect(() => {
    if (!siteId) return;
    writeStoredCoordinatorQnaItems(siteId, qnaItems);
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
    writeStoredCoordinatorSessionState(siteId, {
      checkInFilter,
      checkInQuery,
      checkInReviewOnly,
      panelFocus,
      alertChannelFilter,
      alertTimingFilter,
    });
  }, [siteId, checkInFilter, checkInQuery, checkInReviewOnly, panelFocus, alertChannelFilter, alertTimingFilter]);

  useEffect(() => {
    if (!siteId) return;
    writeStoredCoordinatorDraftState(siteId, {
      alertForm,
      qnaDraftAnswers,
      qnaInput,
    });
  }, [siteId, alertForm, qnaDraftAnswers, qnaInput]);

  useEffect(() => {
    if (!siteId) return;
    writeStoredCoordinatorActiveWorkState(siteId, { activeQnaId });
  }, [siteId, activeQnaId]);

  useEffect(() => {
    if (!siteId) return;
    writeStoredCoordinatorGuestWorkState(siteId, {
      activeGuestId,
      doorRoutesByGuestId: Object.fromEntries(
        guests
          .filter((guest) => guest.door_route)
          .map((guest) => [guest.id, guest.door_route!]),
      ),
    });
  }, [siteId, activeGuestId, guests]);

  useEffect(() => {
    if (!siteId) return;
    writeStoredCoordinatorTimelineWorkState(siteId, { activeTimelineEventId });
  }, [siteId, activeTimelineEventId]);

  useEffect(() => {
    if (!activeTimelineEventId) return;
    if (events.some((event) => event.id === activeTimelineEventId)) return;
    setActiveTimelineEventId(null);
  }, [events, activeTimelineEventId]);

  useEffect(() => {
    if (!siteId) return;
    writeStoredCoordinatorCommandState(siteId, {
      source: commandSource,
      panelFocus,
      checkInFilter,
      checkInReviewOnly,
    });
  }, [siteId, commandSource, panelFocus, checkInFilter, checkInReviewOnly]);

  useEffect(() => {
    if (!siteId) return;
    writeStoredCoordinatorAlertIntentState(siteId, { lastSuggestionKey: lastAlertSuggestionKey });
  }, [siteId, lastAlertSuggestionKey]);

  return {
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
    eventSeatingConfiguredIds,
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
  };
}
