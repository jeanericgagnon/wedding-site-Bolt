import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

type LookupRow = {
  guest_id: string;
  full_name: string;
  email: string | null;
  table_name: string;
  seat_index: number | null;
  checked_in_at: string | null;
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
          .eq('user_id', user.id)
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

        const { data: assignments } = await supabase
          .from('seating_assignments')
          .select('guest_id, seat_index, checked_in_at, seating_tables(table_name), guests(first_name,last_name,name,email)')
          .eq('seating_event_id', eventId)
          .order('updated_at', { ascending: false });

        const mapped: LookupRow[] = ((assignments || []) as any[]).map((a) => {
          const g = a.guests || {};
          const full_name = (g.first_name || g.last_name)
            ? `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim()
            : (g.name || 'Guest');
          return {
            guest_id: a.guest_id,
            full_name,
            email: g.email || null,
            table_name: a.seating_tables?.table_name || 'Unassigned',
            seat_index: a.seat_index ?? null,
            checked_in_at: a.checked_in_at ?? null,
          };
        });

        if (mounted) setRows(mapped);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => { mounted = false; };
  }, [user, isDemoMode]);

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
    <DashboardLayout currentPage="seating-lookup">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="rounded-2xl border border-border/40 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)] p-5">
          <h1 className="text-2xl font-semibold text-text-primary">Guest Seating Lookup</h1>
          <p className="text-sm text-text-secondary mt-1">Search guests quickly for table + seat assignment.</p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guest name, email, or table"
            className="mt-3 w-full px-3 py-2 border border-border rounded-lg bg-surface"
          />
        </div>

        <div className="rounded-2xl border border-border/35 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-subtle border-b border-border">
              <tr>
                <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide text-text-tertiary">Guest</th>
                <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide text-text-tertiary">Table</th>
                <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide text-text-tertiary">Seat</th>
                <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wide text-text-tertiary">Arrived</th>
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
                    <td className="px-4 py-2.5">{r.table_name}</td>
                    <td className="px-4 py-2.5">{r.seat_index ?? '—'}</td>
                    <td className="px-4 py-2.5">{r.checked_in_at ? 'Yes' : 'No'}</td>
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
