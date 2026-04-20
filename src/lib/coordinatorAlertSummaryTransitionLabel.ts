export const getCoordinatorAlertSummaryTransitionLabel = ({
  previousAligned,
  currentAligned,
}: {
  previousAligned: boolean | null;
  currentAligned: boolean;
}) => {
  if (previousAligned === null || previousAligned === currentAligned) return null;
  return currentAligned
    ? 'Alert lane re-aligned to board target'
    : 'Alert lane moved into manual override';
};
