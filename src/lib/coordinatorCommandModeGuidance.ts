import type { CoordinatorCommandState } from './coordinatorCommandState';

export const getCoordinatorCommandModeGuidance = (source: CoordinatorCommandState['source']) => {
  switch (source) {
    case 'primary-action':
      return 'Start with the suggested action, then dayof will surface the next helpful step.';
    case 'escalation':
      return 'Handle the detail that needs attention, then return to the day-of summary once it is settled.';
    case 'correction':
      return 'Confirm what changed and use the focused panel to update it cleanly.';
    default:
      return 'You are in the day-of summary. Follow the suggested action when you need a fast cue.';
  }
};
