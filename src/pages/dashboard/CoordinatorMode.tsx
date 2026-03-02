import React, { useEffect, useMemo, useState } from 'react';
import { Input, Textarea } from '../../components/ui';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

type GuestLite = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
  rsvp_status: string;
  checked_in_at?: string | null;
};

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
};

type QnaItem = {
  id: string;
  question: string;
  status: 'new' | 'answered';
};

export const DashboardCoordinatorMode: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<GuestLite[]>([]);
  const [events, setEvents] = useState<EventLite[]>([]);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [timelineState, setTimelineState] = useState<Record<string, TimelineState>>({});
  const [alertLog, setAlertLog] = useState<AlertLog[]>([]);
  const [alertBusy, setAlertBusy] = useState(false);
  const [qnaItems, setQnaItems] = useState<QnaItem[]>([]);
  const [qnaInput, setQnaInput] = useState('');
  const [alertForm, setAlertForm] = useState({
    subject: 'Day-of update',
    body: 'Quick update from the couple: ',
    audience: 'all',
    channel: 'email' as 'email' | 'sms',
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
          return;
        }

        const { data: site } = await supabase.from('wedding_sites').select('id').eq('user_id', user.id).maybeSingle();
        const resolvedSiteId = (site?.id as string | null) ?? null;
        if (!resolvedSiteId) return;
        if (!mounted) return;
        setSiteId(resolvedSiteId);

        const [{ data: guestsData }, { data: eventsData }] = await Promise.all([
          supabase.from('guests').select('id, first_name, last_name, name, rsvp_status, checked_in_at').eq('wedding_site_id', resolvedSiteId),
          supabase.from('itinerary_events').select('id, event_name, start_time').eq('wedding_site_id', resolvedSiteId).order('start_time', { ascending: true }),
        ]);

        if (!mounted) return;
        setGuests((guestsData as GuestLite[]) || []);
        setEvents((eventsData as EventLite[]) || []);
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
      if (rawTimeline) setTimelineState(JSON.parse(rawTimeline) as Record<string, TimelineState>);
      const rawAlerts = localStorage.getItem(`dayof.alertlog.${siteId}`);
      if (rawAlerts) setAlertLog(JSON.parse(rawAlerts) as AlertLog[]);
      const rawQna = localStorage.getItem(`dayof.qna.${siteId}`);
      if (rawQna) setQnaItems(JSON.parse(rawQna) as QnaItem[]);
      else setQnaItems([
        { id: 'q1', question: 'What time should we arrive?', status: 'new' },
        { id: 'q2', question: 'Is parking available at the venue?', status: 'answered' },
      ]);
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
    if (!siteId) return;
    try { localStorage.setItem(`dayof.qna.${siteId}`, JSON.stringify(qnaItems)); } catch {}
  }, [siteId, qnaItems]);

  const stats = useMemo(() => {
    const total = guests.length;
    const confirmed = guests.filter((g) => g.rsvp_status === 'confirmed').length;
    const pending = guests.filter((g) => g.rsvp_status === 'pending').length;
    const checkedIn = guests.filter((g) => !!g.checked_in_at).length;
    return { total, confirmed, pending, checkedIn };
  }, [guests]);

  const toggleCheckIn = async (guest: GuestLite) => {
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

  const alertAudienceCount = (() => {
    if (alertForm.audience === 'checked-in') return guests.filter((g) => !!g.checked_in_at).length;
    if (alertForm.audience === 'pending') return guests.filter((g) => g.rsvp_status === 'pending').length;
    return guests.length;
  })();

  const sendDayOfAlert = async () => {
    if (!siteId || !alertForm.subject.trim() || !alertForm.body.trim()) return;
    setAlertBusy(true);
    try {
      if (!isDemoMode) {
        await supabase.from('messages').insert({
          wedding_site_id: siteId,
          subject: alertForm.subject.trim(),
          body: alertForm.body.trim(),
          channel: alertForm.channel,
          audience_filter: alertForm.audience,
          recipient_filter: { audience: alertForm.audience, recipient_count: alertAudienceCount },
          status: 'queued',
          sent_at: new Date().toISOString(),
        });
      }

      setAlertLog((prev) => [{
        id: `${Date.now()}`,
        subject: alertForm.subject.trim(),
        audience: alertForm.audience,
        channel: alertForm.channel,
        queuedAt: new Date().toISOString(),
      }, ...prev].slice(0, 8));
    } finally {
      setAlertBusy(false);
    }
  };

  const addQnaItem = () => {
    const q = qnaInput.trim();
    if (!q) return;
    setQnaItems((prev) => [{ id: `${Date.now()}`, question: q, status: 'new' as const }, ...prev].slice(0, 30));
    setQnaInput('');
  };

  const toggleQnaStatus = (id: string) => {
    setQnaItems((prev) => prev.map((item) => item.id === id ? { ...item, status: item.status === 'new' ? 'answered' : 'new' } : item));
  };

  return (
    <DashboardLayout currentPage="coordinator-mode">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="rounded-2xl border border-border/35 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)] p-5">
          <h1 className="text-2xl font-semibold text-text-primary">Coordinator Mode</h1>
          <p className="text-sm text-text-secondary mt-1">Event-day command center for check-in + status tracking.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl border border-border/35 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)] overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 text-sm font-medium text-text-primary">Check-in Queue</div>
            <div className="max-h-[60vh] overflow-auto divide-y divide-border-subtle/70">
              {sortedGuests.map((g) => (
                <div key={g.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{g.name}</p>
                    <p className="text-xs text-text-tertiary">{g.rsvp_status}</p>
                  </div>
                  <button
                    onClick={() => void toggleCheckIn(g)}
                    className={`px-3 py-1.5 text-xs rounded-md border ${g.checked_in_at ? 'border-success/40 text-success bg-success/5' : 'border-border text-text-secondary bg-white'}`}
                  >
                    {g.checked_in_at ? 'Checked in' : 'Check in'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/35 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)] p-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-text-primary mb-2">Run-of-show Timeline</p>
              <div className="space-y-2">
                {events.length === 0 ? (
                  <p className="text-xs text-text-tertiary">No events yet.</p>
                ) : (
                  events.map((e) => {
                    const state = timelineState[e.id] || 'up-next';
                    return (
                      <div key={e.id} className="rounded-lg border border-border/50 bg-surface-subtle/40 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-text-primary">{e.event_name}</p>
                          <select
                            value={state}
                            onChange={(ev) => setTimelineState((prev) => ({ ...prev, [e.id]: ev.target.value as TimelineState }))}
                            className="text-[11px] rounded-md border border-border bg-white px-2 py-1 text-text-secondary"
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
              <p className="text-sm font-medium text-text-primary mb-2">Day-of Alert</p>
              <div className="space-y-2.5">
                <Input
                  value={alertForm.subject}
                  onChange={(e) => setAlertForm((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="Alert subject"
                />
                <Textarea
                  value={alertForm.body}
                  onChange={(e) => setAlertForm((prev) => ({ ...prev, body: e.target.value }))}
                  rows={3}
                  placeholder="Write an alert to guests"
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
                <p className="text-[11px] text-text-tertiary">Will queue to {alertAudienceCount} recipient{alertAudienceCount === 1 ? '' : 's'}.</p>
                <button
                  onClick={() => void sendDayOfAlert()}
                  disabled={alertBusy || !alertForm.subject.trim() || !alertForm.body.trim() || alertAudienceCount === 0}
                  className="w-full px-3 py-2 text-sm rounded-md border border-primary/30 bg-primary/10 text-primary disabled:opacity-50"
                >
                  {alertBusy ? 'Queueing...' : 'Queue day-of alert'}
                </button>
                {alertLog.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    {alertLog.slice(0, 3).map((item) => (
                      <div key={item.id} className="text-[11px] text-text-tertiary border border-border/50 rounded-md px-2 py-1.5">
                        {item.subject} · {item.channel.toUpperCase()} · {item.audience}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border/60 pt-3">
              <p className="text-sm font-medium text-text-primary mb-2">Q&A Board (Ops)</p>
              <div className="flex gap-2 mb-2">
                <Input
                  value={qnaInput}
                  onChange={(e) => setQnaInput(e.target.value)}
                  placeholder="Add a guest question"
                />
                <button onClick={addQnaItem} className="px-3 py-2 text-xs rounded-md border border-border bg-white text-text-secondary">Add</button>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-auto">
                {qnaItems.length === 0 ? (
                  <p className="text-xs text-text-tertiary">No questions yet.</p>
                ) : (
                  qnaItems.slice(0, 8).map((item) => (
                    <div key={item.id} className="text-xs border border-border/50 rounded-md px-2 py-1.5 flex items-center justify-between gap-2">
                      <span className="text-text-secondary truncate">{item.question}</span>
                      <button
                        onClick={() => toggleQnaStatus(item.id)}
                        className={`px-2 py-0.5 rounded border ${item.status === 'answered' ? 'text-success border-success/35 bg-success/5' : 'text-warning border-warning/35 bg-warning/5'}`}
                      >
                        {item.status === 'answered' ? 'Answered' : 'New'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardCoordinatorMode;
