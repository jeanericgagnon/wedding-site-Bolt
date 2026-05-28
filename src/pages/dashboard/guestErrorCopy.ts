import { customerSafeErrorMessage } from '../../lib/customerSafeError';

const GUESTS_ALLOW_LIST = [
  /choice question ".+" needs at least 2 options\./i,
  /meal choices need at least 2 options when enabled\./i,
];

export const GUESTS_RSVP_CONFIG_RETRY_ERROR = 'Could not save RSVP settings right now.';
export const GUESTS_SITE_SETTINGS_LOAD_RETRY_ERROR = 'Could not load guest site settings right now. Please try again.';
export const GUESTS_RECORDS_LOAD_RETRY_ERROR = 'Could not load guest records right now. Please try again.';
export const GUESTS_ITINERARY_FILTERS_LOAD_RETRY_ERROR = 'Could not load itinerary filters right now. Please try again.';
export const GUESTS_RSVP_AUDIT_LOAD_RETRY_ERROR = 'Could not load RSVP audit history right now. Please try again.';
export const GUESTS_ITINERARY_DETAILS_LOAD_RETRY_ERROR = 'Could not load guest itinerary details right now. Please try again.';
export const GUESTS_ADD_RETRY_ERROR = 'Could not add that guest right now. Please try again.';
export const GUESTS_UPDATE_RETRY_ERROR = 'Could not update that guest right now. Please try again.';
export const GUESTS_PARSE_FILE_RETRY_ERROR = 'Could not read that guest file right now.';
export const GUESTS_IMPORT_RETRY_ERROR = 'Could not import that guest list right now. Please try again with a clean guest file.';
export const GUESTS_DELETE_ALL_RETRY_ERROR = 'Could not delete all guests right now. Please try again.';
export const GUESTS_THANK_YOU_STATUS_RETRY_ERROR = 'Could not update thank-you status right now.';
export const GUESTS_THANK_YOU_BULK_RETRY_ERROR = 'Could not update thank-you statuses right now.';
export const GUESTS_CHECKIN_CLEAR_RETRY_ERROR = 'Could not clear guest check-ins right now.';
export const GUESTS_CHECKIN_STATUS_RETRY_ERROR = 'Could not update guest check-in right now.';
export const GUESTS_CHECKIN_UNDO_RETRY_ERROR = 'Could not undo that guest check-in right now.';
export const GUESTS_EVENT_INVITE_RETRY_ERROR = 'Could not update that event invitation right now.';
export const GUESTS_ASSISTED_RSVP_RETRY_ERROR = 'Could not save that assisted RSVP right now.';
export const GUESTS_AUTO_REMINDER_SAVE_RETRY_ERROR = 'Could not save auto reminder settings right now.';
export const GUESTS_CONFLICT_RESOLVE_RETRY_ERROR = 'Could not resolve that RSVP conflict right now.';
export const GUESTS_CONFLICT_RESOLVE_ALL_RETRY_ERROR = 'Could not resolve those RSVP conflicts right now.';
export const GUESTS_INVITATION_SEND_RETRY_ERROR = 'Could not send that invitation right now. Please try again.';
export const GUESTS_HOUSEHOLD_MERGE_RETRY_ERROR = 'Could not merge those guests into one household right now.';
export const GUESTS_HOUSEHOLD_SPLIT_RETRY_ERROR = 'Could not remove that guest from the household right now.';
export const GUESTS_HOUSEHOLD_REASSIGN_RETRY_ERROR = 'Could not move that guest to a different household right now.';
export const GUESTS_REMOVE_RETRY_ERROR = 'Could not remove that guest right now. Please try again.';

export function mapGuestDashboardError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback, { allow: GUESTS_ALLOW_LIST });
}
