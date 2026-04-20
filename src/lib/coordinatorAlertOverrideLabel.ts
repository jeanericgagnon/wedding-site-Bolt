export const getCoordinatorAlertOverrideLabel = ({
  aligned,
  laneLabel,
}: {
  aligned: boolean;
  laneLabel: string;
}) => {
  if (aligned) return null;
  return `Manual alert override: draft diverged from ${laneLabel.toLowerCase()}`;
};
