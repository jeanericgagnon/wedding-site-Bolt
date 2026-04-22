export const parseExpectedGuestCount = (value: string): number | null => {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number.parseInt(normalized, 10);
  return parsed > 0 ? parsed : null;
};
