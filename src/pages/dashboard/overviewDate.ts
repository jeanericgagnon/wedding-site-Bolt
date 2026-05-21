function normalizeOverviewDateInput(value: string | null | undefined): string | null {
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

export function getOverviewTimestamp(value: string | null | undefined): number {
  const normalized = normalizeOverviewDateInput(value);
  if (!normalized) return Number.NEGATIVE_INFINITY;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? Number.NEGATIVE_INFINITY : date.getTime();
}

export function formatOverviewRelativeTime(value: string | null | undefined, now = Date.now()): string {
  const timestamp = getOverviewTimestamp(value);
  if (timestamp === Number.NEGATIVE_INFINITY) return 'Unknown time';

  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatOverviewWeddingDate(value: string | null | undefined): string {
  const timestamp = getOverviewTimestamp(value);
  if (timestamp === Number.NEGATIVE_INFINITY) return 'Unknown date';
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function calcOverviewDaysUntil(value: string | null | undefined, today = new Date()): number | null {
  const timestamp = getOverviewTimestamp(value);
  if (timestamp === Number.NEGATIVE_INFINITY) return null;

  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  const target = new Date(timestamp);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - startOfToday.getTime()) / 86400000);
}
