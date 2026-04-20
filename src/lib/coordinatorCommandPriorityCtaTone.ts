export const getCoordinatorCommandPriorityCtaTone = (ctaState: string | null) => {
  return ctaState === 'In focus' ? 'passive' : 'action';
};
