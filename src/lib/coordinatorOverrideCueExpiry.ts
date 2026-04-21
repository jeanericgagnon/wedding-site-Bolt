export const shouldExpireCoordinatorOverrideCue = ({
  shownAt,
  now,
  maxAgeMs,
  hasSummaryFeedback,
}: {
  shownAt: number | null;
  now: number;
  maxAgeMs: number;
  hasSummaryFeedback: boolean;
}) => {
  if (hasSummaryFeedback) return true;
  if (shownAt === null) return false;
  return now - shownAt >= maxAgeMs;
};
