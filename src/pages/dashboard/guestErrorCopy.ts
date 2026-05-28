import { customerSafeErrorMessage } from '../../lib/customerSafeError';

const GUESTS_ALLOW_LIST = [
  /choice question ".+" needs at least 2 options\./i,
  /meal choices need at least 2 options when enabled\./i,
];

export const GUESTS_RSVP_CONFIG_RETRY_ERROR = 'Could not save RSVP settings right now.';
export const GUESTS_ADD_RETRY_ERROR = 'Could not add that guest right now. Please try again.';
export const GUESTS_UPDATE_RETRY_ERROR = 'Could not update that guest right now. Please try again.';
export const GUESTS_PARSE_FILE_RETRY_ERROR = 'Could not read that guest file right now.';
export const GUESTS_IMPORT_RETRY_ERROR = 'Could not import that guest list right now. Please try again with a clean guest file.';
export const GUESTS_DELETE_ALL_RETRY_ERROR = 'Could not delete all guests right now. Please try again.';
export const GUESTS_THANK_YOU_STATUS_RETRY_ERROR = 'Could not update thank-you status right now.';
export const GUESTS_THANK_YOU_BULK_RETRY_ERROR = 'Could not update thank-you statuses right now.';
export const GUESTS_CHECKIN_CLEAR_RETRY_ERROR = 'Could not clear guest check-ins right now.';
export const GUESTS_CHECKIN_STATUS_RETRY_ERROR = 'Could not update guest check-in right now.';
export const GUESTS_EVENT_INVITE_RETRY_ERROR = 'Could not update that event invitation right now.';
export const GUESTS_ASSISTED_RSVP_RETRY_ERROR = 'Could not save that assisted RSVP right now.';
export const GUESTS_AUTO_REMINDER_SAVE_RETRY_ERROR = 'Could not save auto reminder settings right now.';

export function mapGuestDashboardError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback, { allow: GUESTS_ALLOW_LIST });
}
