function parseLocalDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function parseLocalScheduleInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hours = Number(match[4]);
  const minutes = Number(match[5]);
  const date = new Date(year, month - 1, day, hours, minutes);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    && date.getHours() === hours
    && date.getMinutes() === minutes
    ? date
    : null;
}

function toValidScheduledMessageDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const date = isDateOnly ? parseLocalDateOnly(trimmed) : new Date(trimmed);
  if (!date) return null;
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toScheduleInputValue(iso: string | null | undefined): string {
  const date = toValidScheduledMessageDateOrNull(iso);
  if (!date) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function parseScheduleInputToIso(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const date = parseLocalScheduleInput(value);
  return date ? date.toISOString() : undefined;
}

export function formatScheduledMessageDateTime(value: string | null | undefined): string {
  const date = toValidScheduledMessageDateOrNull(value);
  return date ? date.toLocaleString() : 'Unknown time';
}
