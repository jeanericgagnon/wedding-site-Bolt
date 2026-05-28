import { customerSafeErrorMessage } from '../../lib/customerSafeError';

export const COORDINATOR_CHECKIN_RETRY_ERROR = 'Could not update check-in right now.';
export const COORDINATOR_ALERT_RETRY_ERROR = 'Could not queue that alert right now.';
export const COORDINATOR_QNA_SAVE_RETRY_ERROR = 'Could not save that question.';
export const COORDINATOR_QNA_ANSWER_RETRY_ERROR = 'Could not save that answer.';

export function mapCoordinatorError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback);
}
