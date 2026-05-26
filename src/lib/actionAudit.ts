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

const SENSITIVE_AUDIT_METADATA_KEY = /(password|secret|token|key|authorization|auth|cookie|session|jwt|service[-_]?role)/i;
const MAX_AUDIT_METADATA_DEPTH = 4;
const MAX_AUDIT_METADATA_STRING_LENGTH = 500;
const MAX_AUDIT_METADATA_ARRAY_ITEMS = 25;
const MAX_AUDIT_METADATA_OBJECT_KEYS = 50;
export const MAX_APP_ACTION_AUDIT_ROWS = 100;

type SanitizedAuditMetadataValue = string | number | boolean | null | SanitizedAuditMetadataValue[] | { [key: string]: SanitizedAuditMetadataValue };

function sanitizeAuditMetadataValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): SanitizedAuditMetadataValue {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.length > MAX_AUDIT_METADATA_STRING_LENGTH
      ? `${value.slice(0, MAX_AUDIT_METADATA_STRING_LENGTH - 3)}...`
      : value;
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'object') return null;
  if (depth >= MAX_AUDIT_METADATA_DEPTH) return '[truncated]';
  if (seen.has(value)) return '[circular]';

  seen.add(value);

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_AUDIT_METADATA_ARRAY_ITEMS)
      .map((entry) => sanitizeAuditMetadataValue(entry, depth + 1, seen));
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_AUDIT_METADATA_KEY.test(key))
      .slice(0, MAX_AUDIT_METADATA_OBJECT_KEYS)
      .map(([key, entry]) => [key, sanitizeAuditMetadataValue(entry, depth + 1, seen)]),
  );
}

export function sanitizeMetadata(value: Record<string, unknown> | undefined): Record<string, SanitizedAuditMetadataValue> {
  if (!value) return {};
  return sanitizeAuditMetadataValue(value, 0, new WeakSet()) as Record<string, SanitizedAuditMetadataValue>;
}

export async function logAppAction(input: AppActionAuditInput): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return;

  const { error } = await supabase.rpc('app_action_audit_log_write', {
    p_wedding_site_id: input.weddingSiteId,
    p_action_area: input.area,
    p_action_type: input.type,
    p_summary: input.summary,
    p_target_id: input.targetId ?? null,
    p_target_label: input.targetLabel ?? null,
    p_metadata: sanitizeMetadata(input.metadata),
  });

  if (error) {
    // Audit logging should never block the user action, especially while the table is pending deploy.
    console.info('[DayOf audit] action log unavailable', { area: input.area, type: input.type });
  }
}

export async function listAppActionAuditLogs(weddingSiteId: string, limit = 50): Promise<AppActionAuditRow[]> {
  const boundedLimit = Math.max(1, Math.min(MAX_APP_ACTION_AUDIT_ROWS, Math.floor(limit || 0) || 50));
  const { data, error } = await supabase
    .from('app_action_audit_logs')
    .select('id,wedding_site_id,actor_user_id,action_area,action_type,target_id,target_label,summary,metadata,created_at')
    .eq('wedding_site_id', weddingSiteId)
    .order('created_at', { ascending: false })
    .limit(boundedLimit);

  if (error) return [];
  return ((data ?? []) as AppActionAuditRow[]).map((row) => ({
    ...row,
    metadata: row.metadata ?? {},
  }));
}
