export interface GuestPreviewRouteInput {
  guestId: string;
  inviteToken?: string | null;
  publicSiteSlug?: string | null;
}

export interface GuestPreviewRoutes {
  primaryHref: string | null;
  rsvpHref: string | null;
  publicSiteHref: string | null;
  contactHref: string | null;
}

export function buildGuestPreviewRoutes(input: GuestPreviewRouteInput): GuestPreviewRoutes {
  const guestId = input.guestId.trim();
  const inviteToken = input.inviteToken?.trim() || '';
  const publicSiteSlug = input.publicSiteSlug?.trim() || '';

  const rsvpHref = inviteToken
    ? `/rsvp?token=${encodeURIComponent(inviteToken)}&previewGuest=${encodeURIComponent(guestId)}&previewSurface=rsvp`
    : null;
  const publicSiteHref = publicSiteSlug
    ? `/site/${encodeURIComponent(publicSiteSlug)}?previewGuest=${encodeURIComponent(guestId)}&previewSurface=public`
    : null;
  const contactHref = publicSiteSlug && inviteToken
    ? `/guest-contact/${encodeURIComponent(publicSiteSlug)}?invite_token=${encodeURIComponent(inviteToken)}&previewGuest=${encodeURIComponent(guestId)}&previewSurface=contact`
    : null;

  return {
    primaryHref: publicSiteHref ?? rsvpHref,
    rsvpHref,
    publicSiteHref,
    contactHref,
  };
}
