import { customerSafeErrorMessage } from './customerSafeError';

export const OVERVIEW_BRIEF_REFRESH_RETRY_ERROR = 'Failed to refresh draft from brief.';
export const OVERVIEW_SUGGESTION_HIDE_RETRY_ERROR = 'Could not hide that suggestion.';
export const GUEST_PHOTO_SHARING_LOAD_RETRY_ERROR = 'Failed to load photo sharing.';
export const BUILDER_CUTOVER_OPEN_RETRY_ERROR = 'Could not open the builder right now.';
export const GUEST_PHOTO_REMOVE_RETRY_ERROR = 'Failed to remove photo bucket item.';
export const GUEST_PHOTO_UPLOAD_RETRY_ERROR = 'Failed to upload photo bucket items.';
export const GUEST_PHOTO_ROTATE_LINKS_RETRY_ERROR = 'Failed to rotate links.';
export const GUEST_PHOTO_ITINERARY_BUCKETS_RETRY_ERROR = 'Failed to create itinerary buckets.';
export const GUEST_PHOTO_BULK_MODERATION_RETRY_ERROR = 'Bulk moderation failed.';
export const GUEST_PHOTO_STATUS_RETRY_ERROR = 'Failed to update upload moderation status.';
export const GUEST_PHOTO_BUCKET_STATUS_RETRY_ERROR = 'Failed to update bucket status.';
export const GUEST_PHOTO_REGENERATE_LINK_RETRY_ERROR = 'Failed to regenerate upload link.';
export const GUEST_PHOTO_SAVE_WINDOW_RETRY_ERROR = 'Failed to save upload window.';
export const GUEST_PHOTO_CREATE_BUCKET_RETRY_ERROR = 'Failed to create bucket.';

export function mapSupportSurfaceError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback);
}
