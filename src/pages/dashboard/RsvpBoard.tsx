import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

type GuestRow = {
  id: string;
  rsvp_status: 'pending' | 'confirmed' | 'declined' | string;
  checked_in_at?: string | null;
};

export const DashboardRsvpBoard: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [rows, setRows] = useState<GuestRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchBoard = async (resolvedSiteId?: string | null) => {
    const useSiteId = resolvedSiteId ?? siteId;
    if (!useSiteId) return;

    const { data, error } = await supabase
      .from('guests')
      .select('id, rsvp_status, checked_in_at')
      .eq('wedding_site_id', useSiteId);

    if (error) throw error;
    setRows((data as GuestRow[]) || []);
    setLastUpdated(new Date());
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
            { id: '1', rsvp_status: 'confirmed', checked_in_at: new Date().toISOString() },
            { id: '2', rsvp_status: 'confirmed', checked_in_at: null },
            { id: '3', rsvp_status: 'pending', checked_in_at: null },
            { id: '4', rsvp_status: 'declined', checked_in_at: null },
          ]);
          setLastUpdated(new Date());
          return;
        }

        const { data: site } = await supabase
          .from('wedding_sites')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        const id = (site?.id as string | null) ?? null;
        if (!mounted) return;
        setSiteId(id);
        if (id) await fetchBoard(id);
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
      void fetchBoard();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loading, siteId]);

  const stats = useMemo(() => {
    const total = rows.length;
    const confirmed = rows.filter((r) => r.rsvp_status === 'confirmed').length;
    const declined = rows.filter((r) => r.rsvp_status === 'declined').length;
    const pending = rows.filter((r) => r.rsvp_status === 'pending').length;
    const checkedIn = rows.filter((r) => !!r.checked_in_at).length;
    return { total, confirmed, declined, pending, checkedIn };
  }, [rows]);

  return (
    <DashboardLayout currentPage="guests">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="rounded-2xl border border-border/40 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)] p-5">
          <h1 className="text-2xl font-semibold text-text-primary">Live RSVP Status Board</h1>
          <p className="text-sm text-text-secondary mt-1">Auto-refreshes every 15 seconds for event-day monitoring.</p>
          {lastUpdated && (
            <p className="text-xs text-text-tertiary mt-2">Last updated: {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Confirmed', value: stats.confirmed },
            { label: 'Pending', value: stats.pending },
            { label: 'Declined', value: stats.declined },
            { label: 'Checked In', value: stats.checkedIn },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border/35 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)] p-4">
              <p className="text-xs text-text-tertiary uppercase tracking-wide">{item.label}</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">{loading ? '—' : item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardRsvpBoard;
