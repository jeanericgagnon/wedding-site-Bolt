export const shouldResetCoordinatorAlertOverride = ({
  overrideLabel,
  aligned,
}: {
  overrideLabel: string | null;
  aligned: boolean;
}) => {
  if (!overrideLabel) return false;
  return aligned;
};
