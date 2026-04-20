export const getCoordinatorActionHint = (kind: 'primary' | 'escalation' | 'correction' | 'neutral-focus') => {
  switch (kind) {
    case 'primary':
      return 'Click to jump into the board’s highest-priority workflow.';
    case 'escalation':
      return 'Click to focus the command panel that can resolve this issue fastest.';
    case 'correction':
      return 'Click to jump into the recovery workflow for this likely mistake.';
    case 'neutral-focus':
      return 'Click to return to the recommended neutral board focus.';
    default:
      return '';
  }
};
