import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';

interface GuestAuditRow {
  id: string;
  action: 'insert' | 'update' | 'delete';
  changed_at: string;
  changed_by: string | null;
  guest_id: string;
}

export const DashboardAuditLogs: React.FC = () => {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<GuestAuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.id) {
        if (mounted) setLogsLoading(false);
        return;
      }
      try {
        const { data: site } = await supabase
          .from('wedding_sites')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        const siteId = (site as { id?: string } | null)?.id;
        if (!siteId) {
          if (mounted) setLogsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('guest_audit_logs')
          .select('id, action, changed_at, changed_by, guest_id')
          .eq('wedding_site_id', siteId)
          .order('changed_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        if (mounted) setRows((data ?? []) as GuestAuditRow[]);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Could not load audit logs.');
      } finally {
        if (mounted) setLogsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return (
    <DashboardLayout currentPage="settings">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Audit logs</h1>
          <p className="mt-2 text-sm text-text-secondary">Guest audit trail v1. This is the first real product audit-log screen, separate from error logs.</p>
        </div>

        {loading || logsLoading ? (
          <Card padding="lg"><p className="text-sm text-text-secondary">Loading audit logs…</p></Card>
        ) : error ? (
          <Card padding="lg"><p className="text-sm text-error">{error}</p></Card>
        ) : rows.length === 0 ? (
          <Card padding="lg"><p className="text-sm text-text-secondary">No guest audit activity yet.</p></Card>
        ) : (
          <Card padding="lg">
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.id} className="rounded-xl border border-border-subtle bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{row.action.toUpperCase()} · guest {row.guest_id}</p>
                      <p className="mt-1 text-xs text-text-secondary">{new Date(row.changed_at).toLocaleString()} · actor {row.changed_by || 'unknown'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardAuditLogs;
