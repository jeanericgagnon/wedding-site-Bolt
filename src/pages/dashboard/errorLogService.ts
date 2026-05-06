import { supabase } from '../../lib/supabase';

export const ADMIN_USER_SELECT = 'user_id';
export const ERROR_LOG_SELECT = 'id, created_at, source, severity, route, message, fingerprint';

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
  const { data, error } = await supabase
    .from('admin_users')
    .select(ADMIN_USER_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function loadDashboardErrorLogs(): Promise<ErrorLogRow[]> {
  const { data, error } = await supabase
    .from('app_error_logs')
    .select(ERROR_LOG_SELECT)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as ErrorLogRow[];
}
