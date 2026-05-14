import { describe, expect, it } from 'vitest';
import { buildGuestPreviewRoutes } from './guestPreviewRoutes';

describe('guestPreviewRoutes', () => {
  it('prefers the public site guest view when a site slug exists', () => {
    expect(buildGuestPreviewRoutes({
      guestId: 'guest-1',
      inviteToken: 'private-token',
      publicSiteSlug: 'maya-and-rowan',
      preferredLanguage: 'es-MX',
    })).toEqual({
      primaryHref: '/site/maya-and-rowan?previewGuest=guest-1&previewSurface=public&guestLang=es',
      rsvpHref: '/rsvp?token=private-token&previewGuest=guest-1&previewSurface=rsvp&guestLang=es',
      publicSiteHref: '/site/maya-and-rowan?previewGuest=guest-1&previewSurface=public&guestLang=es',
      contactHref: '/guest-contact/maya-and-rowan?invite_token=private-token&previewGuest=guest-1&previewSurface=contact&guestLang=es',
    });
  });

  it('falls back to RSVP preview when no public site slug exists', () => {
    expect(buildGuestPreviewRoutes({
      guestId: 'guest-1',
      inviteToken: 'private-token',
      publicSiteSlug: null,
      preferredLanguage: 'fr',
    })).toEqual({
      primaryHref: '/rsvp?token=private-token&previewGuest=guest-1&previewSurface=rsvp&guestLang=fr',
      rsvpHref: '/rsvp?token=private-token&previewGuest=guest-1&previewSurface=rsvp&guestLang=fr',
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
