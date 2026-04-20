import type { CoordinatorCommandState } from './coordinatorCommandState';

export const getCoordinatorCommandModeGuidance = (source: CoordinatorCommandState['source']) => {
  switch (source) {
    case 'primary-action':
      return 'Work the board’s top priority, then the command center will advance you to the next thing.';
    case 'escalation':
      return 'Resolve the flagged issue, then return to the live board once the exception is under control.';
    case 'correction':
      return 'Confirm the mistake and use the recovery controls in the focused panel to correct it cleanly.';
    default:
      return 'You are in the neutral live board view. Follow the next-best action when you need a fast cue.';
  }
};
