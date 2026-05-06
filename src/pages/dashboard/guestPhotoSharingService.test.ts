import { describe, expect, it } from 'vitest';
import { createEmptyPhotoBuckets } from '../../lib/aiPhotoBuckets';
import { buildGuestPhotoBucketSiteUpdate } from './guestPhotoSharingService';

describe('guestPhotoSharingService', () => {
  it('preserves existing wedding data meta while replacing photo buckets', () => {
    const buckets = {
      ...createEmptyPhotoBuckets(),
      'main-couple': [{ id: 'photo-1', url: 'https://example.com/photo.jpg', bucket: 'main-couple' as const }],
    };

    expect(buildGuestPhotoBucketSiteUpdate({
      wedding_data: {
        couple: { name: 'Alex and Jordan' },
        meta: {
          existing: true,
          photoBuckets: { old: [] },
        },
      },
      site_json: { sections: [] },
    }, buckets)).toEqual({
      wedding_data: {
        couple: { name: 'Alex and Jordan' },
        meta: {
          existing: true,
          photoBuckets: buckets,
        },
      },
      site_json: { sections: [] },
    });
  });
});
