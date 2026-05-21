function normalizeSeatingEventDateInput(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return null;
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? trimmed : null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : trimmed;
}

export function formatSeatingEventDate(value: string | null | undefined): string {
  const normalized = normalizeSeatingEventDateInput(value);
  if (!normalized) return 'Unknown date';

  const date = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? new Date(Number(normalized.slice(0, 4)), Number(normalized.slice(5, 7)) - 1, Number(normalized.slice(8, 10)))
    : new Date(normalized);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString();
}

export function formatSeatingEventLabel(eventName: string, eventDate: string | null | undefined): string {
  return `${eventName} — ${formatSeatingEventDate(eventDate)}`;
}
