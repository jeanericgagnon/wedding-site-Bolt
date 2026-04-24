export function toValidAuditLogDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatAuditLogDateTime(value: string | null | undefined): string {
  const date = toValidAuditLogDateOrNull(value);
  return date ? date.toLocaleString() : 'Unknown time';
}
