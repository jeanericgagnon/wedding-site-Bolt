import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { listAppActionAuditLogs, type AppActionAuditRow } from '../../lib/actionAudit';
import { supabase } from '../../lib/supabase';

export const AUDIT_GUEST_LOG_SELECT = 'id, action, changed_at, changed_by, guest_id';
export const AUDIT_GUEST_NAME_SELECT = 'id, name, first_name, last_name';
export const MAX_AUDIT_LOG_ROWS = 50;

export interface GuestAuditRow {
  id: string;
  action: 'insert' | 'update' | 'delete';
  changed_at: string;
  changed_by: string | null;
  guest_id: string;
  guest_name?: string;
}

export async function loadDashboardAuditLogs(userId: string): Promise<{
  guestRows: GuestAuditRow[];
  actionRows: AppActionAuditRow[];
}> {
  const activeSite = await resolveActiveSiteForUser(userId);
  const siteId = activeSite?.id ?? null;
  if (!siteId) return { guestRows: [], actionRows: [] };

  const [{ data, error }, actionRows] = await Promise.all([
    supabase
      .from('guest_audit_logs')
      .select(AUDIT_GUEST_LOG_SELECT)
      .eq('wedding_site_id', siteId)
      .order('changed_at', { ascending: false })
      .limit(MAX_AUDIT_LOG_ROWS),
    listAppActionAuditLogs(siteId, MAX_AUDIT_LOG_ROWS),
  ]);

  if (error) throw error;

  const guestIds = Array.from(new Set((data ?? []).map((row) => row.guest_id).filter(Boolean)));
  const guestNames = await loadAuditGuestNames(guestIds);

  return {
    actionRows,
    guestRows: (data ?? []).map((row) => ({
      id: row.id,
      action: row.action as GuestAuditRow['action'],
      changed_at: row.changed_at,
      changed_by: row.changed_by,
      guest_id: row.guest_id,
      guest_name: guestNames.get(row.guest_id),
    })),
  };
}

async function loadAuditGuestNames(guestIds: string[]): Promise<Map<string, string>> {
  if (guestIds.length === 0) return new Map<string, string>();

  const { data } = await supabase
    .from('guests')
    .select(AUDIT_GUEST_NAME_SELECT)
    .in('id', guestIds.slice(0, MAX_AUDIT_LOG_ROWS));

  const guestNames = new Map<string, string>();
  for (const guest of data ?? []) {
    const name = guest.name || [guest.first_name, guest.last_name].filter(Boolean).join(' ');
    if (name) guestNames.set(guest.id, name);
  }
  return guestNames;
}
