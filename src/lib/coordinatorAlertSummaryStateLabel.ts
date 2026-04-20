export const getCoordinatorAlertSummaryStateLabel = ({
  aligned,
  laneLabel,
}: {
  aligned: boolean;
  laneLabel: string;
}) => {
  return aligned
    ? `Board-aligned ${laneLabel.toLowerCase()}`
    : `Manual override on ${laneLabel.toLowerCase()}`;
};
