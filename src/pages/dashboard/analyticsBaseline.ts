export interface AnalyticsBaselineInput {
  totalGuests: number;
  confirmedGuests: number;
  declinedGuests: number;
  pendingGuests: number;
  contactableGuests: number;
  privacyMode?: 'public' | 'password_protected' | 'invite_only';
  registryItemCount: number;
  photoAlbumCount: number;
  activePhotoAlbumCount: number;
  interactiveSuggestionCount: number;
}

export interface AnalyticsBaselineMetric {
  label: string;
  value: string;
  detail: string;
  source: 'measured' | 'derived';
}

export interface AnalyticsConfidenceSummary {
  title: string;
  detail: string;
  statusLabel: string;
  tone: 'success' | 'warning' | 'error';
}

export interface AnalyticsConfidenceCard {
  label: string;
  value: string;
  detail: string;
  tone: 'success' | 'warning' | 'error';
}

export interface AnalyticsNextMove {
  title: string;
  detail: string;
  ctaLabel: string;
  target: 'guests' | 'messages' | 'registry' | 'photos' | 'builder-polish' | 'settings';
}

function pct(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10) / 10;
}

export function buildAnalyticsBaseline(input: AnalyticsBaselineInput): AnalyticsBaselineMetric[] {
  const respondedGuests = input.confirmedGuests + input.declinedGuests;
  const attendanceRate = input.totalGuests > 0 ? pct(input.confirmedGuests * 100, input.totalGuests) : 0;
  const contactCoverage = input.totalGuests > 0 ? pct(input.contactableGuests * 100, input.totalGuests) : 0;
  return [
    {
      label: 'RSVP response rate',
      value: `${pct(respondedGuests * 100, input.totalGuests)}%`,
      detail: `${respondedGuests} of ${input.totalGuests} guests have responded.`,
      source: 'measured',
    },
    {
      label: 'Attendance rate',
      value: `${attendanceRate}%`,
      detail: `${input.confirmedGuests} of ${input.totalGuests} invited guests are currently marked attending.`,
      source: 'derived',
    },
    {
      label: 'Still waiting',
      value: `${input.pendingGuests}`,
      detail: input.pendingGuests === 0 ? 'No outstanding RSVP backlog right now.' : `${input.pendingGuests} guests still need a reply.`,
      source: 'measured',
    },
    {
      label: 'Contact coverage',
      value: `${contactCoverage}%`,
      detail: `${input.contactableGuests} of ${input.totalGuests} guests have email or phone contact available.`,
      source: 'derived',
    },
    {
      label: 'Registry readiness',
      value: `${input.registryItemCount}`,
      detail: input.registryItemCount === 0 ? 'No registry items are live yet.' : `${input.registryItemCount} registry item${input.registryItemCount === 1 ? '' : 's'} ready for guests.`,
      source: 'measured',
    },
    {
      label: 'Guest photo prompts',
      value: `${input.interactiveSuggestionCount}`,
      detail: input.interactiveSuggestionCount === 0 ? 'No guest suggestions have come in yet.' : `${input.interactiveSuggestionCount} suggestion${input.interactiveSuggestionCount === 1 ? '' : 's'} captured so far.`,
      source: 'measured',
    },
    {
      label: 'Photo collection setup',
      value: `${input.activePhotoAlbumCount}/${input.photoAlbumCount}`,
      detail: input.photoAlbumCount === 0 ? 'No photo albums are ready yet.' : `${input.activePhotoAlbumCount} active album${input.activePhotoAlbumCount === 1 ? '' : 's'} out of ${input.photoAlbumCount} total album${input.photoAlbumCount === 1 ? '' : 's'}.`,
      source: 'measured',
    },
  ];
}

export function buildAnalyticsConfidenceSummary(input: AnalyticsBaselineInput): AnalyticsConfidenceSummary {
  const respondedGuests = input.confirmedGuests + input.declinedGuests;
  const responseRate = input.totalGuests > 0 ? pct(respondedGuests * 100, input.totalGuests) : 0;
  const contactCoverage = input.totalGuests > 0 ? pct(input.contactableGuests * 100, input.totalGuests) : 0;
  const guestExperienceReady = input.registryItemCount > 0 && input.activePhotoAlbumCount > 0;
  const restrictedAccess = input.privacyMode === 'password_protected' || input.privacyMode === 'invite_only';
  const accessLabel = input.privacyMode === 'invite_only' ? 'invite-only' : 'password-protected';

  if (input.pendingGuests >= Math.max(8, Math.round(input.totalGuests * 0.12))) {
    return {
      title: 'Guest confidence still depends on a few more replies',
      detail: 'The board has enough signal to guide you, but the next meaningful lift is still getting the pending RSVP group smaller before you trust the picture completely.',
      statusLabel: `${input.pendingGuests} still pending`,
      tone: 'warning',
    };
  }

  if (contactCoverage < 85) {
    return {
      title: 'The board is useful, but contact coverage is still softer than it should be',
      detail: 'When direct email or phone coverage is thin, every later RSVP, reminder, and day-of update feels shakier than it needs to.',
      statusLabel: `${contactCoverage}% contact coverage`,
      tone: 'warning',
    };
  }

  if (!guestExperienceReady) {
    return {
      title: 'Guests can find the site, but the experience still feels a little thin',
      detail: 'Response signals are healthy enough, yet registry and photo follow-through are not both fully carrying their share of guest confidence.',
      statusLabel: guestExperienceReady ? 'Guest-facing extras ready' : 'Guest-facing extras still growing',
      tone: 'warning',
    };
  }

  if (restrictedAccess) {
    return {
      title: 'Guest trust also depends on a clean access handoff right now',
      detail: `The board looks healthy, but the site is ${accessLabel}. That means guest confidence now depends on whether the right password or invite path is traveling with every handoff.`,
      statusLabel: `${accessLabel} access in play`,
      tone: 'warning',
    };
  }

  if (responseRate >= 80 && contactCoverage >= 90) {
    return {
      title: 'The measured baseline looks trustworthy right now',
      detail: 'Guests are responding, the contact layer is strong, and the public extras are active enough that the board reads like product truth instead of wishful thinking.',
      statusLabel: 'High confidence baseline',
      tone: 'success',
    };
  }

  return {
    title: 'The baseline is healthy enough to guide your next moves',
    detail: 'Nothing here is shouting, but the board still benefits from one more pass on replies, contact coverage, or guest-facing depth before you treat it as fully settled.',
    statusLabel: 'Useful, still maturing',
    tone: 'warning',
  };
}

