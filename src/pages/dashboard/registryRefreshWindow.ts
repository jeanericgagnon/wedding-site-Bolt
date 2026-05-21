function normalizeRegistryDateInput(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return null;
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? `${trimmed}T00:00:00`
      : null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : trimmed;
}

export function toValidDateOrNull(value: string | null | undefined): Date | null {
  const normalized = normalizeRegistryDateInput(value);
  if (!normalized) return null;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateInputValueOrEmpty(value: string | null | undefined): string {
  const date = toValidDateOrNull(value);
  return date ? date.toISOString().slice(0, 10) : '';
}

export function parseRefreshWindowEndIso(value: string): string | null | undefined {
  if (!value.trim()) return null;
  const normalized = normalizeRegistryDateInput(value);
  if (!normalized) return undefined;

  const date = toValidDateOrNull(normalized);
  if (!date) return undefined;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T23:59:59.000Z`;
}

export function getWeddingRefreshWindowDate(weddingDate: string | null | undefined): Date | null {
  const date = toValidDateOrNull(weddingDate);
  if (!date) return null;
  const refreshDate = new Date(date);
  refreshDate.setDate(refreshDate.getDate() + 30);
  return refreshDate;
}
