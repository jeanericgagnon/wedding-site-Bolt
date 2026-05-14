import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { buildGuestPreviewRoutes } from '../../lib/guestPreviewRoutes';
import { useAuth } from '../../hooks/useAuth';
import { getCheckInExceptionLabel, getCheckInExceptionStates } from '../../lib/checkInExceptionState';
import { resolveOperationalEventId } from '../../lib/operationalEvent';
import { getWeddingSiteId, loadItineraryEvents, loadSeatingLookupRowsForUser, type ItineraryEvent, type SeatingLookupRow } from './seating/seatingService';

export const DashboardSeatingLookup: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SeatingLookupRow[]>([]);
  const [itineraryEvents, setItineraryEvents] = useState<ItineraryEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!user) return;
      try {
        setLoading(true);
        if (isDemoMode) {
          if (!mounted) return;
          const demoEvents = [{ id: 'event-1', event_name: 'Reception', event_date: '2026-05-13', start_time: '18:00:00', location_name: 'Main Hall' }] as ItineraryEvent[];
          setItineraryEvents(demoEvents);
          setSelectedEventId(resolveOperationalEventId({ events: demoEvents }));
          setRows([
            { itinerary_event_id: 'event-1', event_name: 'Reception', guest_id: '1', full_name: 'Alex Rivera', email: 'alex@example.com', table_name: 'Table 1', seat_index: 2, checked_in_at: null },
            { itinerary_event_id: 'event-1', event_name: 'Reception', guest_id: '2', full_name: 'Sam Lee', email: 'sam@example.com', table_name: 'Table 2', seat_index: 4, checked_in_at: new Date().toISOString() },
          ]);
          setLoading(false);
          return;
        }

        const siteId = await getWeddingSiteId();
        if (!siteId) {
          if (mounted) {
            setRows([]);
            setItineraryEvents([]);
            setSelectedEventId(null);
          }
          return;
        }
        const events = await loadItineraryEvents(siteId);
        if (mounted) {
          setItineraryEvents(events);
          setSelectedEventId(resolveOperationalEventId({ events }));
        }
      } catch {
        if (mounted) setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => { mounted = false; };
  }, [user, isDemoMode]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!user || isDemoMode || !selectedEventId) return;
      try {
        setLoading(true);
        const mapped = await loadSeatingLookupRowsForUser(user.id, selectedEventId);
        if (mounted) setRows(mapped);
      } catch {
        if (mounted) setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => { mounted = false; };
  }, [user, isDemoMode, selectedEventId]);

  const stats = useMemo(() => {
    const assigned = rows.filter((row) => row.table_name !== 'Unassigned').length;
    const arrived = rows.filter((row) => !!row.checked_in_at).length;
    const missingSeat = rows.filter((row) => row.table_name !== 'Unassigned' && row.seat_index == null).length;
    return { total: rows.length, assigned, arrived, missingSeat };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.full_name.toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q) ||
      r.table_name.toLowerCase().includes(q)
    );
  }, [rows, query]);
  const selectedEvent = itineraryEvents.find((event) => event.id === selectedEventId) ?? null;

  return (
    <DashboardLayout currentPage="seating">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="rounded-lg border border-border-subtle bg-white p-5">
          <h1 className="text-2xl font-semibold text-text-primary">Find a guest seat</h1>
          <p className="text-sm text-text-secondary mt-1">Search a guest’s table and seat when someone asks.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/dashboard/seating" className="rounded border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-primary/40 hover:text-primary">Seating chart</Link>
            <Link to="/dashboard/coordinator" className="rounded border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-primary/40 hover:text-primary">Day-of view</Link>
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-3 py-2">
              <p className="text-[11px] text-text-tertiary">Guests listed</p>
              <p className="text-sm font-semibold text-text-primary">{loading ? '—' : stats.total}</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-3 py-2">
              <p className="text-[11px] text-text-tertiary">At a table</p>
              <p className="text-sm font-semibold text-text-primary">{loading ? '—' : stats.assigned}</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-3 py-2">
              <p className="text-[11px] text-text-tertiary">Checked in</p>
              <p className="text-sm font-semibold text-text-primary">{loading ? '—' : stats.arrived}</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-3 py-2">
              <p className="text-[11px] text-text-tertiary">Needs seat</p>
              <p className="text-sm font-semibold text-text-primary">{loading ? '—' : stats.missingSeat}</p>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-2 text-[11px] text-text-secondary">
            Search a guest, answer table and seat questions, then jump back into seating or day-of view if something changes.
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-[11px] text-text-primary">
              Data is for <span className="font-semibold">{selectedEvent?.event_name ?? 'the selected event'}</span>. Keep this matched to the live or next event so rehearsal and reception seating do not get mixed.
            </div>
            <select
              value={selectedEventId ?? ''}
              onChange={(event) => setSelectedEventId(event.target.value || null)}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary"
            >
              {itineraryEvents.map((event) => (
                <option key={event.id} value={event.id}>{event.event_name}</option>
              ))}
            </select>
          </div>

          <div className="mt-3 rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-[11px] text-text-primary">
            For arrival questions, use day-of view. For table changes, open seating. This page stays focused on quick answers.
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guest name, email, or table"
            className="mt-3 w-full px-3 py-2 border border-border rounded-lg bg-surface"
          />
        </div>

        <div className="overflow-hidden rounded-lg border border-border-subtle bg-white">
          <table className="w-full text-sm">
            <thead className="bg-surface-subtle border-b border-border">
              <tr>
                <th className="text-left px-4 py-2 text-[11px] text-text-tertiary">Guest</th>
                <th className="text-left px-4 py-2 text-[11px] text-text-tertiary">Table</th>
                <th className="text-left px-4 py-2 text-[11px] text-text-tertiary">Seat</th>
                <th className="text-left px-4 py-2 text-[11px] text-text-tertiary">Arrived</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-4 text-text-tertiary" colSpan={4}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="px-4 py-4 text-text-tertiary" colSpan={4}>No guests found.</td></tr>
              ) : (
                filtered.map((r) => {
                  const guestPreviewRoutes = buildGuestPreviewRoutes({
                    guestId: r.guest_id,
                    inviteToken: r.invite_token ?? null,
                    preferredLanguage: r.preferred_language ?? null,
                  });
                  const guestViewHref = guestPreviewRoutes.primaryHref;
                  return (
                  <tr key={r.guest_id} className="border-b border-border-subtle/70">
                    <td className="px-4 py-2.5">
                      <p className="text-sm font-medium text-text-primary">{r.full_name}</p>
                      <p className="text-xs text-text-tertiary">{r.email || '—'}</p>
                      {guestViewHref && (
                        <button
                          type="button"
                          onClick={() => window.open(guestViewHref, '_blank', 'noopener,noreferrer')}
                          className="mt-1 text-[11px] text-primary hover:underline"
                        >
                          Guest view
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col">
                        <span className="text-text-primary">{r.table_name}</span>
                        {r.table_name === 'Unassigned' && <span className="text-[11px] text-primary">Needs placement</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">{r.seat_index != null ? `Seat ${r.seat_index}` : '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="space-y-1">
                        <div>{r.checked_in_at ? 'Yes' : 'No'}</div>
                        {(() => {
                          const states = getCheckInExceptionStates({ checkedInAt: r.checked_in_at, rsvpStatus: r.rsvp_status, tableName: r.table_name });
                          return states.length ? <div className="flex flex-wrap gap-1">{states.map((state) => <span key={state} className="inline-flex items-center rounded-lg border border-border-subtle bg-surface-subtle px-2 py-0.5 text-[10px] font-medium text-text-primary">{getCheckInExceptionLabel(state)}</span>)}</div> : null;
                        })()}
                        {(() => {
                          const states = getCheckInExceptionStates({ checkedInAt: r.checked_in_at, rsvpStatus: r.rsvp_status, tableName: r.table_name });
                          if (!states.length) return null;
                          return <div className="flex flex-wrap gap-2 pt-1">
                            <Link to="/dashboard/coordinator" className="text-[11px] text-primary hover:underline">Day-of view</Link>
                            <Link to="/dashboard/seating" className="text-[11px] text-primary hover:underline">Open seating</Link>
                          </div>;
                        })()}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardSeatingLookup;
