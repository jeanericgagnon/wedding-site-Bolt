function normalizeItineraryEventDateInput(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10) === trimmed ? trimmed : null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : trimmed;
}

export function toValidItineraryEventDateOrNull(value: string | null | undefined): Date | null {
  const normalized = normalizeItineraryEventDateInput(value);
  if (!normalized) return null;

  const date = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? new Date(`${normalized}T12:00:00Z`)
    : new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatItineraryEventDate(value: string | null | undefined): string {
  const date = toValidItineraryEventDateOrNull(value);
  if (!date) return 'Unknown date';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
