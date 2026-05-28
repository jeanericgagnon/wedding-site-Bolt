import { customerSafeErrorMessage } from './customerSafeError';

export const GUIDED_SETUP_SAVE_RETRY_ERROR = 'Could not save this step right now.';
export const GUIDED_SETUP_HYDRATION_RETRY_ERROR = 'Could not preload your wedding details right now.';

export const buildGuidedSetupSaveErrorMessage = (error?: unknown) => {
  const base = customerSafeErrorMessage(error, GUIDED_SETUP_SAVE_RETRY_ERROR);
  return `${base} Your progress is still saved on this device, so you can keep going or retry.`;
};

export const buildGuidedSetupHydrationErrorMessage = (error?: unknown) => {
  const base = customerSafeErrorMessage(error, GUIDED_SETUP_HYDRATION_RETRY_ERROR);
  return `${base} You can keep going and save manually.`;
};
