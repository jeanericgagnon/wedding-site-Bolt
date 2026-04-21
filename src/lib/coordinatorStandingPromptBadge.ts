export const getCoordinatorStandingPromptBadge = ({
  mode,
  badge,
}: {
  mode: 'full' | 'secondary';
  badge: string;
}) => {
  return mode === 'secondary' ? `Queued next · ${badge.replace('Priority · ', '')}` : badge;
};
