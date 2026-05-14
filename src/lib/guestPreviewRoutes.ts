export interface GuestPreviewRouteInput {
  guestId: string;
  inviteToken?: string | null;
  publicSiteSlug?: string | null;
  preferredLanguage?: string | null;
}

export interface GuestPreviewRoutes {
  primaryHref: string | null;
  rsvpHref: string | null;
  publicSiteHref: string | null;
  contactHref: string | null;
}

import { appendGuestLanguageToInternalHref } from './guestLanguagePreference';

export function buildGuestPreviewRoutes(input: GuestPreviewRouteInput): GuestPreviewRoutes {
  const guestId = input.guestId.trim();
  const inviteToken = input.inviteToken?.trim() || '';
  const publicSiteSlug = input.publicSiteSlug?.trim() || '';
  const preferredLanguage = input.preferredLanguage?.trim() || null;

  const rsvpHref = inviteToken
    ? appendGuestLanguageToInternalHref(
        `/rsvp?token=${encodeURIComponent(inviteToken)}&previewGuest=${encodeURIComponent(guestId)}&previewSurface=rsvp`,
        preferredLanguage,
      )
    : null;
  const publicSiteHref = publicSiteSlug
    ? appendGuestLanguageToInternalHref(
        `/site/${encodeURIComponent(publicSiteSlug)}?previewGuest=${encodeURIComponent(guestId)}&previewSurface=public`,
        preferredLanguage,
      )
    : null;
  const contactHref = publicSiteSlug && inviteToken
    ? appendGuestLanguageToInternalHref(
        `/guest-contact/${encodeURIComponent(publicSiteSlug)}?invite_token=${encodeURIComponent(inviteToken)}&previewGuest=${encodeURIComponent(guestId)}&previewSurface=contact`,
        preferredLanguage,
      )
    : null;

  return {
    primaryHref: publicSiteHref ?? rsvpHref,
    rsvpHref,
    publicSiteHref,
    contactHref,
  };
}
