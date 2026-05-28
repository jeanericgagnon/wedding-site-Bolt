import { describe, expect, it } from 'vitest';

import { getGuestPhotoBucketShareLink } from './guestPhotoBucketShareState';

describe('guestPhotoBucketShareState', () => {
  it('returns a share link only when the bucket is active and the link is real', () => {
    expect(getGuestPhotoBucketShareLink({ isActive: true, uploadLink: 'https://dayof.love/photos/upload?t=abc' })).toBe(
      'https://dayof.love/photos/upload?t=abc',
    );
    expect(getGuestPhotoBucketShareLink({ isActive: true, uploadLink: '   ' })).toBe('');
    expect(getGuestPhotoBucketShareLink({ isActive: false, uploadLink: 'https://dayof.love/photos/upload?t=abc' })).toBe('');
  });
});
