const INVALID_SEND_TIME = Number.POSITIVE_INFINITY;

function toValidCoordinatorAlertSendDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getCoordinatorAlertSendTimestamp(value: string | null | undefined): number {
  return toValidCoordinatorAlertSendDateOrNull(value)?.getTime() ?? INVALID_SEND_TIME;
}

export function formatCoordinatorAlertSendTime(value: string | null | undefined, fallback = 'Unknown time'): string {
  const date = toValidCoordinatorAlertSendDateOrNull(value);
  return date ? date.toLocaleString() : fallback;
}
