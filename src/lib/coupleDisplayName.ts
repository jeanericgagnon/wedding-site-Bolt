export const buildCoupleDisplayName = (
  partner1Name?: string | null,
  partner2Name?: string | null,
  fallback = '',
): string => {
  const displayName = [partner1Name, partner2Name]
    .map((name) => name?.trim() ?? '')
    .filter(Boolean)
    .join(' & ');

  return displayName || fallback;
};
