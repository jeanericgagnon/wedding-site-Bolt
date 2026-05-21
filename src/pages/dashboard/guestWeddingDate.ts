function normalizeGuestWeddingDateInput(value: string | null | undefined): string | null {
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

export function getDaysUntilGuestWedding(value: string | null | undefined, now = Date.now()): number | null {
  const normalized = normalizeGuestWeddingDateInput(value);
  if (!normalized) return null;

  const timestamp = new Date(normalized).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.ceil((timestamp - now) / (1000 * 60 * 60 * 24));
}
