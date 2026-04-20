import type { CoordinatorAlertForm } from './coordinatorAlertFlow';

export const resetCoordinatorAlertFormAfterSend = (
  previous: CoordinatorAlertForm,
): CoordinatorAlertForm => ({
  ...previous,
  subject: '',
  body: '',
  scheduleType: 'now',
  scheduleDate: '',
  scheduleTime: '',
});
