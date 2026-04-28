function normalizeSeatingEventDateInput(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10) === trimmed ? `${trimmed}T00:00:00.000Z` : null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : trimmed;
}

export function formatSeatingEventDate(value: string | null | undefined): string {
  const normalized = normalizeSeatingEventDateInput(value);
  if (!normalized) return 'Unknown date';

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString();
}

export function formatSeatingEventLabel(eventName: string, eventDate: string | null | undefined): string {
  return `${eventName} — ${formatSeatingEventDate(eventDate)}`;
}
