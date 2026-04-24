export function toValidDateOrNull(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getVaultUnlockDate(weddingDate: Date | string | null | undefined, durationYears: number): Date | null {
  const date = toValidDateOrNull(weddingDate);
  if (!date) return null;
  date.setFullYear(date.getFullYear() + durationYears);
  return date;
}
