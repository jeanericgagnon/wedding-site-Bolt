import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { getCheckInExceptionStates } from '../../lib/checkInExceptionState';

type LookupRow = {
  guest_id: string;
  full_name: string;
  email: string | null;
  table_name: string;
  seat_index: number | null;
  checked_in_at: string | null;
  rsvp_status?: string | null;
};

type SeatingLookupGuest = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  email: string | null;
  rsvp_status: string | null;
};

export const DashboardSeatingLookup: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LookupRow[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!user) return;
      try {
        setLoading(true);
        if (isDemoMode) {
          if (!mounted) return;
          setRows([
            { guest_id: '1', full_name: 'Alex Rivera', email: 'alex@example.com', table_name: 'Table 1', seat_index: 2, checked_in_at: null },
            { guest_id: '2', full_name: 'Sam Lee', email: 'sam@example.com', table_name: 'Table 2', seat_index: 4, checked_in_at: new Date().toISOString() },
          ]);
          return;
        }

        const { data: site } = await supabase
          .from('wedding_sites')
          .select('id')
          .eq('id', (await resolveActiveSiteForUser(user.id))?.id ?? '')
          .maybeSingle();
        const siteId = site?.id as string | undefined;
        if (!siteId) return;

        const { data: event } = await supabase
          .from('seating_events')
          .select('id')
          .eq('wedding_site_id', siteId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const eventId = event?.id as string | undefined;
        if (!eventId) {
          if (mounted) setRows([]);
          return;
        }

        const { data: assignments, error: assignmentsError } = await supabase
          .from('seating_assignments')
          .select('guest_id, table_id, seat_index, checked_in_at, is_valid')
          .eq('seating_event_id', eventId)
          .eq('is_valid', true)
          .order('updated_at', { ascending: false });
        if (assignmentsError) throw assignmentsError;

        const assignmentRows = (assignments || []) as Array<{
          guest_id: string;
          table_id: string | null;
          seat_index: number | null;
          checked_in_at: string | null;
        }>;
        const tableIds = [...new Set(assignmentRows.map((row) => row.table_id).filter((id): id is string => Boolean(id)))];
        const guestIds = [...new Set(assignmentRows.map((row) => row.guest_id).filter(Boolean))];

        const [tablesResult, guestsResult] = await Promise.all([
          tableIds.length > 0
            ? supabase.from('seating_tables').select('id, table_name').in('id', tableIds)
            : Promise.resolve({ data: [], error: null }),
          guestIds.length > 0
            ? supabase.from('guests').select('id, first_name, last_name, name, email, rsvp_status').in('id', guestIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (tablesResult.error) throw tablesResult.error;
        if (guestsResult.error) throw guestsResult.error;

        const tableNameById = new Map(((tablesResult.data || []) as Array<{ id: string; table_name: string | null }>).map((table) => [table.id, table.table_name || 'Unassigned']));
        const guestById = new Map(((guestsResult.data || []) as SeatingLookupGuest[]).map((guest) => [guest.id, guest]));

        const mapped: LookupRow[] = assignmentRows.map((a) => {
          const g = guestById.get(a.guest_id) ?? null;
          const full_name = (g?.first_name || g?.last_name)
            ? `${g?.first_name ?? ''} ${g?.last_name ?? ''}`.trim()
            : (g?.name || 'Guest');
          return {
            guest_id: a.guest_id,
            full_name,
            email: g?.email || null,
            table_name: a.table_id ? (tableNameById.get(a.table_id) || 'Unassigned') : 'Unassigned',
            seat_index: a.seat_index ?? null,
            checked_in_at: a.checked_in_at ?? null,
            rsvp_status: g?.rsvp_status ?? null,
          };
        });

        if (mounted) setRows(mapped);
      } catch {
        if (mounted) setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => { mounted = false; };
  }, [user, isDemoMode]);

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

  return (
    <DashboardLayout currentPage="seating">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="rounded-lg border border-border-subtle bg-white p-5">
          <h1 className="text-2xl font-semibold text-text-primary">Find a guest seat</h1>
          <p className="text-sm text-text-secondary mt-1">Search a guest’s table and seat when someone asks.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/dashboard/seating" className="rounded border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-primary/40 hover:text-primary">Open seating chart</Link>
            <Link to="/dashboard/coordinator" className="rounded border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-primary/40 hover:text-primary">Open day-of view</Link>
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
                filtered.map((r) => (
                  <tr key={r.guest_id} className="border-b border-border-subtle/70">
                    <td className="px-4 py-2.5">
                      <p className="text-sm font-medium text-text-primary">{r.full_name}</p>
                      <p className="text-xs text-text-tertiary">{r.email || '—'}</p>
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
                          return states.length ? <div className="flex flex-wrap gap-1">{states.map((state) => <span key={state} className="inline-flex items-center rounded-lg border border-border-subtle bg-surface-subtle px-2 py-0.5 text-[10px] font-medium text-text-primary">{state}</span>)}</div> : null;
                        })()}
                        {(() => {
                          const states = getCheckInExceptionStates({ checkedInAt: r.checked_in_at, rsvpStatus: r.rsvp_status, tableName: r.table_name });
                          if (!states.length) return null;
                          return <div className="flex flex-wrap gap-2 pt-1">
                            <Link to="/dashboard/coordinator" className="text-[11px] text-primary hover:underline">Open day-of view</Link>
                            <Link to="/dashboard/seating" className="text-[11px] text-primary hover:underline">Open seating</Link>
                          </div>;
                        })()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardSeatingLookup;
