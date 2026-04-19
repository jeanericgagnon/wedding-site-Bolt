import React, { useEffect, useMemo, useState } from 'react';
import { Input, Textarea } from '../../components/ui';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { PLANNER_ROLE_OPTIONS, derivePlannerRoleFromPermissions, readPlannerAccessRole, writePlannerAccessRole, type PlannerAccessRole } from '../../lib/plannerAccess';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { isAttendingRsvpStatus, isPendingRsvpStatus } from '../../lib/rsvpStatus';
import { useToast } from '../../components/ui/Toast';
import { filterCoordinatorCheckInQueue, type CoordinatorCheckInFilter } from '../../lib/coordinatorCheckInQueue';
import { canManageCoordinatorCheckIn, canManageCoordinatorQna, canManageCoordinatorTimeline, canScheduleCoordinatorAlerts, canSendImmediateCoordinatorAlerts } from '../../lib/coordinatorRoleAccess';
import type { GuestLiteForCoordinator } from '../../lib/coordinatorTypes';
import { normalizeCoordinatorAlertLog, normalizeCoordinatorQnaItems, normalizeCoordinatorTimelineState } from '../../lib/coordinatorModePersistence';
import { setCoordinatorEventTimelineState } from '../../lib/coordinatorTimelineState';
import { appendCoordinatorAlertLogItem, resolveCoordinatorScheduledFor, validateCoordinatorAlertForm } from '../../lib/coordinatorAlertFlow';
import { getCoordinatorQnaCounts, updateCoordinatorQnaItem } from '../../lib/coordinatorQnaFlow';


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
  const [alertChannelFilter, setAlertChannelFilter] = useState<'all' | 'email' | 'sms'>('all');
  const [alertTimingFilter, setAlertTimingFilter] = useState<'all' | 'now' | 'scheduled'>('all');
  const [qnaInput, setQnaInput] = useState('');
  const [qnaDraftAnswers, setQnaDraftAnswers] = useState<Record<string, string>>({});
  const [checkInQuery, setCheckInQuery] = useState('');
  const [checkInFilter, setCheckInFilter] = useState<CoordinatorCheckInFilter>('arrivals');
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
          setGuests([
            { id: '1', first_name: 'Alex', last_name: 'Rivera', name: 'Alex Rivera', rsvp_status: 'confirmed', checked_in_at: new Date().toISOString() },
            { id: '2', first_name: 'Sam', last_name: 'Lee', name: 'Sam Lee', rsvp_status: 'pending', checked_in_at: null },
          ]);
          setEvents([{ id: 'e1', event_name: 'Ceremony', start_time: new Date().toISOString() }]);
          setEventGuestIds({ e1: new Set(['1', '2']) });
          return;
        }

        const activeSite = await resolveActiveSiteForUser(user.id);
        const resolvedSiteId = activeSite?.id ?? null;
        if (!resolvedSiteId) return;
        if (!mounted) return;
        setSiteId(resolvedSiteId);

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
      const rawRole = localStorage.getItem(`dayof.coordinator.role.${siteId}`) as PlannerAccessRole | null;
      if (rawRole === 'owner' || rawRole === 'planner' || rawRole === 'coordinator' || rawRole === 'viewer') setCoordinatorRole(rawRole);
    } catch {}
  }, [siteId]);

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
    try {
      writePlannerAccessRole('coordinator', siteId, coordinatorRole);
    } catch {
      // noop
    }
  }, [siteId, coordinatorRole]);

  const stats = useMemo(() => {
    const total = guests.length;
    const confirmed = guests.filter((g) => isAttendingRsvpStatus(g.rsvp_status)).length;
    const pending = guests.filter((g) => isPendingRsvpStatus(g.rsvp_status)).length;
    const checkedIn = guests.filter((g) => !!g.checked_in_at).length;
    return { total, confirmed, pending, checkedIn };
  }, [guests]);

  const toggleCheckIn = async (guest: GuestLiteForCoordinator) => {
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

  const alertValidationError = useMemo(() => validateCoordinatorAlertForm(alertForm, alertAudienceCount), [alertForm, alertAudienceCount]);
  const handoffCopy = {
    title: coordinatorRole === 'viewer' ? 'Viewer handoff' : coordinatorRole === 'coordinator' ? 'Coordinator handoff' : 'Planner handoff',
    detail: coordinatorRole === 'viewer'
      ? 'Use this board for visibility only and escalate changes to the active operator.'
      : coordinatorRole === 'coordinator'
        ? 'Keep live updates moving and flag anything sensitive back to the couple.'
        : 'Run the room, keep communications aligned, and escalate only the decisions that need the couple.'
  };

  const liveEventAudience = useMemo(() => {
    const live = events.find((e) => (timelineState[e.id] || 'up-next') === 'live');
    return live ? `event:${live.id}` : null;
  }, [events, timelineState]);

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


  const nextArrivals = useMemo(() => sortedGuests.filter((g) => !g.checked_in_at).slice(0, 5), [sortedGuests]);

  const checkInQueue = useMemo(() => filterCoordinatorCheckInQueue(sortedGuests, checkInQuery, checkInFilter), [sortedGuests, checkInQuery, checkInFilter]);

  const liveIssues = useMemo(() => {
    const items: Array<{ title: string; detail: string; tone: 'warning' | 'success' | 'neutral' }> = [];
    if (stats.pending > 0) items.push({ title: 'Pending RSVPs still open', detail: `${stats.pending} guest${stats.pending === 1 ? '' : 's'} still have not replied.`, tone: 'warning' });
    if (events.length > 0 && !events.some((e) => (timelineState[e.id] || 'up-next') === 'live')) items.push({ title: 'No event marked live', detail: 'Pick the event currently happening so updates and focus stay aligned.', tone: 'warning' });
    if (qnaItems.some((item) => item.status === 'new')) {
      const open = qnaItems.filter((item) => item.status === 'new').length;
      items.push({ title: 'Guest questions waiting', detail: `${open} question${open === 1 ? '' : 's'} still need an answer.`, tone: 'warning' });
    }
    if (items.length === 0) items.push({ title: 'Ops board looks calm', detail: 'No urgent coordinator flags right now.', tone: 'success' });
    return items.slice(0, 3);
  }, [stats.pending, events, timelineState, qnaItems]);

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
      toast(scheduledFor ? 'Coordinator alert scheduled.' : 'Coordinator alert queued.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not queue that alert right now.', 'error');
    } finally {
      setAlertBusy(false);
    }
  };

  const addQnaItem = async () => {
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

  const saveQnaAnswer = async (id: string) => {
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
              className="px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary"
            >
              {PLANNER_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
              {checkInQueue.length === 0 && <div className="px-4 py-6 text-sm text-text-tertiary">No guests match this live queue view.</div>}
            </select>
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
            <p className="text-sm font-medium text-text-primary mb-2">Live priorities</p>
            <p className="text-[11px] text-text-tertiary mb-2">This is the planner's at-a-glance board for what needs attention right now.</p>
            <div className="space-y-2">
              {liveIssues.map((item) => (
                <div key={item.title} className={`rounded-lg border px-3 py-2 ${item.tone === 'warning' ? 'border-amber-200 bg-amber-50' : item.tone === 'success' ? 'border-emerald-200 bg-emerald-50' : 'border-border/50 bg-surface-subtle/40'}`}>
                  <p className="text-sm font-medium text-text-primary">{item.title}</p>
                  <p className="mt-1 text-xs text-text-secondary">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-border/50 bg-surface-subtle/30 px-3 py-2">
              <p className="text-xs font-medium text-text-primary">Next arrivals</p>
              {nextArrivals.length === 0 ? (
                <p className="mt-1 text-xs text-text-tertiary">Everyone currently in this view is already checked in.</p>
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
          <div className="lg:col-span-2 rounded-2xl border border-border/35 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)] overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">Check-in queue</p>
                  <p className="text-[11px] text-text-tertiary">Search arrivals fast and keep the live line moving.</p>
                </div>
                <p className="text-[11px] text-text-tertiary">{checkInQueue.length} shown</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={checkInQuery}
                  onChange={(e) => setCheckInQuery(e.target.value)}
                  placeholder="Search guest name or RSVP status"
                />
                <select
                  value={checkInFilter}
                  onChange={(e) => setCheckInFilter(e.target.value as CoordinatorCheckInFilter)}
                  className="sm:w-40 text-xs rounded-md border border-border bg-white px-2 py-2 text-text-secondary"
                >
                  <option value="arrivals">Arrivals</option>
                  <option value="checked-in">Checked in</option>
                  <option value="all">All guests</option>
                </select>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-auto divide-y divide-border-subtle/70">
              {checkInQueue.map((g) => (
                <div key={g.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{g.name}</p>
                    <p className="text-xs text-text-tertiary">{g.rsvp_status}</p>
                  </div>
                  <button
                    onClick={() => canCheckIn && void toggleCheckIn(g)}
                    disabled={!canCheckIn}
                    className={`px-3 py-1.5 text-xs rounded-md border disabled:opacity-40 ${g.checked_in_at ? 'border-success/40 text-success bg-success/5' : 'border-border text-text-secondary bg-white'}`}
                  >
                    {g.checked_in_at ? 'Checked in' : 'Check in'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/35 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)] p-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-text-primary mb-2">Run-of-show timeline</p>
              <div className="space-y-2">
                {events.length === 0 ? (
                  <p className="text-xs text-text-tertiary">No itinerary events yet.</p>
                ) : (
                  events.map((e) => {
                    const state = timelineState[e.id] || 'up-next';
                    return (
                      <div key={e.id} className="rounded-lg border border-border/50 bg-surface-subtle/40 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-text-primary">{e.event_name}</p>
                          <select
                            value={state}
                            onChange={(ev) => canEditTimeline && setTimelineState((prev) => setCoordinatorEventTimelineState(prev, e.id, ev.target.value as TimelineState))}
                            disabled={!canEditTimeline}
                            className="text-[11px] rounded-md border border-border bg-white px-2 py-1 text-text-secondary disabled:opacity-40"
                          >
                            <option value="up-next">Up next</option>
                            <option value="live">Live</option>
                            <option value="done">Done</option>
                          </select>
                        </div>
                        <p className="text-xs text-text-tertiary">{e.start_time ? new Date(e.start_time).toLocaleString() : 'Time TBD'}</p>
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
                {liveEventAudience && (
                  <button
                    type="button"
                    onClick={() => setAlertForm((prev) => ({ ...prev, audience: liveEventAudience }))}
                    className="text-[11px] px-2 py-1 rounded-full border border-primary/25 bg-primary/5 text-primary hover:bg-primary/10"
                  >
                    Message live event
                  </button>
                )}
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
                <p className="text-[11px] text-text-tertiary">This will go to {alertAudienceCount} recipient{alertAudienceCount === 1 ? '' : 's'}{alertForm.scheduleType === 'later' && canScheduleAlerts ? ' at the scheduled time' : ''}.</p>
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
                <p className="text-sm font-medium text-text-primary">Guest questions</p>
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
                    <div key={item.id} className="text-xs border border-border/50 rounded-md px-2.5 py-2 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-text-secondary">{item.question}</span>
                        <span className={`px-2 py-0.5 rounded border whitespace-nowrap ${item.status === 'answered' ? 'text-success border-success/35 bg-success/5' : 'text-warning border-warning/35 bg-warning/5'}`}>
                          {item.status === 'answered' ? 'Answered' : 'New'}
                        </span>
                      </div>
                      <Textarea
                        value={qnaDraftAnswers[item.id] ?? item.answer ?? ''}
                        onChange={(e) => setQnaDraftAnswers((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        rows={2}
                        placeholder="Add the answer the coordinator should use"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={() => void saveQnaAnswer(item.id)}
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
