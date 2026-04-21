export const shouldExpireCoordinatorCue = ({
  shownAt,
  now,
  maxAgeMs,
}: {
  shownAt: number | null;
  now: number;
  maxAgeMs: number;
}) => {
  if (shownAt === null) return false;
  return now - shownAt >= maxAgeMs;
};
