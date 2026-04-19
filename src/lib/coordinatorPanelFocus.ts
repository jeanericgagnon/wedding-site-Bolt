export type CoordinatorPanelFocus = 'check-in' | 'timeline' | 'qna';

export const resolveCoordinatorPanelFocus = (escalationKey: string | null): CoordinatorPanelFocus | null => {
  switch (escalationKey) {
    case 'door-review':
      return 'check-in';
    case 'open-qna':
      return 'qna';
    case 'timeline-live':
      return 'timeline';
    default:
      return null;
  }
};
