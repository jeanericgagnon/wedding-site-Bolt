import { describe, expect, it } from 'vitest';

import {
  BUILDER_MEDIA_REFRESH_RETRY_ERROR,
  BUILDER_PUBLISH_RETRY_ERROR,
  BUILDER_SAVE_RETRY_ERROR,
  getBuilderMediaLibrarySaveRetryError,
  getBuilderMediaUploadRetryError,
  mapBuilderWorkspaceError,
} from './builderWorkspaceErrorCopy';

describe('builderWorkspaceErrorCopy', () => {
  it('masks provider and backend failures behind calm builder-safe copy', () => {
    expect(mapBuilderWorkspaceError(new Error('Supabase relation wedding_sites does not exist'), BUILDER_SAVE_RETRY_ERROR))
      .toBe(BUILDER_SAVE_RETRY_ERROR);
    expect(mapBuilderWorkspaceError(new Error('functions/v1/publish-site token expired'), BUILDER_PUBLISH_RETRY_ERROR))
      .toBe(BUILDER_PUBLISH_RETRY_ERROR);
    expect(mapBuilderWorkspaceError(new Error('Storage bucket policy denied access'), BUILDER_MEDIA_REFRESH_RETRY_ERROR))
      .toBe(BUILDER_MEDIA_REFRESH_RETRY_ERROR);
  });

  it('keeps publish retry copy framed around the guest-facing site', () => {
    expect(BUILDER_PUBLISH_RETRY_ERROR).toBe('Could not update the guest-facing site right now. Please try again.');
  });

  it('returns asset-specific upload retry copy', () => {
    expect(getBuilderMediaUploadRetryError('image')).toBe('Photo upload failed. Please try again.');
    expect(getBuilderMediaUploadRetryError('video')).toBe('Video upload failed. Please try again.');
    expect(getBuilderMediaUploadRetryError('document')).toBe('Document upload failed. Please try again.');
  });

  it('returns asset-specific library-save retry copy', () => {
    expect(getBuilderMediaLibrarySaveRetryError('image')).toBe('Your photo uploaded, but we could not add it to the media library yet. Please try again.');
    expect(getBuilderMediaLibrarySaveRetryError('video')).toBe('Your video uploaded, but we could not add it to the media library yet. Please try again.');
    expect(getBuilderMediaLibrarySaveRetryError('document')).toBe('Your document uploaded, but we could not add it to the media library yet. Please try again.');
  });
});
