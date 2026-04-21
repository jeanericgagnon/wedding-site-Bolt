export const getCoordinatorStandingPromptReasonAlertTightened = (reason: string) => {
  return reason
    .replace('board-aligned ', '')
    .replace('manual override on ', 'override on ')
    .replace(' is ready to send', ' ready to send')
    .replace(' draft needs review', ' draft needs review');
};
