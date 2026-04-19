export const buildGuidedSetupSaveErrorMessage = (message?: string | null) => {
  const base = message?.trim() || 'Could not save this step right now.';
  return `${base} Your progress is still saved on this device, so you can keep going or retry.`;
};

export const buildGuidedSetupHydrationErrorMessage = (message?: string | null) => {
  const base = message?.trim() || 'Could not preload your wedding details right now.';
  return `${base} You can keep going and save manually.`;
};
