export const getCoordinatorStandingPromptMode = (hasLiveSignal: boolean) => {
  return hasLiveSignal ? 'secondary' : 'full';
};
