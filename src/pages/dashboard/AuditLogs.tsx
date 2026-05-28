import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { formatAuditLogDateTime } from './auditLogTime';
import { AUDIT_LOGS_LOAD_RETRY_ERROR, mapLogViewerError } from './logViewerCopy';

interface GuestAuditRow {
  id: string;
  action: 'insert' | 'update' | 'delete';
  changed_at: string;
  changed_by: string | null;
  guest_id: string;
  guest_name?: string;
}

type GuestAuditSelectRow = {
  id: string;
  action: GuestAuditRow['action'];
  changed_at: string;
  changed_by: string | null;
  guest_id: string;
  guest?: {
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

const actionLabelMap: Record<GuestAuditRow['action'], string> = {
  insert: 'Guest record created',
  update: 'Guest record updated',
  delete: 'Guest record removed',
};

export const DashboardAuditLogs: React.FC = () => {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<GuestAuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<'all' | 'insert' | 'update' | 'delete'>('all');
  const [searchGuestId, setSearchGuestId] = useState('');

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
          .eq('id', (await resolveActiveSiteForUser(user.id))?.id ?? '')
          .maybeSingle();

        const siteId = (site as { id?: string } | null)?.id;
        if (!siteId) {
          if (mounted) setLogsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('guest_audit_logs')
          .select('id, action, changed_at, changed_by, guest_id, guest:guest_id(name, first_name, last_name)')
          .eq('wedding_site_id', siteId)
          .order('changed_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        if (mounted) {
          const normalized = ((data ?? []) as GuestAuditSelectRow[]).map((row) => ({
            id: row.id,
            action: row.action,
            changed_at: row.changed_at,
            changed_by: row.changed_by,
            guest_id: row.guest_id,
            guest_name: row.guest?.name || [row.guest?.first_name, row.guest?.last_name].filter(Boolean).join(' ') || undefined,
          })) as GuestAuditRow[];
          setRows(normalized);
        }
      } catch (err) {
        if (mounted) setError(mapLogViewerError(err, AUDIT_LOGS_LOAD_RETRY_ERROR));
      } finally {
        if (mounted) setLogsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const filteredRows = rows.filter((row) => {
    const actionOk = actionFilter === 'all' ? true : row.action === actionFilter;
    const guestOk = searchGuestId.trim().length === 0 ? true : row.guest_id.toLowerCase().includes(searchGuestId.trim().toLowerCase());
    return actionOk && guestOk;
  });

  return (
    <DashboardLayout currentPage="settings">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Audit logs</h1>
          <p className="mt-2 text-sm text-text-secondary">Guest audit trail v1. This is the first real product audit-log screen, separate from error logs.</p>
        </div>

        <Card padding="lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-tertiary mb-1">Action</label>
              <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value as 'all' | 'insert' | 'update' | 'delete')} className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary">
                <option value="all">All actions</option>
                <option value="insert">Insert</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-tertiary mb-1">Guest id search</label>
              <input value={searchGuestId} onChange={(e) => setSearchGuestId(e.target.value)} placeholder="Filter by guest id" className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary" />
            </div>
          </div>
        </Card>

        {loading || logsLoading ? (
          <Card padding="lg"><p className="text-sm text-text-secondary">Loading audit logs…</p></Card>
        ) : error ? (
          <Card padding="lg"><p className="text-sm text-error">{error}</p></Card>
        ) : filteredRows.length === 0 ? (
          <Card padding="lg"><p className="text-sm text-text-secondary">No guest audit activity yet.</p></Card>
        ) : (
          <Card padding="lg">
            <div className="space-y-3">
              {filteredRows.map((row) => (
                <div key={row.id} className="rounded-xl border border-border-subtle bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{actionLabelMap[row.action]}</p>
                      <p className="mt-1 text-xs text-text-secondary">{row.guest_name || `Guest ${row.guest_id}`}</p>
                      <p className="mt-1 text-xs text-text-secondary">{formatAuditLogDateTime(row.changed_at)} · actor {row.changed_by || 'unknown'}</p>
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
