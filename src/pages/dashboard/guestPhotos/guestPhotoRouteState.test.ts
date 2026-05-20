import { describe, expect, it } from 'vitest';
import { resolveGuestPhotoScrollTargets } from './guestPhotoRouteState';

describe('resolveGuestPhotoScrollTargets', () => {
  it('maps guestbook tools to guestbook-first anchors', () => {
    expect(resolveGuestPhotoScrollTargets('?tool=guestbook')).toEqual([
      'photos-tool-guestbook',
      'photos-tool-hub-controls',
    ]);
  });

  it('maps recap tools to the recap anchor', () => {
    expect(resolveGuestPhotoScrollTargets('?tool=recap')).toEqual(['photos-tool-recap']);
  });

  it('maps video tools to review-first anchors', () => {
    expect(resolveGuestPhotoScrollTargets('?tool=video')).toEqual([
      'photos-tool-review',
      'photos-tool-memory-flow',
    ]);
  });
});
