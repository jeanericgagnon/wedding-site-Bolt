import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Link } from 'react-router-dom';
import { formatErrorLogDateTime, getErrorLogTimestamp } from './errorLogTime';
import { copyTextOrDownload } from '../../lib/copyText';
import { isErrorLogAdmin, loadDashboardErrorLogs, type ErrorLogRow } from './errorLogService';

interface GroupedError {
  fingerprint: string;
  count: number;
  latestAt: string;
  sampleMessage: string;
  severity: string;
}

export const DashboardErrorLogs: React.FC = () => {
  const { user, loading, isDemoMode } = useAuth();
  const [rows, setRows] = useState<ErrorLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [routeFilter, setRouteFilter] = useState('all');
  const [datePreset, setDatePreset] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [fingerprintFilter, setFingerprintFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<{ key: string; state: 'copying' | 'copied' | 'downloaded' | 'error' } | null>(null);
  const copyStatusTimeoutRef = useRef<number | null>(null);
  const previousUserIdRef = useRef<string | null>(null);
  const adminCheckRequestIdRef = useRef(0);
  const errorLogsRequestIdRef = useRef(0);
  const copyStatusRequestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const resetErrorLogsState = useCallback(() => {
    copyStatusRequestIdRef.current += 1;
    setRows([]);
    setError(null);
    setIsAdmin(false);
    setAdminCheckComplete(false);
    setSeverityFilter('all');
    setRouteFilter('all');
    setDatePreset('7d');
    setFingerprintFilter('all');
    setSearchQuery('');
    setPage(1);
    setExpandedId(null);
    setCopyStatus(null);
  }, []);

  useEffect(() => () => {
    mountedRef.current = false;
    copyStatusRequestIdRef.current += 1;
    if (copyStatusTimeoutRef.current) window.clearTimeout(copyStatusTimeoutRef.current);
  }, []);

  useEffect(() => {
    let mounted = true;
    const requestId = ++adminCheckRequestIdRef.current;
    const isCurrentRequest = () => mounted && requestId === adminCheckRequestIdRef.current;
    (async () => {
      if (!user?.id) {
        if (isCurrentRequest()) {
          resetErrorLogsState();
          setLogsLoading(false);
        }
        return;
      }
      if (isDemoMode) {
        if (isCurrentRequest()) {
          resetErrorLogsState();
          setLogsLoading(false);
        }
        return;
      }

      try {
        setLogsLoading(true);
        setAdminCheckComplete(false);
        setError(null);
        const admin = await isErrorLogAdmin(user.id);
        if (!isCurrentRequest()) return;
        setIsAdmin(admin);
        setAdminCheckComplete(true);
      } catch {
        if (!isCurrentRequest()) return;
        resetErrorLogsState();
        setError('Couldn’t verify error-log access right now.');
        setLogsLoading(false);
        return;
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isDemoMode, resetErrorLogsState, user?.id]);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (previousUserIdRef.current && userId && previousUserIdRef.current !== userId) {
      resetErrorLogsState();
    }
    previousUserIdRef.current = userId;
  }, [resetErrorLogsState, user?.id]);

  useEffect(() => {
    if (!adminCheckComplete) return;
    if (!isAdmin) {
      errorLogsRequestIdRef.current += 1;
      copyStatusRequestIdRef.current += 1;
      setRows([]);
      setExpandedId(null);
      setCopyStatus(null);
      setLogsLoading(false);
      return;
    }

    let mounted = true;
    const requestId = ++errorLogsRequestIdRef.current;
    const isCurrentRequest = () => mounted && requestId === errorLogsRequestIdRef.current;
    (async () => {
      try {
        setLogsLoading(true);
        setError(null);
        const logs = await loadDashboardErrorLogs();
        if (isCurrentRequest()) setRows(logs);
      } catch {
        if (isCurrentRequest()) setError('Couldn’t load error logs right now.');
      } finally {
        if (isCurrentRequest()) setLogsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [adminCheckComplete, isAdmin]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const severityOk = severityFilter === 'all' ? true : row.severity === severityFilter;
    const routeOk = routeFilter === 'all' ? true : (row.route || '—') === routeFilter;
    const now = Date.now();
    const rowTs = getErrorLogTimestamp(row.created_at);
    const dateOk = datePreset === 'all'
      ? true
      : datePreset === '24h'
        ? rowTs >= now - 24 * 60 * 60 * 1000
        : datePreset === '7d'
          ? rowTs >= now - 7 * 24 * 60 * 60 * 1000
          : rowTs >= now - 30 * 24 * 60 * 60 * 1000;
    const fingerprintOk = fingerprintFilter === 'all' ? true : (row.fingerprint || 'none') === fingerprintFilter;
    const q = searchQuery.trim().toLowerCase();
    const searchOk = q.length === 0
      ? true
      : (row.message || '').toLowerCase().includes(q)
        || (row.source || '').toLowerCase().includes(q)
        || (row.route || '').toLowerCase().includes(q)
        || (row.fingerprint || '').toLowerCase().includes(q);
    return severityOk && routeOk && dateOk && fingerprintOk && searchOk;
  }), [rows, severityFilter, routeFilter, datePreset, fingerprintFilter, searchQuery]);

  const routeOptions = useMemo(() => {
    const values = new Set<string>();
    for (const r of rows) values.add(r.route || '—');
    return ['all', ...Array.from(values).sort()];
  }, [rows]);

  const fingerprintOptions = useMemo(() => {
    const values = new Set<string>();
    for (const r of rows) values.add(r.fingerprint || 'none');
    return ['all', ...Array.from(values).sort()];
  }, [rows]);

  const copyValue = async (value: string, key: string) => {
    if (!value || copyStatus?.state === 'copying') return;
    const requestId = ++copyStatusRequestIdRef.current;
    const isCurrentCopyRequest = () => mountedRef.current && requestId === copyStatusRequestIdRef.current;
    setCopyStatus({ key, state: 'copying' });
    try {
      const result = await copyTextOrDownload(value, `dayof-error-${key}.txt`);
      if (!isCurrentCopyRequest()) return;
      setCopyStatus({ key, state: result === 'copied' ? 'copied' : 'downloaded' });
      if (copyStatusTimeoutRef.current) window.clearTimeout(copyStatusTimeoutRef.current);
      copyStatusTimeoutRef.current = window.setTimeout(() => {
        if (isCurrentCopyRequest()) setCopyStatus((prev) => (prev?.key === key ? null : prev));
      }, 1200);
    } catch {
      if (!isCurrentCopyRequest()) return;
      setCopyStatus({ key, state: 'error' });
      if (copyStatusTimeoutRef.current) window.clearTimeout(copyStatusTimeoutRef.current);
      copyStatusTimeoutRef.current = window.setTimeout(() => {
        if (isCurrentCopyRequest()) setCopyStatus((prev) => (prev?.key === key ? null : prev));
      }, 1800);
    }
  };

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
        if (getErrorLogTimestamp(row.created_at) > getErrorLogTimestamp(existing.latestAt)) {
          existing.latestAt = row.created_at;
        }
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [filteredRows]);

  if (loading || (!adminCheckComplete && user?.id && !isDemoMode)) {
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
            <Link to="/dashboard/overview" className="text-sm text-primary hover:text-primary-hover">Back to your wedding</Link>
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
                    className="ml-2 w-64 max-w-full rounded-xl border border-border bg-white px-2 py-1 text-xs"
                  />
                </label>
                <label className="text-xs text-text-secondary">
                  Time range
                  <select
                    value={datePreset}
                    onChange={(e) => setDatePreset(e.target.value as '24h' | '7d' | '30d' | 'all')}
                    className="ml-2 rounded-xl border border-border bg-white px-2 py-1 text-xs"
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
                    className="ml-2 rounded-xl border border-border bg-white px-2 py-1 text-xs"
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
                    className="ml-2 rounded-xl border border-border bg-white px-2 py-1 text-xs"
                  >
                    {routeOptions.map((r) => (
                      <option key={r} value={r}>{r === 'all' ? 'All routes' : r}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-text-secondary">
                  Fingerprint
                  <select
                    value={fingerprintFilter}
                    onChange={(e) => { setFingerprintFilter(e.target.value); setPage(1); }}
                    className="ml-2 rounded-xl border border-border bg-white px-2 py-1 text-xs"
                  >
                    {fingerprintOptions.map((f) => (
                      <option key={f} value={f}>{f === 'all' ? 'All fingerprints' : f}</option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={exportFilteredCsv}
                  className="rounded-xl border border-border bg-white px-3 py-1.5 text-xs hover:bg-surface-subtle"
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
                      <p className="text-xs text-text-tertiary">Latest: {formatErrorLogDateTime(g.latestAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-xl border border-border-subtle bg-white px-2 py-1 text-xs"
                        onClick={() => { setFingerprintFilter(g.fingerprint); setPage(1); }}
                      >
                        Filter
                      </button>
                      <span className="whitespace-nowrap rounded-xl border border-border-subtle bg-surface-subtle px-2 py-1 text-xs">{g.count}x</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

              <Card variant="bordered" padding="none" className="overflow-auto max-h-[60vh]">
              <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-surface-subtle text-text-secondary sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2">Time</th>
                  <th className="text-left px-3 py-2">Severity</th>
                  <th className="text-left px-3 py-2">Source</th>
                  <th className="text-left px-3 py-2">Route</th>
                  <th className="text-left px-3 py-2">Message</th>
                  <th className="text-left px-3 py-2">Fingerprint</th>
                  <th className="text-right px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((r) => {
                  const isOpen = expandedId === r.id;
                  return (
                    <React.Fragment key={r.id}>
                      <tr className="border-t border-border-subtle align-top">
                        <td className="px-3 py-2 whitespace-nowrap">{formatErrorLogDateTime(r.created_at)}</td>
                        <td className="px-3 py-2">{r.severity}</td>
                        <td className="px-3 py-2">{r.source}</td>
                        <td className="px-3 py-2">{r.route || '—'}</td>
                        <td className="px-3 py-2 max-w-[420px] break-words">{r.message}</td>
                        <td className="px-3 py-2 font-mono text-xs">{r.fingerprint || '—'}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            className="rounded-xl border border-border px-2 py-1 text-xs"
                            onClick={() => setExpandedId((prev) => (prev === r.id ? null : r.id))}
                          >
                            {isOpen ? 'Hide' : 'Details'}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-surface-subtle/40 border-t border-border-subtle">
                          <td colSpan={8} className="px-3 py-2">
                            <div className="flex flex-wrap gap-2 items-center mb-2">
                              <button
                                className="rounded-xl border border-border px-2 py-1 text-xs"
                                onClick={() => void copyValue(r.fingerprint || '', `fp-${r.id}`)}
                                disabled={!r.fingerprint || copyStatus?.state === 'copying'}
                              >
                                {copyStatus?.key === `fp-${r.id}`
                                  ? copyStatus.state === 'copying'
                                    ? 'Copying fingerprint...'
                                    : copyStatus.state === 'copied'
                                      ? 'Copied fingerprint'
                                      : copyStatus.state === 'downloaded'
                                        ? 'Downloaded fingerprint'
                                      : 'Retry fingerprint'
                                  : 'Copy fingerprint'}
                              </button>
                              <button
                                className="rounded-xl border border-border px-2 py-1 text-xs"
                                onClick={() => void copyValue(r.message, `msg-${r.id}`)}
                                disabled={copyStatus?.state === 'copying'}
                              >
                                {copyStatus?.key === `msg-${r.id}`
                                  ? copyStatus.state === 'copying'
                                    ? 'Copying message...'
                                    : copyStatus.state === 'copied'
                                      ? 'Copied message'
                                      : copyStatus.state === 'downloaded'
                                        ? 'Downloaded message'
                                      : 'Retry message'
                                  : 'Copy message'}
                              </button>
                            </div>
                            {copyStatus?.state === 'error' && (copyStatus.key === `fp-${r.id}` || copyStatus.key === `msg-${r.id}`) && (
                              <p role="alert" className="mb-2 text-xs text-error">
                                Couldn’t copy that value right now.
                              </p>
                            )}
                            <p className="text-xs text-text-secondary break-words">{r.message}</p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              </table>
            </Card>

            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>Showing {pagedRows.length} of {filteredRows.length}</span>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-xl border border-border px-2 py-1 disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span>Page {page} / {totalPages}</span>
                <button
                  className="rounded-xl border border-border px-2 py-1 disabled:opacity-50"
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
