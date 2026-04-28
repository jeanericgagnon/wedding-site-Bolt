function normalizeGuestEventDateInput(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const date = new Date(`${trimmed}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10) === trimmed ? trimmed : null;
}

export function toValidGuestEventDateOrNull(value: string | null | undefined): Date | null {
  const normalized = normalizeGuestEventDateInput(value);
  if (!normalized) return null;

  const date = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatGuestEventDate(value: string | null | undefined): string {
  const date = toValidGuestEventDateOrNull(value);
  return date
    ? date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'Unknown date';
}
