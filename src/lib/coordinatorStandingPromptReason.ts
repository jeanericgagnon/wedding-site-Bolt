export const getCoordinatorStandingPromptReason = ({
  label,
  targetLabel,
}: {
  label: string;
  targetLabel: string | null;
}) => {
  const [reason] = label.split(' — ');
  if (!targetLabel) return reason;

  const [, targetName] = targetLabel.split(' · ');
  return targetName ? reason.replace(` on ${targetName}`, '').trim() : reason;
};
