import { customerSafeErrorMessage } from '../../lib/customerSafeError';
import type { BuilderMediaAsset } from '../../types/builder/media';

export const BUILDER_SAVE_RETRY_ERROR = 'Could not save your latest edits. Please try again.';
export const BUILDER_PUBLISH_RETRY_ERROR = 'Could not update the guest-facing site right now. Please try again.';
export const BUILDER_RESTORE_RETRY_ERROR = 'Could not restore that local checkpoint.';
export const BUILDER_MEDIA_DELETE_RETRY_ERROR = 'Could not remove that photo right now. Please try again.';
export const BUILDER_MEDIA_REFRESH_RETRY_ERROR =
  'Your upload likely finished, but the media library could not refresh yet. Please reopen the library in a moment.';

export function mapBuilderWorkspaceError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback);
}

export function getBuilderMediaUploadRetryError(assetType: BuilderMediaAsset['assetType']): string {
  switch (assetType) {
    case 'image':
      return 'Photo upload failed. Please try again.';
    case 'video':
      return 'Video upload failed. Please try again.';
    default:
      return 'Document upload failed. Please try again.';
  }
}

export function getBuilderMediaLibrarySaveRetryError(assetType: BuilderMediaAsset['assetType']): string {
  switch (assetType) {
    case 'image':
      return 'Your photo uploaded, but we could not add it to the media library yet. Please try again.';
    case 'video':
      return 'Your video uploaded, but we could not add it to the media library yet. Please try again.';
    default:
      return 'Your document uploaded, but we could not add it to the media library yet. Please try again.';
  }
}
