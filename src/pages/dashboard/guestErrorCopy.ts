import { customerSafeErrorMessage } from '../../lib/customerSafeError';

const GUESTS_ALLOW_LIST = [
  /choice question ".+" needs at least 2 options\./i,
  /meal choices need at least 2 options when enabled\./i,
];

export const GUESTS_RSVP_CONFIG_RETRY_ERROR = 'Failed to save RSVP config.';
export const GUESTS_ADD_RETRY_ERROR = 'Failed to add guest. Please try again.';
export const GUESTS_PARSE_FILE_RETRY_ERROR = 'Failed to parse guest file.';
export const GUESTS_IMPORT_RETRY_ERROR = 'Import failed. Please try again with a clean guest file.';
export const GUESTS_DELETE_ALL_RETRY_ERROR = 'Failed to delete all guests. Please try again.';

export function mapGuestDashboardError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback, { allow: GUESTS_ALLOW_LIST });
}
