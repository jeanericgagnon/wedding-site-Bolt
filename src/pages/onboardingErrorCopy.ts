import { customerSafeErrorMessage } from '../lib/customerSafeError';

export const ONBOARDING_UPDATE_RETRY_ERROR = 'Could not update your starter draft right now. Please try again.';
export const ONBOARDING_CREATE_SITE_RETRY_ERROR = 'Could not create your starter site right now. Please try again.';
export const ONBOARDING_FINISH_RETRY_ERROR = 'Could not finish your starter draft right now. Please try again.';

export function mapOnboardingError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback);
}
