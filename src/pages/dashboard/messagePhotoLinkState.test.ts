import { describe, expect, it } from 'vitest';

import { getMessagePhotoLinkState } from './messagePhotoLinkState';

describe('getMessagePhotoLinkState', () => {
  it('prefers active bucket links when bucket state is known', () => {
    expect(getMessagePhotoLinkState({
      buckets: [
        { id: 'paused', is_active: false },
        { id: 'active', is_active: true },
      ],
      storedLinks: {
        paused: 'https://dayof.love/photos/upload?bucket=paused',
        active: 'https://dayof.love/photos/upload?bucket=active',
      },
      fallbackLink: 'https://dayof.love/photos/upload',
    })).toEqual({
      knownPhotoLinksCount: 1,
      preferredPhotoLink: 'https://dayof.love/photos/upload?bucket=active',
    });
  });

  it('falls back to the generic upload route when no active links are available', () => {
    expect(getMessagePhotoLinkState({
      buckets: [{ id: 'paused', is_active: false }],
      storedLinks: {
        paused: 'https://dayof.love/photos/upload?bucket=paused',
      },
      fallbackLink: 'https://dayof.love/photos/upload',
    })).toEqual({
      knownPhotoLinksCount: 0,
      preferredPhotoLink: 'https://dayof.love/photos/upload',
    });
  });

  it('uses stored links as a best-effort fallback before bucket data loads', () => {
    expect(getMessagePhotoLinkState({
      buckets: null,
      storedLinks: {
        first: 'https://dayof.love/photos/upload?bucket=first',
        second: 'https://dayof.love/photos/upload?bucket=second',
      },
      fallbackLink: 'https://dayof.love/photos/upload',
    })).toEqual({
      knownPhotoLinksCount: 2,
      preferredPhotoLink: 'https://dayof.love/photos/upload?bucket=first',
    });
  });
});
