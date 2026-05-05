import type { CoordinatorCommandState } from './coordinatorCommandState';

export const getCoordinatorCommandModeLabel = (source: CoordinatorCommandState['source']) => {
  switch (source) {
    case 'primary-action':
      return 'Suggested action view';
    case 'escalation':
      return 'Needs attention view';
    case 'correction':
      return 'Fix detail view';
    default:
      return 'Day-of summary view';
  }
};
