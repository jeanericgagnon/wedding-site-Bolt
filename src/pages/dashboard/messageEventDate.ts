function normalizeMessageEventDateInput(value: string | null | undefined): string | null {
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

export function formatMessageEventDate(value: string | null | undefined): string {
  const normalized = normalizeMessageEventDateInput(value);
  if (!normalized) return '';

  const date = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? new Date(`${normalized}T12:00:00Z`)
    : new Date(normalized);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

export function formatMessageEventOptionLabel(eventName: string, eventDate: string | null | undefined): string {
  const formattedDate = formatMessageEventDate(eventDate);
  return formattedDate ? `${eventName} — ${formattedDate}` : eventName;
}
