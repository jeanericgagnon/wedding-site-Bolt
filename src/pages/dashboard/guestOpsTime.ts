export function getGuestOpsTimestamp(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? Number.NEGATIVE_INFINITY : date.getTime();
}

export function formatGuestOpsRelativeTime(value: string | null | undefined, now = Date.now()): string {
  const timestamp = getGuestOpsTimestamp(value);
  if (!Number.isFinite(timestamp)) return 'Unknown time';

  const ms = now - timestamp;
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
