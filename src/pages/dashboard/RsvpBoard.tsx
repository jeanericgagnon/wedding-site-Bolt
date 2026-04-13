import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { getRsvpFallbackState } from '../../lib/rsvpFallbackState';

type GuestRow = {
  id: string;
  rsvp_status: 'pending' | 'confirmed' | 'declined' | string;
  checked_in_at?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
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
      .select('id, rsvp_status, checked_in_at, email, phone, notes')
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
            { id: '1', rsvp_status: 'confirmed', checked_in_at: new Date().toISOString(), email: 'alex@example.com', phone: '555-111-1111' },
            { id: '2', rsvp_status: 'confirmed', checked_in_at: null, email: 'sam@example.com', phone: null },
            { id: '3', rsvp_status: 'pending', checked_in_at: null, email: null, phone: '555-222-2222' },
            { id: '4', rsvp_status: 'pending', checked_in_at: null, email: null, phone: null, notes: '[Manual RSVP] waiting on parent callback' },
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
    const fallback = rows.map((row) => getRsvpFallbackState({
      rsvpStatus: row.rsvp_status,
      hasEmail: Boolean(row.email),
      hasPhone: Boolean(row.phone),
      manualHandled: Boolean(row.notes?.toLowerCase().includes('[manual rsvp]')),
    }));
    const manualFollowUp = fallback.filter((item) => item.state === 'manual-follow-up').length;
    const manualHandled = fallback.filter((item) => item.state === 'manual-handled').length;
    const unreachable = fallback.filter((item) => item.state === 'unreachable').length;
    return { total, confirmed, declined, pending, checkedIn, manualFollowUp, manualHandled, unreachable };
  }, [rows]);

  return (
    <DashboardLayout currentPage="guests">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="rounded-2xl border border-border/40 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)] p-5">
          <h1 className="text-2xl font-semibold text-text-primary">Live RSVP view</h1>
          <p className="text-sm text-text-secondary mt-1">Auto-refreshes every 15 seconds so you can keep an eye on guest replies in real time.</p>
          {lastUpdated && (
            <p className="text-xs text-text-tertiary mt-2">Last refreshed: {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/dashboard/coordinator" className="rounded border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-primary/40 hover:text-primary">Open coordinator mode</Link>
            <Link to="/dashboard/guests" className="rounded border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-primary/40 hover:text-primary">Open guest ops</Link>
          </div>
        </div>

        <div className="rounded-xl border border-border/35 bg-surface-subtle/30 px-3 py-2 text-xs text-text-secondary">
          Fallback states are now tracked separately so pending guests who need offline help do not get mixed together with clean digital replies.
        </div>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Confirmed', value: stats.confirmed },
            { label: 'Pending', value: stats.pending },
            { label: 'Manual follow-up', value: stats.manualFollowUp },
            { label: 'Handled manually', value: stats.manualHandled },
            { label: 'No contact path', value: stats.unreachable },
            { label: 'Checked in', value: stats.checkedIn },
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
