export function formatSeatingEventDate(value: string | null | undefined): string {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString();
}

export function formatSeatingEventLabel(eventName: string, eventDate: string | null | undefined): string {
  return `${eventName} — ${formatSeatingEventDate(eventDate)}`;
}
