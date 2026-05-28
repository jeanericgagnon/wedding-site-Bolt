import { customerSafeErrorMessage } from '../../lib/customerSafeError';

export const ITINERARY_LOAD_RETRY_ERROR = 'Could not load itinerary events right now. Please try again.';
export const ITINERARY_SAVE_RETRY_ERROR = 'Could not save that event right now. Please try again.';
export const ITINERARY_DELETE_RETRY_ERROR = 'Could not remove that event right now. Please try again.';
export const ITINERARY_GUEST_LIST_RETRY_ERROR = 'Could not load the event guest list right now. Please try again.';
export const ITINERARY_INVITE_UPDATE_RETRY_ERROR = 'Could not update that invitation right now. Please try again.';
export const ITINERARY_INVITE_ALL_RETRY_ERROR = 'Could not invite those guests right now. Please try again.';
export const ITINERARY_REMOVE_ALL_RETRY_ERROR = 'Could not remove those guests right now. Please try again.';

export function mapItineraryError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback);
}
