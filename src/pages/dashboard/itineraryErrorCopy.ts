import { customerSafeErrorMessage } from '../../lib/customerSafeError';

export const ITINERARY_LOAD_RETRY_ERROR = 'Failed to load itinerary events. Please try again.';
export const ITINERARY_SAVE_RETRY_ERROR = 'Failed to save event. Please try again.';
export const ITINERARY_DELETE_RETRY_ERROR = 'Failed to delete event. Please try again.';
export const ITINERARY_GUEST_LIST_RETRY_ERROR = 'Failed to load event guest list. Please try again.';
export const ITINERARY_INVITE_UPDATE_RETRY_ERROR = 'Failed to update invitation. Please try again.';
export const ITINERARY_INVITE_ALL_RETRY_ERROR = 'Failed to invite all guests. Please try again.';
export const ITINERARY_REMOVE_ALL_RETRY_ERROR = 'Failed to remove all guests. Please try again.';

export function mapItineraryError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback);
}
