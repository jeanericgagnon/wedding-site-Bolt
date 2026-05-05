import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { formatAuditLogDateTime } from './auditLogTime';
import { listAppActionAuditLogs, type AppActionAuditRow } from '../../lib/actionAudit';

interface GuestAuditRow {
  id: string;
  action: 'insert' | 'update' | 'delete';
  changed_at: string;
  changed_by: string | null;
  guest_id: string;
  guest_name?: string;
}

const actionLabelMap: Record<GuestAuditRow['action'], string> = {
  insert: 'Guest added',
  update: 'Guest updated',
  delete: 'Guest removed',
};

type UnifiedAuditRow =
  | { id: string; kind: 'guest'; createdAt: string; title: string; detail: string; actor: string | null; area: 'guests' }
  | { id: string; kind: 'action'; createdAt: string; title: string; detail: string; actor: string | null; area: string };

const appActionTitle = (row: AppActionAuditRow) => {
  const area = String(row.action_area || 'app').replace(/[-_]+/g, ' ');
  return `${area.charAt(0).toUpperCase()}${area.slice(1)} update`;
};

export const DashboardAuditLogs: React.FC = () => {
  const { user, loading, isDemoMode } = useAuth();
  const [rows, setRows] = useState<GuestAuditRow[]>([]);
  const [actionRows, setActionRows] = useState<AppActionAuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<'all' | 'insert' | 'update' | 'delete' | 'app_action'>('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.id) {
        if (mounted) setLogsLoading(false);
        return;
      }
      if (isDemoMode) {
        if (mounted) {
          setRows([]);
          setActionRows([]);
          setLogsLoading(false);
        }
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

        const [{ data, error }, actionLogs] = await Promise.all([
          supabase
          .from('guest_audit_logs')
          .select('id, action, changed_at, changed_by, guest_id')
          .eq('wedding_site_id', siteId)
          .order('changed_at', { ascending: false })
            .limit(50),
          listAppActionAuditLogs(siteId, 50),
        ]);

        if (error) throw error;
        const guestIds = Array.from(new Set((data ?? []).map((row: any) => row.guest_id).filter(Boolean)));
        const guestNames = new Map<string, string>();
        if (guestIds.length > 0) {
          const { data: guestRows } = await supabase
            .from('guests')
            .select('id, name, first_name, last_name')
            .in('id', guestIds);

          (guestRows ?? []).forEach((guest: any) => {
            const name = guest.name || [guest.first_name, guest.last_name].filter(Boolean).join(' ');
            if (name) guestNames.set(guest.id, name);
          });
        }
        if (mounted) {
          const normalized = (data ?? []).map((row: any) => ({
            id: row.id,
            action: row.action,
            changed_at: row.changed_at,
            changed_by: row.changed_by,
            guest_id: row.guest_id,
            guest_name: guestNames.get(row.guest_id),
          })) as GuestAuditRow[];
          setRows(normalized);
          setActionRows(actionLogs);
        }
      } catch {
        if (mounted) setError('Couldn’t load activity history right now.');
      } finally {
        if (mounted) setLogsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isDemoMode, user?.id]);

  const unifiedRows: UnifiedAuditRow[] = [
    ...rows.map((row): UnifiedAuditRow => ({
      id: row.id,
      kind: 'guest',
      createdAt: row.changed_at,
      title: actionLabelMap[row.action],
      detail: row.guest_name || `Guest ${row.guest_id}`,
      actor: row.changed_by,
      area: 'guests',
    })),
    ...actionRows.map((row): UnifiedAuditRow => ({
      id: row.id,
      kind: 'action',
      createdAt: row.created_at,
      title: appActionTitle(row),
      detail: row.target_label ? `${row.summary} · ${row.target_label}` : row.summary,
      actor: row.actor_user_id,
      area: row.action_area,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredRows = unifiedRows.filter((row) => {
    const actionOk = actionFilter === 'all'
      ? true
      : actionFilter === 'app_action'
        ? row.kind === 'action'
        : row.kind === 'guest' && rows.find((guestRow) => guestRow.id === row.id)?.action === actionFilter;
    const q = searchText.trim().toLowerCase();
    const searchOk = q.length === 0 ? true : [row.title, row.detail, row.actor, row.area].filter(Boolean).join(' ').toLowerCase().includes(q);
    return actionOk && searchOk;
  });

  return (
    <DashboardLayout currentPage="settings">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Activity history</h1>
          <p className="mt-2 text-sm text-text-secondary">A private record of guest updates and important changes across your wedding tools.</p>
        </div>

        <Card padding="lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-tertiary mb-1">Change</label>
              <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value as 'all' | 'insert' | 'update' | 'delete' | 'app_action')} className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary">
                <option value="all">All changes</option>
                <option value="insert">Added</option>
                <option value="update">Updated</option>
                <option value="delete">Removed</option>
                <option value="app_action">Wedding tool changes</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-tertiary mb-1">Search</label>
              <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search by area, change, person, or detail" className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary" />
            </div>
          </div>
        </Card>

        {loading || logsLoading ? (
          <Card padding="lg"><p className="text-sm text-text-secondary">Loading activity…</p></Card>
        ) : error ? (
          <Card padding="lg"><p className="text-sm text-error">{error}</p></Card>
        ) : filteredRows.length === 0 ? (
          <Card padding="lg"><p className="text-sm text-text-secondary">No activity yet.</p></Card>
        ) : (
          <Card padding="lg">
            <div className="space-y-3">
              {filteredRows.map((row) => (
                <div key={row.id} className="rounded-lg border border-border-subtle bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{row.title}</p>
                      <p className="mt-1 text-xs text-text-secondary">{row.detail}</p>
                      <p className="mt-1 text-xs text-text-secondary">{formatAuditLogDateTime(row.createdAt)} · {row.actor || 'Someone'} · {row.area}</p>
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
