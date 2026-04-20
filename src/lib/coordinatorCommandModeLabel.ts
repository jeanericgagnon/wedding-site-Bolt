import type { CoordinatorCommandState } from './coordinatorCommandState';

export const getCoordinatorCommandModeLabel = (source: CoordinatorCommandState['source']) => {
  switch (source) {
    case 'primary-action':
      return 'Primary action mode';
    case 'escalation':
      return 'Escalation mode';
    case 'correction':
      return 'Correction mode';
    default:
      return 'Live board mode';
  }
};
