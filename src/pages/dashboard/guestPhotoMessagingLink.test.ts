import { describe, expect, it } from 'vitest';

import { buildGuestPhotoBucketMessagingPath } from './guestPhotoMessagingLink';

describe('guestPhotoMessagingLink', () => {
  it('builds a bucket-specific messaging prefill only when a real bucket link exists', () => {
    expect(
      buildGuestPhotoBucketMessagingPath({
        bucketName: 'Ceremony',
        uploadLink: 'https://dayof.love/photos/upload?t=abc',
      }),
    ).toBe(
      '/dashboard/messages?prefillSubject=Ceremony%20photos%20upload&prefillBody=Please%20upload%20your%20Ceremony%20photos%20here%3A%20https%3A%2F%2Fdayof.love%2Fphotos%2Fupload%3Ft%3Dabc',
    );
  });

  it('returns null when there is no bucket-specific upload link', () => {
    expect(buildGuestPhotoBucketMessagingPath({ bucketName: 'Ceremony', uploadLink: '' })).toBeNull();
    expect(buildGuestPhotoBucketMessagingPath({ bucketName: 'Ceremony', uploadLink: '   ' })).toBeNull();
  });
});