export function buildAnalyticsConfidenceCards(input: AnalyticsBaselineInput): AnalyticsConfidenceCard[] {
  const respondedGuests = input.confirmedGuests + input.declinedGuests;
  const responseRate = input.totalGuests > 0 ? pct(respondedGuests * 100, input.totalGuests) : 0;
  const contactCoverage = input.totalGuests > 0 ? pct(input.contactableGuests * 100, input.totalGuests) : 0;
  const guestFacingDepth = (input.registryItemCount > 0 ? 1 : 0) + (input.activePhotoAlbumCount > 0 ? 1 : 0) + (input.interactiveSuggestionCount > 0 ? 1 : 0);

  return [
    {
      label: 'Guest confidence',
      value: `${responseRate}%`,
      detail: input.pendingGuests > 0
        ? `${input.pendingGuests} guests can still change how the board feels.`
        : 'The guest list is no longer waiting on replies.',
      tone: responseRate >= 85 ? 'success' : responseRate >= 65 ? 'warning' : 'error',
    },
    {
      label: 'Reachability trust',
      value: `${contactCoverage}%`,
      detail: input.totalGuests === 0
        ? 'Add guests before this signal becomes meaningful.'
        : `${input.contactableGuests} of ${input.totalGuests} guests can be reached directly.`,
      tone: contactCoverage >= 90 ? 'success' : contactCoverage >= 75 ? 'warning' : 'error',
    },
    {
      label: 'Guest-facing depth',
      value: `${guestFacingDepth}/3`,
      detail: guestFacingDepth === 3
        ? 'Registry, photos, and guest prompts are all actively helping the guest path.'
        : guestFacingDepth === 2
          ? 'Two of the three main guest-facing depth signals are already live.'
          : guestFacingDepth === 1
            ? 'Only one guest-facing extra is carrying confidence right now.'
            : 'The guest path still needs more than the basics to feel fully cared for.',
      tone: guestFacingDepth === 3 ? 'success' : guestFacingDepth === 2 ? 'warning' : 'error',
    },
  ];
}

export function buildAnalyticsNextMove(input: AnalyticsBaselineInput): AnalyticsNextMove {
  const respondedGuests = input.confirmedGuests + input.declinedGuests;
  const responseRate = input.totalGuests > 0 ? pct(respondedGuests * 100, input.totalGuests) : 0;
  const contactCoverage = input.totalGuests > 0 ? pct(input.contactableGuests * 100, input.totalGuests) : 0;
  const restrictedAccess = input.privacyMode === 'password_protected' || input.privacyMode === 'invite_only';

  if (input.pendingGuests >= Math.max(8, Math.round(input.totalGuests * 0.12))) {
    return {
      title: 'Close the RSVP gap before trusting the board more deeply',
      detail: `${input.pendingGuests} guests can still materially change how the rest of the board feels. Follow-up is worth more than extra polish right now.`,
      ctaLabel: 'Review guests',
      target: 'guests',
    };
  }

  if (contactCoverage < 85) {
    return {
      title: 'Tighten contact coverage before the next message wave',
      detail: 'A softer reachability layer makes every reminder and day-of update less reliable than it needs to be.',
      ctaLabel: 'Fix guest contacts',
      target: 'guests',
    };
  }

  if (input.registryItemCount === 0) {
    return {
      title: 'Give guests one stronger gifting signal',
      detail: 'A small live registry set does more for guest confidence than waiting for a perfect one.',
      ctaLabel: 'Open registry',
      target: 'registry',
    };
  }

  if (input.activePhotoAlbumCount === 0) {
    return {
      title: 'Turn on one guest-ready photo path',
      detail: 'Photo contribution is one of the easiest ways to make the guest experience feel alive instead of merely published.',
      ctaLabel: 'Open photos',
      target: 'photos',
    };
  }

  if (restrictedAccess) {
    return {
      title: 'Run one guest access pass before broader sharing',
      detail: input.privacyMode === 'invite_only'
        ? 'The guest-facing site is not public, so make sure the real invite path is what guests are receiving instead of a generic broad-share link.'
        : 'The site is password-protected, so the next lift is making sure the password instructions travel with every guest-facing link or print pack.',
      ctaLabel: 'Review guest access',
      target: 'settings',
    };
  }

  if (responseRate >= 80 && contactCoverage >= 90) {
    return {
      title: 'The measured baseline is healthy enough for a polish pass',
      detail: 'This is a good moment to improve the live guest-facing story instead of chasing missing basics.',
      ctaLabel: 'Open builder',
      target: 'builder-polish',
    };
  }

  return {
    title: 'Use messages to keep the baseline moving',
    detail: 'The board is useful already, and the next lift is turning that signal into one clean guest-facing nudge.',
    ctaLabel: 'Open messages',
    target: 'messages',
  };
}
