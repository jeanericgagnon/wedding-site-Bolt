export const getCoordinatorActionHint = (kind: 'primary' | 'escalation' | 'correction' | 'neutral-focus') => {
  switch (kind) {
    case 'primary':
      return 'Click to jump into the board’s highest-priority next step.';
    case 'escalation':
      return 'Click to focus the panel that can resolve this issue fastest.';
    case 'correction':
      return 'Click to jump into the recovery step for this likely mistake.';
    case 'neutral-focus':
      return 'Click to return to the recommended neutral board focus.';
    default:
      return '';
  }
};
