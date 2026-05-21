const INVALID_SEND_TIME = Number.POSITIVE_INFINITY;

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function toValidCoordinatorAlertSendDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const date = isDateOnly ? parseDateOnly(trimmed) : new Date(trimmed);
  if (!date) return null;
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getCoordinatorAlertSendTimestamp(value: string | null | undefined): number {
  return toValidCoordinatorAlertSendDateOrNull(value)?.getTime() ?? INVALID_SEND_TIME;
}

export function formatCoordinatorAlertSendTime(value: string | null | undefined, fallback = 'Unknown time'): string {
  const date = toValidCoordinatorAlertSendDateOrNull(value);
  return date ? date.toLocaleString() : fallback;
}
