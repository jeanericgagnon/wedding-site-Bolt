import { customerSafeErrorMessage } from '../lib/customerSafeError';

export const PHOTO_UPLOAD_ACCESS_LABEL = 'Upload access code';
export const PHOTO_UPLOAD_ACCESS_PLACEHOLDER = 'Paste your access code';
export const PHOTO_UPLOAD_MISSING_ACCESS_ERROR = 'An upload access code is required.';
export const PHOTO_UPLOAD_UNAVAILABLE_ERROR = 'Photo uploads are unavailable right now. Please try again soon.';
export const PHOTO_UPLOAD_RETRY_ERROR = 'We could not upload those files right now. Please try again.';

export const mapPhotoUploadError = (code?: string, fallback?: string): string => {
  switch (code) {
    case 'INVALID_TOKEN':
      return 'This upload link is invalid. Ask the couple for a fresh link.';
    case 'ALBUM_INACTIVE':
      return 'This album is currently paused.';
    case 'ALBUM_NOT_OPEN':
      return 'This album is not open for uploads yet.';
    case 'ALBUM_CLOSED':
      return 'This album is closed for uploads.';
    case 'FILE_TOO_LARGE':
    case 'TOTAL_TOO_LARGE':
    case 'TOO_MANY_FILES':
      return fallback || 'Your upload exceeds the allowed limits.';
    case 'UNSUPPORTED_FILE_TYPE':
      return 'Unsupported file type. Please upload photos or videos only.';
    default:
      return customerSafeErrorMessage(fallback, PHOTO_UPLOAD_RETRY_ERROR);
  }
};

export const mapPhotoUploadRuntimeError = (error: unknown): string =>
  customerSafeErrorMessage(error, PHOTO_UPLOAD_RETRY_ERROR);
