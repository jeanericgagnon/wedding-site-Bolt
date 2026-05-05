export const getCoordinatorAlertSummaryTransitionLabel = ({
  previousAligned,
  currentAligned,
}: {
  previousAligned: boolean | null;
  currentAligned: boolean;
}) => {
  if (previousAligned === null || previousAligned === currentAligned) return null;
  return currentAligned
    ? 'Update draft returned to the suggestion'
    : 'Update draft was customized';
};
