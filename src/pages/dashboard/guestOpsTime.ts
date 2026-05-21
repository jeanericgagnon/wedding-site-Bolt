function normalizeGuestOpsTimeInput(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return null;
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? date.toISOString()
      : null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : trimmed;
}

export function getGuestOpsTimestamp(value: string | null | undefined): number {
  const normalized = normalizeGuestOpsTimeInput(value);
  if (!normalized) return Number.NEGATIVE_INFINITY;

  const date = new Date(normalized);
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

export function formatGuestOpsDateTime(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' },
): string {
  const timestamp = getGuestOpsTimestamp(value);
  if (!Number.isFinite(timestamp)) return 'Unknown time';
  return new Date(timestamp).toLocaleString('en-US', options);
}

export function formatGuestOpsDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
  fallback = 'Unknown date',
): string {
  const timestamp = getGuestOpsTimestamp(value);
  if (!Number.isFinite(timestamp)) return fallback;
  return new Date(timestamp).toLocaleDateString('en-US', options);
}
