import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { formatAuditLogDateTime } from './auditLogTime';
import type { AppActionAuditRow } from '../../lib/actionAudit';
import { loadDashboardAuditLogs, type GuestAuditRow } from './auditLogService';

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

function humanizeAuditArea(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return 'app';
  return trimmed.replace(/[-_]+/g, ' ');
}

const UUID_LIKE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

function sanitizeAuditText(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return UUID_LIKE.test(trimmed) ? fallback : trimmed;
}

function humanizeAuditActor(actor: string | null | undefined, currentUserId: string | null | undefined): string {
  const trimmed = actor?.trim();
  if (!trimmed) return 'System';
  if (currentUserId && trimmed === currentUserId) return 'You';
  if (UUID_LIKE.test(trimmed)) return 'Wedding team';
  if (/^someone$/i.test(trimmed)) return 'Wedding team';
  return trimmed;
}

export const DashboardAuditLogs: React.FC = () => {
  const { user, loading, isDemoMode } = useAuth();
  const [rows, setRows] = useState<GuestAuditRow[]>([]);
  const [actionRows, setActionRows] = useState<AppActionAuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<'all' | 'insert' | 'update' | 'delete' | 'app_action'>('all');
  const [searchText, setSearchText] = useState('');
  const previousUserIdRef = useRef<string | null>(null);
  const auditLogsRequestIdRef = useRef(0);

  const resetAuditLogsState = useCallback(() => {
    setRows([]);
    setActionRows([]);
    setError(null);
    setActionFilter('all');
    setSearchText('');
  }, []);

  useEffect(() => {
    let mounted = true;
    const requestId = ++auditLogsRequestIdRef.current;
    const isCurrentRequest = () => mounted && requestId === auditLogsRequestIdRef.current;
    (async () => {
      if (!user?.id) {
        if (isCurrentRequest()) {
          resetAuditLogsState();
          setLogsLoading(false);
        }
        return;
      }
      if (isDemoMode) {
        if (isCurrentRequest()) {
          resetAuditLogsState();
          setLogsLoading(false);
        }
        return;
      }
      try {
        setLogsLoading(true);
        setError(null);
        const { guestRows, actionRows: loadedActionRows } = await loadDashboardAuditLogs(user.id);
        if (isCurrentRequest()) {
          setRows(guestRows);
          setActionRows(loadedActionRows);
        }
      } catch {
        if (isCurrentRequest()) setError('Couldn’t load activity history right now.');
      } finally {
        if (isCurrentRequest()) setLogsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isDemoMode, resetAuditLogsState, user?.id]);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (previousUserIdRef.current && userId && previousUserIdRef.current !== userId) {
      resetAuditLogsState();
    }
    previousUserIdRef.current = userId;
  }, [resetAuditLogsState, user?.id]);

  const unifiedRows: UnifiedAuditRow[] = [
    ...rows.map((row): UnifiedAuditRow => ({
      id: row.id,
      kind: 'guest',
      createdAt: row.changed_at,
      title: actionLabelMap[row.action],
      detail: sanitizeAuditText(row.guest_name, 'Guest record'),
      actor: humanizeAuditActor(row.changed_by, user?.id),
      area: 'guests',
    })),
    ...actionRows.map((row): UnifiedAuditRow => ({
      id: row.id,
      kind: 'action',
      createdAt: row.created_at,
      title: appActionTitle(row),
      detail: sanitizeAuditText(
        row.target_label
          ? `${sanitizeAuditText(row.summary, 'Wedding tool change')} · ${sanitizeAuditText(row.target_label, 'Record')}`
          : row.summary,
        'Wedding tool change',
      ),
      actor: humanizeAuditActor(row.actor_user_id, user?.id),
      area: humanizeAuditArea(row.action_area),
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
  }, [actionFilter, actionRows, rows, searchText]);

  return (
    <DashboardLayout currentPage="activity">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Activity history</h1>
          <p className="mt-2 text-sm text-text-secondary">A private record of guest updates and important changes across your wedding tools.</p>
        </div>

        <Card padding="lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-tertiary mb-1">Change</label>
              <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value as 'all' | 'insert' | 'update' | 'delete' | 'app_action')} className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary">
                <option value="all">All changes</option>
                <option value="insert">Added</option>
                <option value="update">Updated</option>
                <option value="delete">Removed</option>
                <option value="app_action">Wedding tool changes</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-tertiary mb-1">Search</label>
              <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search by area, change, person, or detail" className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary" />
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
                <div key={row.id} className="rounded-[20px] border border-border-subtle bg-white px-4 py-3">
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
