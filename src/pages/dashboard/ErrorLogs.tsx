import React, { useEffect, useState } from 'react';
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

const ADMIN_ERROR_LOG_EMAIL = 'admin@dayof.love';

export const DashboardErrorLogs: React.FC = () => {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<ErrorLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = (user?.email || '').toLowerCase() === ADMIN_ERROR_LOG_EMAIL;

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
                {rows.map((r) => (
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
        )}
      </div>
    </div>
  );
};
