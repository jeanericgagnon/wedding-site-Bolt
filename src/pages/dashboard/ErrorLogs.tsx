import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Link } from 'react-router-dom';

interface ErrorLogRow {
  id: string;
  created_at: string;
  source: string;
  severity: string;
  route: string | null;
  message: string;
  fingerprint: string | null;
}

interface GroupedError {
  fingerprint: string;
  count: number;
  latestAt: string;
  sampleMessage: string;
  severity: string;
}

export const DashboardErrorLogs: React.FC = () => {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<ErrorLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [routeFilter, setRouteFilter] = useState('all');
  const [datePreset, setDatePreset] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.id) {
        if (mounted) {
          setIsAdmin(false);
          setLogsLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        setError(error.message);
        setLogsLoading(false);
        return;
      }

      setIsAdmin(!!data);
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!isAdmin) {
      setLogsLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('app_error_logs')
          .select('id, created_at, source, severity, route, message, fingerprint')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        if (mounted) setRows((data ?? []) as ErrorLogRow[]);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Couldn’t load error logs right now.');
      } finally {
        if (mounted) setLogsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const severityOk = severityFilter === 'all' ? true : row.severity === severityFilter;
    const routeOk = routeFilter === 'all' ? true : (row.route || '—') === routeFilter;
    const now = Date.now();
    const rowTs = new Date(row.created_at).getTime();
    const dateOk = datePreset === 'all'
      ? true
      : datePreset === '24h'
        ? rowTs >= now - 24 * 60 * 60 * 1000
        : datePreset === '7d'
          ? rowTs >= now - 7 * 24 * 60 * 60 * 1000
          : rowTs >= now - 30 * 24 * 60 * 60 * 1000;
    const q = searchQuery.trim().toLowerCase();
    const searchOk = q.length === 0
      ? true
      : (row.message || '').toLowerCase().includes(q)
        || (row.source || '').toLowerCase().includes(q)
        || (row.route || '').toLowerCase().includes(q)
        || (row.fingerprint || '').toLowerCase().includes(q);
    return severityOk && routeOk && dateOk && searchOk;
  }), [rows, severityFilter, routeFilter, datePreset, searchQuery]);

  const routeOptions = useMemo(() => {
    const values = new Set<string>();
    for (const r of rows) values.add(r.route || '—');
    return ['all', ...Array.from(values).sort()];
  }, [rows]);

  const exportFilteredCsv = () => {
    const header = ['created_at', 'severity', 'source', 'route', 'message', 'fingerprint'];
    const rowsCsv = filteredRows.map((r) => [
      r.created_at,
      r.severity,
      r.source,
      r.route || '',
      r.message,
      r.fingerprint || '',
    ]);
    const esc = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [header, ...rowsCsv].map((line) => line.map((v) => esc(String(v))).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${datePreset}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const grouped = useMemo<GroupedError[]>(() => {
    const map = new Map<string, GroupedError>();
    for (const row of filteredRows) {
      const key = row.fingerprint || `no-fp:${row.message.slice(0, 80)}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          fingerprint: key,
          count: 1,
          latestAt: row.created_at,
          sampleMessage: row.message,
          severity: row.severity,
        });
      } else {
        existing.count += 1;
        if (new Date(row.created_at).getTime() > new Date(existing.latestAt).getTime()) {
          existing.latestAt = row.created_at;
        }
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [filteredRows]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Card padding="lg"><p className="text-sm text-text-secondary">Checking access…</p></Card>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto">
          <Card padding="lg">
            <h1 className="text-xl font-semibold text-text-primary mb-2">Restricted</h1>
            <p className="text-sm text-text-secondary mb-4">This admin page is available only to the designated admin account.</p>
            <Link to="/dashboard/overview" className="text-sm text-primary hover:text-primary-hover">Back to dashboard</Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1">Admin · Error Logs</h1>
          <p className="text-text-secondary">Recent app issues captured from the live client.</p>
        </div>

        {logsLoading ? (
          <Card padding="lg">
            <p className="text-sm text-text-secondary">Loading logs…</p>
          </Card>
        ) : error ? (
          <Card padding="lg">
            <p className="text-sm text-error">{error}</p>
          </Card>
        ) : rows.length === 0 ? (
          <Card padding="lg">
            <p className="text-sm text-text-secondary">No recent errors found.</p>
          </Card>
        ) : (
          <>
            <Card variant="bordered" padding="lg" className="space-y-3">
              <div className="flex flex-wrap gap-2 items-end">
                <label className="text-xs text-text-secondary">
                  Search
                  <input
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    placeholder="Message, route, source, fingerprint"
                    className="ml-2 px-2 py-1 border border-border rounded-md text-xs bg-white w-64 max-w-full"
                  />
                </label>
                <label className="text-xs text-text-secondary">
                  Time range
                  <select
                    value={datePreset}
                    onChange={(e) => setDatePreset(e.target.value as '24h' | '7d' | '30d' | 'all')}
                    className="ml-2 px-2 py-1 border border-border rounded-md text-xs bg-white"
                  >
                    <option value="24h">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="all">All time</option>
                  </select>
                </label>
                <label className="text-xs text-text-secondary">
                  Severity
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value as 'all' | 'error' | 'warning' | 'info')}
                    className="ml-2 px-2 py-1 border border-border rounded-md text-xs bg-white"
                  >
                    <option value="all">All</option>
                    <option value="error">Error</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                  </select>
                </label>
                <label className="text-xs text-text-secondary">
                  Route
                  <select
                    value={routeFilter}
                    onChange={(e) => setRouteFilter(e.target.value)}
                    className="ml-2 px-2 py-1 border border-border rounded-md text-xs bg-white"
                  >
                    {routeOptions.map((r) => (
                      <option key={r} value={r}>{r === 'all' ? 'All routes' : r}</option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={exportFilteredCsv}
                  className="px-3 py-1.5 text-xs border border-border rounded-md bg-white hover:bg-surface-subtle"
                >
                  Export CSV
                </button>
              </div>

              <h2 className="text-sm font-semibold text-text-primary mb-2">Top recurring errors</h2>
              <div className="space-y-2">
                {grouped.map((g) => (
                  <div key={g.fingerprint} className="flex items-start justify-between gap-3 text-sm border-b border-border-subtle last:border-0 pb-2 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-text-primary truncate">{g.sampleMessage}</p>
                      <p className="text-xs text-text-tertiary">Latest: {new Date(g.latestAt).toLocaleString()}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full border border-border-subtle bg-surface-subtle whitespace-nowrap">{g.count}x</span>
                  </div>
                ))}
              </div>
            </Card>

              <Card variant="bordered" padding="none" className="overflow-auto">
              <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-surface-subtle text-text-secondary">
                <tr>
                  <th className="text-left px-3 py-2">Time</th>
                  <th className="text-left px-3 py-2">Severity</th>
                  <th className="text-left px-3 py-2">Source</th>
                  <th className="text-left px-3 py-2">Route</th>
                  <th className="text-left px-3 py-2">Message</th>
                  <th className="text-left px-3 py-2">Fingerprint</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((r) => (
                  <tr key={r.id} className="border-t border-border-subtle align-top">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2">{r.severity}</td>
                    <td className="px-3 py-2">{r.source}</td>
                    <td className="px-3 py-2">{r.route || '—'}</td>
                    <td className="px-3 py-2 max-w-[420px] break-words">{r.message}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.fingerprint || '—'}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </Card>

            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>Showing {pagedRows.length} of {filteredRows.length}</span>
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 border border-border rounded-md disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span>Page {page} / {totalPages}</span>
                <button
                  className="px-2 py-1 border border-border rounded-md disabled:opacity-50"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
