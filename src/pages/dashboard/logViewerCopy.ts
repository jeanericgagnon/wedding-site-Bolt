import { customerSafeErrorMessage } from '../../lib/customerSafeError';

export const AUDIT_LOGS_LOAD_RETRY_ERROR = 'Could not load audit logs.';
export const ERROR_LOGS_LOAD_RETRY_ERROR = 'Couldn’t load error logs right now.';

export function mapLogViewerError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback);
}
