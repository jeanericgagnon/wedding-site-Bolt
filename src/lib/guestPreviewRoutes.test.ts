import { describe, expect, it } from 'vitest';
import { buildGuestPreviewRoutes } from './guestPreviewRoutes';

describe('guestPreviewRoutes', () => {
  it('prefers the public site guest view when a site slug exists', () => {
    expect(buildGuestPreviewRoutes({
      guestId: 'guest-1',
      inviteToken: 'private-token',
      publicSiteSlug: 'maya-and-rowan',
    })).toEqual({
      primaryHref: '/site/maya-and-rowan?previewGuest=guest-1&previewSurface=public',
      rsvpHref: '/rsvp?token=private-token&previewGuest=guest-1&previewSurface=rsvp',
      publicSiteHref: '/site/maya-and-rowan?previewGuest=guest-1&previewSurface=public',
      contactHref: '/guest-contact/maya-and-rowan?invite_token=private-token&previewGuest=guest-1&previewSurface=contact',
    });
  });

  it('falls back to RSVP preview when no public site slug exists', () => {
    expect(buildGuestPreviewRoutes({
      guestId: 'guest-1',
      inviteToken: 'private-token',
      publicSiteSlug: null,
    })).toEqual({
      primaryHref: '/rsvp?token=private-token&previewGuest=guest-1&previewSurface=rsvp',
      rsvpHref: '/rsvp?token=private-token&previewGuest=guest-1&previewSurface=rsvp',
      publicSiteHref: null,
      contactHref: null,
    });
  });

  it('returns no routes when there is no previewable guest path yet', () => {
    expect(buildGuestPreviewRoutes({
      guestId: 'guest-1',
      inviteToken: null,
      publicSiteSlug: null,
    })).toEqual({
      primaryHref: null,
      rsvpHref: null,
      publicSiteHref: null,
      contactHref: null,
    });
  });
});
