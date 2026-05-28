function trimTrailingSlash(origin: string): string {
  return origin.replace(/\/+$/, '');
}

export function buildInviteOnlySiteAccessUrl(origin: string, siteSlug: string, guestAccessToken: string): string {
  const baseOrigin = trimTrailingSlash(origin);
  return `${baseOrigin}/site/${siteSlug}?guest_access_token=${encodeURIComponent(guestAccessToken)}`;
}

export function buildRsvpInviteUrl(origin: string, inviteToken: string): string {
  const baseOrigin = trimTrailingSlash(origin);
  return `${baseOrigin}/rsvp?invite_token=${encodeURIComponent(inviteToken)}`;
}
