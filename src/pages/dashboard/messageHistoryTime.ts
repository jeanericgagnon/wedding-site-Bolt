function toValidMessageHistoryDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatMessageHistoryDateTime(value: string | null | undefined): string {
  const date = toValidMessageHistoryDateOrNull(value);
  return date ? date.toLocaleString() : 'Unknown time';
}

export function formatMessageHistoryDate(value: string | null | undefined): string {
  const date = toValidMessageHistoryDateOrNull(value);
  return date ? date.toLocaleDateString() : 'Unknown date';
}
