import { describe, expect, it } from 'vitest';

import { buildPhotoRequestTemplateBody, getMessagePhotoLinkState } from './messagePhotoLinkState';

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

  it('falls back to the public wedding hub when no active links are available', () => {
    expect(getMessagePhotoLinkState({
      buckets: [{ id: 'paused', is_active: false }],
      storedLinks: {
        paused: 'https://dayof.love/photos/upload?bucket=paused',
      },
      fallbackLink: 'https://dayof.love/site/maya-leo',
    })).toEqual({
      knownPhotoLinksCount: 0,
      preferredPhotoLink: 'https://dayof.love/site/maya-leo',
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

  it('keeps the photo request draft honest when no guest link is ready yet', () => {
    expect(buildPhotoRequestTemplateBody('')).toBe(
      'We are getting photo sharing ready for this event and will send the guest link soon.',
    );

    expect(buildPhotoRequestTemplateBody('https://dayof.love/site/maya-leo')).toBe(
      'We made a place where everyone can share their favorite moments from the event. Open photo sharing here: https://dayof.love/site/maya-leo',
    );
  });
});
