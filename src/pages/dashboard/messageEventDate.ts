export function formatMessageEventDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

export function formatMessageEventOptionLabel(eventName: string, eventDate: string | null | undefined): string {
  const formattedDate = formatMessageEventDate(eventDate);
  return formattedDate ? `${eventName} — ${formattedDate}` : eventName;
}
