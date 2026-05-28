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
  watchout: string;
  sequence: Array<{
    status: 'current' | 'next' | 'then';
    title: string;
    detail: string;
  }>;
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
        watchout: 'If the RSVP lane dumps guests into a dead end, even helpful nearby surfaces start to feel like separate chores instead of one calm wedding path.',
        sequence: [
          {
            status: 'current',
            title: 'Reply while the invitation context is still fresh',
            detail: 'Use the RSVP lane to lock in the answer before the guest path breaks into side errands.',
          },
          {
            status: 'next',
            title: 'Handle the one practical follow-through that helps the trip',
            detail: 'Move straight into travel details or a small guest update while the same wedding path is still in front of you.',
          },
          {
            status: 'then',
            title: 'Let delight stay nearby without replacing the essentials',
            detail: 'Once the practical step is done, photos and lighter guest moments can stay one tap away without forcing a reset.',
          },
        ],
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
        watchout: 'A fun photo lane stops feeling generous the moment it strands guests away from RSVP, travel, or the one practical step they still needed.',
        sequence: [
          {
            status: 'current',
            title: 'Share the moment that brought you here',
            detail: 'Upload the photo while the memory is immediate instead of making guests hunt for the right lane later.',
          },
          {
            status: 'next',
            title: 'Return to the one open practical step',
            detail: 'If RSVP, travel, or a guest update still matters, jump back there directly before the path loses momentum.',
          },
          {
            status: 'then',
            title: 'Keep the rest of the weekend within reach',
            detail: 'After that, the path should still feel like one wedding story instead of a media detour and a separate logistics tool.',
          },
        ],
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
        watchout: 'If a simple detail correction feels like admin purgatory, guests will postpone it and carry bad contact or RSVP context into every later step.',
        sequence: [
          {
            status: 'current',
            title: 'Correct the details cleanly',
            detail: 'Use this lane to fix the guest record without turning the update into its own mini-project.',
          },
          {
            status: 'next',
            title: 'Return to the real wedding task',
            detail: 'Move straight back to RSVP, travel, or photos once the correction is saved so the path keeps its momentum.',
          },
          {
            status: 'then',
            title: 'Let the fixed details quietly support everything else',
            detail: 'After the record is clean, the surrounding guest steps should simply work better without extra explanation.',
          },
        ],
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
        bestNextMove: 'Leave one anniversary note or memory, then reopen the wedding hub or photo sharing path the moment a practical task comes back into view.',
        decisionRule: 'Memory should extend the wedding experience, not obscure the practical path back into it.',
        watchout: 'If keepsake mode makes the live wedding path feel buried, memory starts competing with continuity instead of enriching it.',
        sequence: [
          {
            status: 'current',
            title: 'Leave the memory or anniversary note you came to share',
            detail: 'Use keepsake mode for the reflective moment without pretending the practical wedding path disappeared.',
          },
          {
            status: 'next',
            title: 'Reopen the wedding hub or photo sharing path when the live story returns',
            detail: 'If guests need something practical again, make the active wedding surfaces easy to reenter immediately.',
          },
          {
            status: 'then',
            title: 'Let memory sit alongside continuity',
            detail: 'The long story should enrich the wedding experience, not hide the route back into it.',
          },
        ],
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
        watchout: 'If travel reads like a separate planning tool, guests will miss the one RSVP or update step that was supposed to ride right alongside it.',
        sequence: [
          {
            status: 'current',
            title: 'Get oriented for the trip',
            detail: 'Use the travel lane to remove uncertainty about where to be, when, and how the weekend fits together.',
          },
          {
            status: 'next',
            title: 'Resolve the one guest step that still affects the trip',
            detail: 'If RSVP or a detail update is still open, handle that while the travel context is still loaded.',
          },
          {
            status: 'then',
            title: 'Rejoin the broader wedding flow without a reset',
            detail: 'After logistics feel steady, the path back to photos, updates, or the hub should still feel seamless.',
          },
        ],
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
        watchout: 'Every extra reset teaches guests to trust their own memory over the path you built for them, which is how useful surfaces quietly stop getting used.',
        sequence: [
          {
            status: 'current',
            title: 'Stay inside the same wedding path',
            detail: 'Let the current guest surface carry the context so nobody has to reconstruct where they are.',
          },
          {
            status: 'next',
            title: 'Take the next practical guest step directly',
            detail: 'Move into the next useful lane without backing out and re-finding the wedding from scratch.',
          },
          {
            status: 'then',
            title: 'Keep the path recognizable as the story expands',
            detail: 'As guests touch travel, updates, photos, or keepsake mode, the throughline should still feel intact.',
          },
        ],
      };
  }
}

export function buildGuestJourneyLinks(context: GuestJourneyContext): GuestJourneyLink[] {
  const { currentSurface, siteSlug, inviteToken, previewGuest } = context;
  const normalizedSlug = siteSlug?.trim().toLowerCase() || '';
  if (!normalizedSlug) return [];

  const links: GuestJourneyLink[] = [];

  const hubParams = new URLSearchParams();
  appendPreviewParams(hubParams, previewGuest, 'public');
  if (inviteToken) {
    hubParams.set('invite_token', inviteToken);
  }
  links.push({
    key: 'hub',
    label: 'Wedding hub',
    href: `/site/${normalizedSlug}${toSearchString(hubParams)}`,
  });

  const travelParams = new URLSearchParams();
  appendPreviewParams(travelParams, previewGuest, 'travel');
  if (inviteToken) {
    travelParams.set('invite_token', inviteToken);
  }
  links.push({
    key: 'travel',
    label: 'Travel details',
    href: `/site/${normalizedSlug}${toSearchString(travelParams)}#travel`,
  });

  const rsvpParams = new URLSearchParams();
  rsvpParams.set('site', normalizedSlug);
  if (inviteToken) {
    rsvpParams.set('invite_token', inviteToken);
  }
  appendPreviewParams(rsvpParams, previewGuest, 'rsvp');
  links.push({
    key: 'rsvp',
    label: 'RSVP',
    href: `/rsvp${toSearchString(rsvpParams)}`,
  });

  const photoParams = new URLSearchParams();
  appendPreviewParams(photoParams, previewGuest, 'photos');
  if (inviteToken) {
    photoParams.set('invite_token', inviteToken);
  }
  links.push({
    key: 'photos',
    label: 'Photo sharing',
    href: `/site/${normalizedSlug}${toSearchString(photoParams)}`,
  });

  const contactParams = new URLSearchParams();
  appendPreviewParams(contactParams, previewGuest, 'contact');
  if (inviteToken) {
    contactParams.set('invite_token', inviteToken);
  }
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
