import { describe, expect, it } from 'vitest';

import { getGuestPhotoShareReadyBuckets } from './guestPhotoShareReadyBuckets';

describe('guestPhotoShareReadyBuckets', () => {
  it('returns only active buckets with real upload links', () => {
    expect(
      getGuestPhotoShareReadyBuckets(
        [
          { id: 'active-with-link', name: 'Ceremony', is_active: true },
          { id: 'active-no-link', name: 'Brunch', is_active: true },
          { id: 'paused-with-link', name: 'After Party', is_active: false },
        ],
        {
          'active-with-link': 'https://dayof.love/photos/upload?t=abc',
          'active-no-link': '   ',
          'paused-with-link': 'https://dayof.love/photos/upload?t=xyz',
        },
      ).map((bucket) => ({ id: bucket.id, link: bucket.uploadLink })),
    ).toEqual([{ id: 'active-with-link', link: 'https://dayof.love/photos/upload?t=abc' }]);
  });
});
