export const resolveOnboardingResumeIndex = ({
  savedIndex,
  firstIncompleteIndex,
  questionCount,
}: {
  savedIndex: number;
  firstIncompleteIndex: number;
  questionCount: number;
}) => {
  if (!Number.isFinite(savedIndex) || questionCount <= 0) return 0;
  const clampedSaved = Math.min(Math.max(0, savedIndex), questionCount - 1);
  const clampedIncomplete = Math.min(Math.max(0, firstIncompleteIndex), questionCount - 1);
  return Math.min(clampedSaved, clampedIncomplete);
};
