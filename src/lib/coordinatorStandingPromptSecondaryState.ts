export const getCoordinatorStandingPromptSecondaryState = ({
  mode,
  state,
}: {
  mode: 'full' | 'secondary';
  state: string | null;
}) => {
  if (mode !== 'secondary') return state;
  if (state === 'In focus') return 'In focus now';
  return state;
};
