import React, { useEffect, useMemo, useState } from 'react';
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

export const DashboardCoordinatorMode: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<GuestLite[]>([]);
  const [events, setEvents] = useState<EventLite[]>([]);
  const [siteId, setSiteId] = useState<string | null>(null);

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

          <div className="rounded-2xl border border-border/35 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)] p-4">
            <p className="text-sm font-medium text-text-primary mb-2">Today’s Timeline</p>
            <div className="space-y-2">
              {events.length === 0 ? (
                <p className="text-xs text-text-tertiary">No events yet.</p>
              ) : (
                events.map((e) => (
                  <div key={e.id} className="rounded-lg border border-border/50 bg-surface-subtle/40 px-3 py-2">
                    <p className="text-sm text-text-primary">{e.event_name}</p>
                    <p className="text-xs text-text-tertiary">{e.start_time ? new Date(e.start_time).toLocaleString() : 'Time TBD'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardCoordinatorMode;
