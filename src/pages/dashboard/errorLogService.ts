import { isAdminUser, ADMIN_USER_SELECT } from '../../lib/adminUsers';
import { supabase } from '../../lib/supabase';

export const ERROR_LOG_SELECT = 'id, created_at, source, severity, route, message, fingerprint';
export const MAX_ERROR_LOG_ROWS = 100;

export interface ErrorLogRow {
  id: string;
  created_at: string;
  source: string;
  severity: string;
  route: string | null;
  message: string;
  fingerprint: string | null;
}

export async function isErrorLogAdmin(userId: string): Promise<boolean> {
  return isAdminUser(userId);
}

export async function loadDashboardErrorLogs(): Promise<ErrorLogRow[]> {
  const { data, error } = await supabase
    .from('app_error_logs')
    .select(ERROR_LOG_SELECT)
    .order('created_at', { ascending: false })
    .limit(MAX_ERROR_LOG_ROWS);

  if (error) throw error;
  return (data ?? []) as ErrorLogRow[];
}
