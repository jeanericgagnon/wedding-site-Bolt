import { customerSafeErrorMessage } from './customerSafeError';

export const EMAIL_SERVICE_RETRY_ERROR =
  'Could not send that email right now. Please try again.';

export function mapEmailServiceError(error: unknown): string {
  return customerSafeErrorMessage(error, EMAIL_SERVICE_RETRY_ERROR);
}
