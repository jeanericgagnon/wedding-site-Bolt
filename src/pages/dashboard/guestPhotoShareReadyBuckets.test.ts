import { describe, expect, it } from 'vitest';

import { getGuestPhotoShareReadyBuckets, resolvePreferredGuestPhotoShareReadyLink } from './guestPhotoShareReadyBuckets';

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

  it('keeps the preferred link only when it is still active and share-ready', () => {
    const readyBuckets = getGuestPhotoShareReadyBuckets(
      [
        { id: 'active-a', name: 'Ceremony', is_active: true },
        { id: 'active-b', name: 'Brunch', is_active: true },
        { id: 'paused', name: 'After Party', is_active: false },
      ],
      {
        'active-a': 'https://dayof.love/photos/upload?t=a',
        'active-b': 'https://dayof.love/photos/upload?t=b',
        paused: 'https://dayof.love/photos/upload?t=paused',
      },
    );

    expect(resolvePreferredGuestPhotoShareReadyLink('https://dayof.love/photos/upload?t=b', readyBuckets)).toBe(
      'https://dayof.love/photos/upload?t=b',
    );
    expect(resolvePreferredGuestPhotoShareReadyLink('https://dayof.love/photos/upload?t=paused', readyBuckets)).toBe(
      'https://dayof.love/photos/upload?t=a',
    );
    expect(resolvePreferredGuestPhotoShareReadyLink('https://dayof.love/photos/upload?t=missing', readyBuckets)).toBe(
      'https://dayof.love/photos/upload?t=a',
    );
  });
});
