import { customerSafeErrorMessage } from './customerSafeError';

export const OVERVIEW_BRIEF_REFRESH_RETRY_ERROR = 'Could not refresh your draft from the saved brief right now.';
export const OVERVIEW_SUGGESTION_HIDE_RETRY_ERROR = 'Could not hide that suggestion right now.';
export const OVERVIEW_LOAD_RETRY_ERROR = "We couldn't load your overview right now. Please refresh and try again.";
export const DASHBOARD_WORKSPACE_REQUIRED_RETRY_ERROR = "We couldn't find your website workspace right now. Please refresh and try again.";
export const GUEST_PHOTO_SHARING_LOAD_RETRY_ERROR = 'Could not load photo sharing right now.';
export const BUILDER_CUTOVER_OPEN_RETRY_ERROR = 'Could not open the builder right now.';
export const GUEST_PHOTO_REMOVE_RETRY_ERROR = 'Could not remove that photo right now.';
export const GUEST_PHOTO_UPLOAD_RETRY_ERROR = 'Could not upload those photo items right now.';
export const GUEST_PHOTO_ROTATE_LINKS_RETRY_ERROR = 'Could not refresh those guest photo links right now.';
export const GUEST_PHOTO_ITINERARY_BUCKETS_RETRY_ERROR = 'Could not create photo-sharing buckets from the itinerary right now.';
export const GUEST_PHOTO_BULK_MODERATION_RETRY_ERROR = 'Could not update those photo items right now.';
export const GUEST_PHOTO_STATUS_RETRY_ERROR = 'Could not update that photo status right now.';
export const GUEST_PHOTO_BUCKET_STATUS_RETRY_ERROR = 'Could not update that bucket status right now.';
export const GUEST_PHOTO_REGENERATE_LINK_RETRY_ERROR = 'Could not refresh that upload link right now.';
export const GUEST_PHOTO_SAVE_WINDOW_RETRY_ERROR = 'Could not save that upload window right now.';
export const GUEST_PHOTO_CREATE_BUCKET_RETRY_ERROR = 'Could not create that photo bucket right now.';

export function mapSupportSurfaceError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback);
}
