export type GuestJourneySurface = 'rsvp' | 'travel' | 'photos' | 'contact' | 'vault';

export interface GuestJourneyLink {
  key: 'hub' | 'travel' | 'rsvp' | 'photos' | 'contact';
  label: string;
  href: string;
}

export interface GuestJourneyContext {
  currentSurface: GuestJourneySurface;
  siteSlug?: string | null;
  inviteToken?: string | null;
  previewGuest?: string | null;
  isHubEntry?: boolean;
}

export interface GuestJourneyCopy {
  title: string;
  detail: string;
}

function toSearchString(params: URLSearchParams): string {
  const query = params.toString();
  return query ? `?${query}` : '';
}

function appendPreviewParams(
  params: URLSearchParams,
  previewGuest: string | null | undefined,
  previewSurface?: string,
) {
  if (previewGuest) {
    params.set('previewGuest', previewGuest);
  }
  if (previewSurface) {
    params.set('previewSurface', previewSurface);
  }
}

export function getGuestJourneyCopy(surface: GuestJourneySurface): GuestJourneyCopy {
  switch (surface) {
    case 'rsvp':
      return {
        title: 'Everything stays on the same guest path',
        detail: 'Reply here, then jump to travel, photos, or contact updates from the same wedding path whenever you need them.',
      };
    case 'photos':
      return {
        title: 'Share now, keep the rest within reach',
        detail: 'Photo sharing does not strand you. RSVP, travel details, and contact updates should still feel like part of one calm guest flow.',
      };
    case 'contact':
      return {
        title: 'Update details without losing your place',
        detail: 'You can handle contact updates here, then head back to RSVP, travel details, or photo sharing from the same wedding path.',
      };
    case 'vault':
      return {
        title: 'The story stretches past the wedding weekend',
        detail: 'Anniversary notes live later in the story, but the wedding hub, RSVP, travel details, and photos should still be easy to reopen from here.',
      };
    case 'travel':
      return {
        title: 'Travel is part of the same guest journey',
        detail: 'Guests should be able to move from travel details to RSVP, photos, and updates without feeling like they entered a different tool.',
      };
    default:
      return {
        title: 'Everything guests need stays connected',
        detail: 'The wedding path should keep RSVP, updates, travel, and photos easy to reopen from one place.',
      };
  }
}

export function buildGuestJourneyLinks(context: GuestJourneyContext): GuestJourneyLink[] {
  const { currentSurface, siteSlug, inviteToken, previewGuest, isHubEntry } = context;
  const normalizedSlug = siteSlug?.trim().toLowerCase() || '';
  if (!normalizedSlug) return [];

  const links: GuestJourneyLink[] = [];

  const hubParams = new URLSearchParams();
  appendPreviewParams(hubParams, previewGuest, 'public');
  if (inviteToken) {
    hubParams.set('token', inviteToken);
  }
  links.push({
    key: 'hub',
    label: 'Wedding hub',
    href: `/site/${normalizedSlug}${toSearchString(hubParams)}`,
  });

  const travelParams = new URLSearchParams();
  appendPreviewParams(travelParams, previewGuest, 'travel');
  if (inviteToken) {
    travelParams.set('token', inviteToken);
  }
  links.push({
    key: 'travel',
    label: 'Travel details',
    href: `/site/${normalizedSlug}${toSearchString(travelParams)}#travel`,
  });

  const rsvpParams = new URLSearchParams();
  rsvpParams.set('site', normalizedSlug);
  if (inviteToken) {
    rsvpParams.set('token', inviteToken);
  }
  links.push({
    key: 'rsvp',
    label: 'RSVP',
    href: `/rsvp${toSearchString(rsvpParams)}`,
  });

  const photoParams = new URLSearchParams();
  photoParams.set('site', normalizedSlug);
  if (inviteToken) {
    photoParams.set('t', inviteToken);
  }
  if (isHubEntry) {
    photoParams.set('hub', '1');
  }
  appendPreviewParams(photoParams, previewGuest, 'photos');
  links.push({
    key: 'photos',
    label: 'Upload photos',
    href: `/photos/upload${toSearchString(photoParams)}`,
  });

  const contactParams = new URLSearchParams();
  appendPreviewParams(contactParams, previewGuest, 'contact');
  links.push({
    key: 'contact',
    label: 'Update details',
    href: `/guest-contact/${normalizedSlug}${toSearchString(contactParams)}`,
  });

  return links.filter((link) => {
    switch (currentSurface) {
      case 'travel':
        return link.key !== 'travel';
      case 'rsvp':
        return link.key !== 'rsvp';
      case 'photos':
        return link.key !== 'photos';
      case 'contact':
        return link.key !== 'contact';
      case 'vault':
        return true;
      default:
        return true;
    }
  });
}
