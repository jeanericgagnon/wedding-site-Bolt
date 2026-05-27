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
  completedSurfaces?: GuestJourneySurface[];
}

export interface GuestJourneyCopy {
  title: string;
  detail: string;
  statusLabel: string;
  nextStepLabel: string;
  helperBadges: string[];
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
}

export interface GuestJourneyStep {
  key: GuestJourneySurface;
  label: string;
  status: 'done' | 'current' | 'next' | 'available';
}

const SURFACE_LABELS: Record<GuestJourneySurface, string> = {
  rsvp: 'RSVP',
  travel: 'Travel',
  photos: 'Photos',
  contact: 'Details',
  vault: 'Keepsake',
};

function getJourneyOrder(surface: GuestJourneySurface): GuestJourneySurface[] {
  switch (surface) {
    case 'travel':
      return ['travel', 'rsvp', 'contact', 'photos'];
    case 'photos':
      return ['photos', 'rsvp', 'travel', 'contact'];
    case 'contact':
      return ['contact', 'rsvp', 'photos', 'travel'];
    case 'vault':
      return ['vault', 'photos', 'rsvp', 'travel'];
    case 'rsvp':
    default:
      return ['rsvp', 'travel', 'photos', 'contact'];
  }
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
        statusLabel: 'Reply path ready',
        nextStepLabel: 'Next useful moves: travel details, photo sharing, or a quick contact update.',
        helperBadges: ['Reply here', 'Travel nearby', 'Photos nearby'],
        focusTitle: 'Answer first, then use the nearby lanes that support the trip',
        focusDetail: 'Once the reply is in, the best next move is whichever surface helps the guest actually arrive prepared: travel details, photos, or a small update.',
        bestNextMove: 'Submit the RSVP first, then open travel details or a quick guest update while the same wedding path is still in front of you.',
        decisionRule: 'Do not make guests re-enter the wedding story from scratch just to finish one more task.',
      };
    case 'photos':
      return {
        title: 'Share now, keep the rest within reach',
        detail: 'Photo sharing does not strand you. RSVP, travel details, and contact updates should still feel like part of one calm guest flow.',
        statusLabel: 'Photo path ready',
        nextStepLabel: 'Next useful moves: RSVP if you have not replied yet, then travel or guest updates.',
        helperBadges: ['Photo upload', 'RSVP nearby', 'Travel nearby'],
        focusTitle: 'Capture the moment without losing the practical path',
        focusDetail: 'Photos can be joyful and spontaneous, but the surrounding guest tasks should still stay one tap away so the weekend never fragments.',
        bestNextMove: 'Upload the moment you came to share, then return to RSVP or travel if any practical step is still open.',
        decisionRule: 'Let delight live on top of continuity, not instead of it.',
      };
    case 'contact':
      return {
        title: 'Update details without losing your place',
        detail: 'You can handle contact updates here, then head back to RSVP, travel details, or photo sharing from the same wedding path.',
        statusLabel: 'Update path ready',
        nextStepLabel: 'Next useful moves: RSVP first if needed, then photos or travel details.',
        helperBadges: ['Contact update', 'RSVP nearby', 'Photos nearby'],
        focusTitle: 'Fix the guest record, then return them to momentum',
        focusDetail: 'A contact edit should feel quick and surgical. Once it is done, the guest should be back on the wedding path instead of stranded in admin mode.',
        bestNextMove: 'Save the corrected guest details, then return the guest to RSVP, photos, or travel before the update turns into a dead end.',
        decisionRule: 'Correcting details should tighten the path, not turn into a separate workflow.',
      };
    case 'vault':
      return {
        title: 'The story stretches past the wedding weekend',
        detail: 'Anniversary notes live later in the story, but the wedding hub, RSVP, travel details, and photos should still be easy to reopen from here.',
        statusLabel: 'Keepsake path ready',
        nextStepLabel: 'The wedding path is still easy to reopen from here if you need it.',
        helperBadges: ['Keepsake mode', 'Hub nearby', 'Photos nearby'],
        focusTitle: 'Honor the long story without hiding the live one',
        focusDetail: 'Keepsake mode can feel softer and more reflective, but reopening the wedding path should still be obvious whenever the guest needs it.',
        bestNextMove: 'Leave one anniversary note or memory, then reopen the wedding hub or photo path the moment a practical task comes back into view.',
        decisionRule: 'Memory should extend the wedding experience, not obscure the practical path back into it.',
      };
    case 'travel':
      return {
        title: 'Travel is part of the same guest journey',
        detail: 'Guests should be able to move from travel details to RSVP, photos, and updates without feeling like they entered a different tool.',
        statusLabel: 'Travel path ready',
        nextStepLabel: 'Next useful moves: RSVP if needed, then photos or a quick contact update.',
        helperBadges: ['Travel details', 'RSVP nearby', 'Updates nearby'],
        focusTitle: 'Turn logistics into confidence, not friction',
        focusDetail: 'Travel details should make the trip feel easier, then hand the guest back to RSVP, updates, or photos without a context reset.',
        bestNextMove: 'Use the travel details to get oriented, then jump straight into RSVP or the one update that still affects the trip.',
        decisionRule: 'Treat travel as part of the wedding path, not a detached planning appendix.',
      };
    default:
      return {
        title: 'Everything guests need stays connected',
        detail: 'The wedding path should keep RSVP, updates, travel, and photos easy to reopen from one place.',
        statusLabel: 'Guest path ready',
        nextStepLabel: 'Use the next useful surface without re-entering a different flow.',
        helperBadges: ['One guest path', 'Travel nearby', 'Photos nearby'],
        focusTitle: 'Keep every guest move inside one recognizable story',
        focusDetail: 'The path works best when each follow-up surface still feels like the same wedding, not a stack of separate tools.',
        bestNextMove: 'Take the next practical guest step from the same path instead of backing out and re-finding the wedding from scratch.',
        decisionRule: 'Continuity beats cleverness when guests are moving quickly.',
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

export function buildGuestJourneySteps(context: GuestJourneyContext): GuestJourneyStep[] {
  const completed = new Set(context.completedSurfaces ?? []);
  const order = getJourneyOrder(context.currentSurface);
  const nextSurface = order.find((surface) => surface !== context.currentSurface && !completed.has(surface)) ?? null;

  return order.map((surface) => {
    if (surface === context.currentSurface) {
      return { key: surface, label: SURFACE_LABELS[surface], status: 'current' };
    }
    if (completed.has(surface)) {
      return { key: surface, label: SURFACE_LABELS[surface], status: 'done' };
    }
    if (surface === nextSurface) {
      return { key: surface, label: SURFACE_LABELS[surface], status: 'next' };
    }
    return { key: surface, label: SURFACE_LABELS[surface], status: 'available' };
  });
}
