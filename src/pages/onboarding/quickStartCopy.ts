import { customerSafeErrorMessage } from '../../lib/customerSafeError';

export const QUICK_START_SAVE_RETRY_ERROR = 'We could not save your setup right now. Please try again.';
export const QUICK_START_AI_RETRY_ERROR = 'We could not finish this setup step right now. Please try again.';

export function mapQuickStartSaveError(error: unknown): string {
  return customerSafeErrorMessage(error, QUICK_START_SAVE_RETRY_ERROR);
}

export function mapQuickStartAiError(error: unknown): string {
  return customerSafeErrorMessage(error, QUICK_START_AI_RETRY_ERROR);
}
