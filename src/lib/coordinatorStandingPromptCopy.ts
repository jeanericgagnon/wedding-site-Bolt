export const getCoordinatorStandingPromptCopy = ({
  mode,
  label,
}: {
  mode: 'full' | 'secondary';
  label: string;
}) => {
  if (mode === 'secondary') {
    const [reason] = label.split(' — ');
    return reason;
  }

  return label;
};
