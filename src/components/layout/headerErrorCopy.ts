import { customerSafeErrorMessage } from '../../lib/customerSafeError';

export const HEADER_DEMO_RETRY_ERROR = 'Couldn’t open demo mode right now. Please try again.';

export function mapHeaderDemoError(error: unknown): string {
  return customerSafeErrorMessage(error, HEADER_DEMO_RETRY_ERROR);
}
