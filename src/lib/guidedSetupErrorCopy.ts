import { isInternalCustomerErrorMessage } from './customerSafeError';

const extractErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return '';
};

const customerSafeGuidedSetupMessage = (err: unknown, fallback: string, allow: RegExp[] = []) => {
  const raw = extractErrorMessage(err).replace(/\s+/g, ' ').trim();
  if (!raw) return fallback;
  if (allow.some((pattern) => pattern.test(raw))) return raw;
  if (isInternalCustomerErrorMessage(raw)) return fallback;
  return fallback;
};

export const buildGuidedSetupSaveErrorMessage = (err?: unknown) => {
  const base = customerSafeGuidedSetupMessage(err, 'Couldn’t save this step right now.');
  return `${base} Your progress is still saved on this device, so you can keep going or retry.`;
};

export const buildGuidedSetupHydrationErrorMessage = (err?: unknown) => {
  const base = customerSafeGuidedSetupMessage(err, 'Couldn’t preload your wedding details right now.');
  return `${base} You can keep going and save manually.`;
};
