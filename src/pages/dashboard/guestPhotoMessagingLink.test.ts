import { describe, expect, it } from 'vitest';

import {
  buildGuestPhotoBucketMessagingPath,
  buildGuestPhotoShareBulkMessagingPath,
} from './guestPhotoMessagingLink';

describe('guestPhotoMessagingLink', () => {
  it('builds a bucket-specific messaging prefill only when a real bucket link exists', () => {
    expect(
      buildGuestPhotoBucketMessagingPath({
        bucketName: 'Ceremony',
        uploadLink: 'https://dayof.love/photos/upload?t=abc',
      }),
    ).toBe(
      '/dashboard/messages?prefillSubject=Ceremony%20photo%20sharing&prefillBody=Please%20upload%20your%20Ceremony%20photos%20here%3A%20https%3A%2F%2Fdayof.love%2Fphotos%2Fupload%3Ft%3Dabc',
    );
  });

  it('returns null when there is no bucket-specific upload link', () => {
    expect(buildGuestPhotoBucketMessagingPath({ bucketName: 'Ceremony', uploadLink: '' })).toBeNull();
    expect(buildGuestPhotoBucketMessagingPath({ bucketName: 'Ceremony', uploadLink: '   ' })).toBeNull();
  });

  it('builds a bulk messaging prefill with photo sharing language only when real lines exist', () => {
    expect(
      buildGuestPhotoShareBulkMessagingPath([
        'Ceremony: Please upload your Ceremony photos here: https://dayof.love/photos/upload?t=abc',
        'Dance floor: Please upload your Dance floor photos here: https://dayof.love/photos/upload?t=def',
      ]),
    ).toBe(
      '/dashboard/messages?prefillSubject=Photo%20sharing%20links&prefillBody=Ceremony%3A%20Please%20upload%20your%20Ceremony%20photos%20here%3A%20https%3A%2F%2Fdayof.love%2Fphotos%2Fupload%3Ft%3Dabc%0A%0ADance%20floor%3A%20Please%20upload%20your%20Dance%20floor%20photos%20here%3A%20https%3A%2F%2Fdayof.love%2Fphotos%2Fupload%3Ft%3Ddef',
    );

    expect(buildGuestPhotoShareBulkMessagingPath([])).toBeNull();
    expect(buildGuestPhotoShareBulkMessagingPath(['   '])).toBeNull();
  });
});
