export const getCoordinatorCommandBadgeTone = ({
  tone,
}: {
  tone: 'primary' | 'warning' | 'success' | 'neutral';
}) => {
  switch (tone) {
    case 'primary':
      return 'border-primary/20 bg-white/70 text-primary';
    case 'warning':
      return 'border-amber-200 bg-white/80 text-amber-800';
    case 'success':
      return 'border-emerald-200 bg-white/80 text-emerald-800';
    case 'neutral':
    default:
      return 'border-border/40 bg-white/80 text-text-primary';
  }
};
