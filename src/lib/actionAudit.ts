import { supabase } from './supabase';

export type AppActionArea =
  | 'planner'
  | 'builder'
  | 'guests'
  | 'photos'
  | 'messages'
  | 'settings'
  | 'billing'
  | 'registry'
  | 'vault'
  | 'vendor';

export interface AppActionAuditInput {
  weddingSiteId: string;
  area: AppActionArea;
  type: string;
  summary: string;
  targetId?: string | null;
  targetLabel?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AppActionAuditRow {
  id: string;
  wedding_site_id: string;
  actor_user_id: string | null;
  action_area: AppActionArea | string;
  action_type: string;
  target_id: string | null;
  target_label: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

function sanitizeMetadata(value: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !/(password|secret|token|key|authorization|auth)/i.test(key))
      .map(([key, entry]) => [key, typeof entry === 'string' && entry.length > 500 ? `${entry.slice(0, 497)}...` : entry])
  );
}

export async function logAppAction(input: AppActionAuditInput): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return;

  const { error } = await supabase.from('app_action_audit_logs').insert({
    wedding_site_id: input.weddingSiteId,
    actor_user_id: user.id,
    action_area: input.area,
    action_type: input.type,
    target_id: input.targetId ?? null,
    target_label: input.targetLabel ?? null,
    summary: input.summary,
    metadata: sanitizeMetadata(input.metadata),
  });

  if (error) {
    // Audit logging should never block the user action, especially while the table is pending deploy.
    console.info('[DayOf audit] action log unavailable', { area: input.area, type: input.type });
  }
}

export async function listAppActionAuditLogs(weddingSiteId: string, limit = 50): Promise<AppActionAuditRow[]> {
  const { data, error } = await supabase
    .from('app_action_audit_logs')
    .select('id,wedding_site_id,actor_user_id,action_area,action_type,target_id,target_label,summary,metadata,created_at')
    .eq('wedding_site_id', weddingSiteId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return ((data ?? []) as AppActionAuditRow[]).map((row) => ({
    ...row,
    metadata: row.metadata ?? {},
  }));
}
