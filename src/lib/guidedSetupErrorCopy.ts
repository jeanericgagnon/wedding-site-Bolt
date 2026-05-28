import { customerSafeErrorMessage } from './customerSafeError';

export const GUIDED_SETUP_SAVE_RETRY_ERROR = 'Could not save this step right now.';
export const GUIDED_SETUP_HYDRATION_RETRY_ERROR = 'Could not preload your wedding details right now.';
export const GUIDED_SETUP_GUEST_IMPORT_RETRY_ERROR = 'Could not import that guest list right now. Please try again with a clean guest file.';

const GUIDED_SETUP_GUEST_IMPORT_ALLOW_LIST = [
  /^Spreadsheet has no sheets\.$/i,
  /^File must have a header row and at least one guest row$/i,
];

export const buildGuidedSetupSaveErrorMessage = (error?: unknown) => {
  const base = customerSafeErrorMessage(error, GUIDED_SETUP_SAVE_RETRY_ERROR);
  return `${base} Your progress is still saved on this device, so you can keep going or retry.`;
};

export const buildGuidedSetupHydrationErrorMessage = (error?: unknown) => {
  const base = customerSafeErrorMessage(error, GUIDED_SETUP_HYDRATION_RETRY_ERROR);
  return `${base} You can keep going and save manually.`;
};

export const buildGuidedSetupGuestImportErrorMessage = (error?: unknown) =>
  customerSafeErrorMessage(error, GUIDED_SETUP_GUEST_IMPORT_RETRY_ERROR, {
    allow: GUIDED_SETUP_GUEST_IMPORT_ALLOW_LIST,
  });
