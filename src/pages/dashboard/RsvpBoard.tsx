import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { useAuth } from '../../hooks/useAuth';
import { getRsvpFallbackState } from '../../lib/rsvpFallbackState';
import { getInviteLifecycleState } from '../../lib/inviteLifecycle';
import { getPerEventRsvpState } from '../../lib/perEventRsvpState';
import { isAttendingRsvpStatus, isDeclinedRsvpStatus, isPendingRsvpStatus } from '../../lib/rsvpStatus';
import { filterRsvpBoardRows, type RsvpBoardFilter } from './rsvpBoardFilter';

type GuestRow = {
  id: string;
  rsvp_status: 'pending' | 'confirmed' | 'declined' | string;
  invited_to_ceremony?: boolean;
  invited_to_reception?: boolean;
  invited_event_ids?: string[] | null;
  checked_in_at?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  invitation_sent_at?: string | null;
  reminder_last_sent_at?: string | null;
};

export const DashboardRsvpBoard: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [rows, setRows] = useState<GuestRow[]>([]);
  const [filter, setFilter] = useState<RsvpBoardFilter>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchBoard = async (resolvedSiteId?: string | null) => {
    const useSiteId = resolvedSiteId ?? siteId;
    if (!useSiteId) return;

    const { data, error } = await supabase
      .from('guests')
      .select('id, rsvp_status, invited_to_ceremony, invited_to_reception, checked_in_at, email, phone, notes, invitation_sent_at, reminder_last_sent_at')
      .eq('wedding_site_id', useSiteId);

    if (error) throw error;

    let invitedEventIdsByGuest = new Map<string, string[]>();

    const { data: events, error: eventsError } = await supabase
      .from('itinerary_events')
      .select('id')
      .eq('wedding_site_id', useSiteId);

    if (!eventsError) {
      const eventIds = ((events ?? []) as Array<{ id: string }>).map((event) => event.id);
      if (eventIds.length > 0) {
        const { data: invites, error: invitesError } = await supabase
          .from('event_invitations')
          .select('event_id, guest_id')
          .in('event_id', eventIds);

        if (!invitesError) {
          invitedEventIdsByGuest = ((invites ?? []) as Array<{ event_id: string; guest_id: string }>).reduce(
            (acc, invite) => {
              const current = acc.get(invite.guest_id) ?? [];
              current.push(invite.event_id);
              acc.set(invite.guest_id, current);
              return acc;
            },
            new Map<string, string[]>(),
          );
        }
      }
    }

    setRows(((data as GuestRow[]) || []).map((row) => ({
      ...row,
      invited_event_ids: invitedEventIdsByGuest.get(row.id) ?? [],
    })));
    setLastUpdated(new Date());
    setLoadError(null);
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (!user) return;
      try {
        setLoading(true);
        if (isDemoMode) {
          if (!mounted) return;
          setRows([
            { id: '1', rsvp_status: 'confirmed', invited_to_ceremony: true, invited_to_reception: true, checked_in_at: new Date().toISOString(), email: 'alex@example.com', phone: '555-111-1111', invitation_sent_at: new Date().toISOString() },
            { id: '2', rsvp_status: 'confirmed', invited_to_ceremony: true, invited_to_reception: false, checked_in_at: null, email: 'sam@example.com', phone: null, invitation_sent_at: new Date().toISOString(), reminder_last_sent_at: new Date().toISOString() },
            { id: '3', rsvp_status: 'pending', invited_to_ceremony: false, invited_to_reception: true, checked_in_at: null, email: null, phone: '555-222-2222', invitation_sent_at: new Date().toISOString() },
            { id: '4', rsvp_status: 'pending', invited_event_ids: ['welcome', 'brunch'], checked_in_at: null, email: null, phone: null, notes: '[Manual RSVP] waiting on parent callback' },
          ]);
          setLastUpdated(new Date());
          return;
        }

        const activeSite = await resolveActiveSiteForUser(user.id);
        const id = activeSite?.id ?? null;
        if (!mounted) return;
        setSiteId(id);
        if (id) await fetchBoard(id);
      } catch {
        if (mounted) {
          setRows([]);
          setLoadError('We could not load RSVP activity right now. Refresh or try again in a minute.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void init();
    return () => { mounted = false; };
  }, [user, isDemoMode]);

  useEffect(() => {
    if (loading) return;
    const timer = window.setInterval(() => {
      void fetchBoard().catch(() => {
        setLoadError('We could not refresh RSVP activity right now. The board will try again automatically.');
      });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loading, siteId]);

  const visibleRows = useMemo(() => filterRsvpBoardRows(rows, filter), [rows, filter]);

  const stats = useMemo(() => {
    const total = visibleRows.length;
    const confirmed = visibleRows.filter((r) => isAttendingRsvpStatus(r.rsvp_status)).length;
    const declined = visibleRows.filter((r) => isDeclinedRsvpStatus(r.rsvp_status)).length;
    const pending = visibleRows.filter((r) => isPendingRsvpStatus(r.rsvp_status)).length;
    const checkedIn = visibleRows.filter((r) => !!r.checked_in_at).length;
    const fallback = visibleRows.map((row) => getRsvpFallbackState({
      rsvpStatus: row.rsvp_status,
      hasEmail: Boolean(row.email),
      hasPhone: Boolean(row.phone),
      manualHandled: Boolean(row.notes?.toLowerCase().includes('[manual rsvp]')),
    }));
    const manualFollowUp = fallback.filter((item) => item.state === 'manual-follow-up').length;
    const manualHandled = fallback.filter((item) => item.state === 'manual-handled').length;
    const unreachable = fallback.filter((item) => item.state === 'unreachable').length;
    return { total, confirmed, declined, pending, checkedIn, manualFollowUp, manualHandled, unreachable };
  }, [visibleRows]);

  return (
    <DashboardLayout currentPage="guests">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="rounded-lg border border-border-subtle bg-white p-5">
          <h1 className="text-2xl font-semibold text-text-primary">Guest replies</h1>
          <p className="text-sm text-text-secondary mt-1">Refreshes every few moments so new replies are easy to spot while plans are changing.</p>
          {lastUpdated && (
            <p className="text-xs text-text-tertiary mt-2">Last refreshed: {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/dashboard/coordinator" className="rounded border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-primary/40 hover:text-primary">Open day-of view</Link>
            <Link to="/dashboard/guests" className="rounded border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-primary/40 hover:text-primary">Open guests</Link>
            <button onClick={() => setFilter((prev) => prev === 'pending' ? 'all' : 'pending')} className="rounded border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-primary/40 hover:text-primary">{filter === 'pending' ? 'Show everyone' : 'Show guests waiting to reply'}</button>
          </div>
          {loadError && (
            <div className="mt-3 rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-text-primary">
              {loadError}
            </div>
          )}
          <div className="mt-3 rounded-lg border border-border-subtle bg-surface-subtle/30 px-3 py-2 text-xs text-text-secondary">
            Helpful when some guests are invited to welcome events, brunch, or reception-only plans and need different follow-up.
          </div>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-3 py-2 text-xs text-text-secondary">
          Guests who need personal follow-up are kept separate from clean online replies, so your pending list stays easier to trust.
        </div>

        <div className="rounded-lg border border-border-subtle bg-white p-4">
          <p className="text-sm font-semibold text-text-primary">Replies by event</p>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
            {['Ceremony + reception', 'Ceremony only', 'Reception only'].map((label) => {
              const count = visibleRows.filter((row) => getPerEventRsvpState({ invitedToCeremony: row.invited_to_ceremony, invitedToReception: row.invited_to_reception, invitedEventIds: row.invited_event_ids }).summary === label).length;
              return <div key={label} className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-3 py-2"><p className="text-[11px] text-text-tertiary">{label}</p><p className="text-sm font-semibold text-text-primary">{loading ? '—' : count}</p></div>;
            })}
            <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-3 py-2"><p className="text-[11px] text-text-tertiary">Special event invites</p><p className="text-sm font-semibold text-text-primary">{loading ? '—' : visibleRows.filter((row) => (row.invited_event_ids?.length ?? 0) > 0).length}</p></div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Confirmed', value: stats.confirmed },
            { label: 'Pending', value: stats.pending },
            { label: 'Personal follow-up', value: stats.manualFollowUp },
            { label: 'Handled personally', value: stats.manualHandled },
            { label: 'Needs contact info', value: stats.unreachable },
            { label: 'Checked in', value: stats.checkedIn },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border-subtle bg-white p-4">
              <p className="text-xs text-text-tertiary">{item.label}</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">{loading ? '—' : item.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border-subtle bg-white p-4">
          <p className="text-sm font-semibold text-text-primary">Invitation progress</p>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
            {['not-invited', 'invited', 'reminded', 'manual-handled'].map((state) => {
              const count = visibleRows.filter((row) => getInviteLifecycleState({
                invitationSentAt: row.invitation_sent_at,
                reminderLastSentAt: row.reminder_last_sent_at,
                rsvpStatus: row.rsvp_status,
                manualHandled: Boolean(row.notes?.toLowerCase().includes('[manual rsvp]')),
              }).state === state).length;
              const label = state === 'not-invited'
                ? 'not sent yet'
                : state === 'manual-handled'
                  ? 'handled personally'
                  : state.replace(/-/g, ' ');
              return <div key={state} className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-3 py-2"><p className="text-[11px] text-text-tertiary">{label}</p><p className="text-sm font-semibold text-text-primary">{loading ? '—' : count}</p></div>;
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardRsvpBoard;
