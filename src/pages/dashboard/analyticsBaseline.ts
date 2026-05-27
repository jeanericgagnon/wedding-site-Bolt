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
  bestNextMove: string;
  decisionRule: string;
  tone: 'success' | 'warning' | 'error';
  sequence: Array<{
    id: 'steady' | 'act' | 'hold';
    status: 'current' | 'next' | 'then';
    title: string;
    detail: string;
  }>;
}

function buildAnalyticsSequence(
  currentTitle: string,
  currentDetail: string,
  nextTitle: string,
  nextDetail: string,
  thenTitle: string,
  thenDetail: string,
): AnalyticsConfidenceSummary['sequence'] {
  return [
    { id: 'steady', status: 'current', title: currentTitle, detail: currentDetail },
    { id: 'act', status: 'next', title: nextTitle, detail: nextDetail },
    { id: 'hold', status: 'then', title: thenTitle, detail: thenDetail },
  ];
}

export interface AnalyticsConfidenceCard {
  label: string;
  value: string;
  detail: string;
  tone: 'success' | 'warning' | 'error';
}

export interface AnalyticsNextMove {
  priorityLabel: string;
  title: string;
  detail: string;
  whyNow: string;
  decisionRule: string;
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
      bestNextMove: 'Review the still-pending guests first, clear the biggest reply pockets, and only then let the calmer-looking metrics influence bigger decisions.',
      decisionRule: 'Do not let healthy vanity metrics outrank a still-noisy RSVP picture.',
      tone: 'warning',
      sequence: buildAnalyticsSequence(
        'Treat pending replies as the real truth gap',
        'The board is useful, but a large pending RSVP pocket can still reshape what every calmer metric means.',
        'Clear the biggest reply pockets next',
        'Shrink the pending group first so the guest picture becomes sturdy enough to guide stronger downstream decisions.',
        'Let the calmer metrics support the next move',
        'Once the RSVP board is quieter, use reachability and guest-facing depth as support instead of letting them compete with reply truth.',
      ),
    };
  }

  if (contactCoverage < 85) {
    return {
      title: 'The board is useful, but contact coverage is still softer than it should be',
      detail: 'When direct email or phone coverage is thin, every later RSVP, reminder, and day-of update feels shakier than it needs to.',
      statusLabel: `${contactCoverage}% contact coverage`,
      bestNextMove: 'Fix the missing contact paths now, then come back to reminders or day-of messaging once the list can actually hear from you cleanly.',
      decisionRule: 'Tighten the contact layer before assuming later outreach will behave cleanly.',
      tone: 'warning',
      sequence: buildAnalyticsSequence(
        'Treat contact gaps as the trust leak',
        'Soft reachability means the board looks healthier than the guest experience will actually feel when it is time to send something.',
        'Repair the direct contact layer next',
        'Fill in the missing email or phone paths before you spend more energy on cadence, nudges, or day-of messages.',
        'Return to messaging once the list can hear it',
        'After the contact layer is solid, let reminders and guest updates do the quieter work they were supposed to do.',
      ),
    };
  }

  if (!guestExperienceReady) {
    return {
      title: 'Guests can find the site, but the experience still feels a little thin',
      detail: 'Response signals are healthy enough, yet registry and photo follow-through are not both fully carrying their share of guest confidence.',
      statusLabel: guestExperienceReady ? 'Guest-facing extras ready' : 'Guest-facing extras still growing',
      bestNextMove: input.registryItemCount === 0
        ? 'Add one honest registry lane first, then return to the memory side once gifting no longer feels blank.'
        : 'Turn on one active photo contribution path next, then let the rest of the guest experience build from that living signal.',
      decisionRule: 'Treat guest-facing depth as part of trust, not as decorative polish.',
      tone: 'warning',
      sequence: buildAnalyticsSequence(
        'Notice the thin guest-facing layer',
        'The board is stable enough to be useful, but guests still need a little more visible depth to trust the experience fully.',
        'Strengthen the missing public-facing lane next',
        'Add the first honest registry path or one active photo contribution lane before you spend time on softer polish.',
        'Let that living signal carry the rest',
        'Once one more guest-facing lane is real, let the experience grow from there instead of widening the project all at once.',
      ),
    };
  }

  if (restrictedAccess) {
    return {
      title: 'Guest trust also depends on a clean access handoff right now',
      detail: `The board looks healthy, but the site is ${accessLabel}. That means guest confidence now depends on whether the right password or invite path is traveling with every handoff.`,
      statusLabel: `${accessLabel} access in play`,
      bestNextMove: input.privacyMode === 'invite_only'
        ? 'Run one invite-path pass now, then make sure the real guest links are the ones getting reused everywhere.'
        : 'Check the password handoff once now, then reuse the same access instructions anywhere the site gets shared or printed.',
      decisionRule: 'A strong board still needs the right access instructions traveling with it.',
      tone: 'warning',
      sequence: buildAnalyticsSequence(
        'Treat access clarity as part of trust',
        `The metrics are healthy, but a ${accessLabel} site still depends on front-door clarity to feel reliable to guests.`,
        'Check the live access handoff next',
        'Run one clean pass on the password or invite path so every share, QR pack, and reminder tells the same access story.',
        'Reuse the exact same instructions after that',
        'Once the access path is steady, keep reusing that one truthful handoff instead of improvising by channel.',
      ),
    };
  }

  if (responseRate >= 80 && contactCoverage >= 90) {
    return {
      title: 'The measured baseline looks trustworthy right now',
      detail: 'Guests are responding, the contact layer is strong, and the public extras are active enough that the board reads like product truth instead of wishful thinking.',
      statusLabel: 'High confidence baseline',
      bestNextMove: 'Use this calm window for one guest-facing polish pass, then leave the solved basics alone unless real guest feedback says otherwise.',
      decisionRule: 'This is the moment to improve the guest-facing finish, not to reopen solved basics.',
      tone: 'success',
      sequence: buildAnalyticsSequence(
        'Trust the measured baseline',
        'Replies, reachability, and the public-facing extras are aligned enough that the board feels like product truth now.',
        'Use the calm for one visible polish pass next',
        'Tighten one guest-facing finish pass while the basics are quiet instead of reopening solved operational work.',
        'Leave the stable layers alone after that',
        'If no real guest feedback changes the picture, let the healthy baseline stay healthy instead of stirring it back up.',
      ),
    };
  }

  return {
    title: 'The baseline is healthy enough to guide your next moves',
    detail: 'Nothing here is shouting, but the board still benefits from one more pass on replies, contact coverage, or guest-facing depth before you treat it as fully settled.',
    statusLabel: 'Useful, still maturing',
    bestNextMove: 'Follow the highest-friction guest-facing signal next, then let the quieter metrics stay in support instead of chasing all of them at once.',
    decisionRule: 'Keep following the highest-friction signal instead of spreading effort evenly everywhere.',
    tone: 'warning',
    sequence: buildAnalyticsSequence(
      'Read the board as useful but still maturing',
      'Nothing is broken, but one or two guest-facing signals still deserve a little more work before the baseline feels fully settled.',
      'Follow the highest-friction signal next',
      'Choose the loudest guest-facing gap instead of spreading effort evenly across every metric on the board.',
      'Let the quieter metrics stay in support',
      'After the main friction point moves, come back and see what actually changed before you start another broad pass.',
    ),
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
      priorityLabel: 'Response pressure',
      title: 'Close the RSVP gap before trusting the board more deeply',
      detail: `${input.pendingGuests} guests can still materially change how the rest of the board feels. Follow-up is worth more than extra polish right now.`,
      whyNow: 'Pending replies can still change the truth of every later planning and messaging decision.',
      decisionRule: 'Reply truth beats polish while the RSVP board can still swing meaningfully.',
      ctaLabel: 'Review guests',
      target: 'guests',
    };
  }

  if (contactCoverage < 85) {
    return {
      priorityLabel: 'Reachability gap',
      title: 'Tighten contact coverage before the next message wave',
      detail: 'A softer reachability layer makes every reminder and day-of update less reliable than it needs to be.',
      whyNow: 'Missing direct contact paths quietly weaken every later guest-facing move.',
      decisionRule: 'Reachability beats cadence when too much of the list still cannot hear from you directly.',
      ctaLabel: 'Fix guest contacts',
      target: 'guests',
    };
  }

  if (input.registryItemCount === 0) {
    return {
      priorityLabel: 'Guest-facing depth',
      title: 'Give guests one stronger gifting signal',
      detail: 'A small live registry set does more for guest confidence than waiting for a perfect one.',
      whyNow: 'Registry readiness is one of the easiest visible signals that the site is genuinely being carried through.',
      decisionRule: 'A small honest registry beats a blank lane that asks guests to guess.',
      ctaLabel: 'Open registry',
      target: 'registry',
    };
  }

  if (input.activePhotoAlbumCount === 0) {
    return {
      priorityLabel: 'Guest-facing depth',
      title: 'Turn on one guest-ready photo path',
      detail: 'Photo contribution is one of the easiest ways to make the guest experience feel alive instead of merely published.',
      whyNow: 'A live memory lane makes the site feel active, not just informative.',
      decisionRule: 'A working contribution path beats a dormant memory promise.',
      ctaLabel: 'Open photos',
      target: 'photos',
    };
  }

  if (restrictedAccess) {
    return {
      priorityLabel: 'Access handoff',
      title: 'Run one guest access pass before broader sharing',
      detail: input.privacyMode === 'invite_only'
        ? 'The guest-facing site is not public, so make sure the real invite path is what guests are receiving instead of a generic broad-share link.'
        : 'The site is password-protected, so the next lift is making sure the password instructions travel with every guest-facing link or print pack.',
      whyNow: 'A good board still fails guests if the wrong access instructions travel with it.',
      decisionRule: 'Access clarity beats broader sharing when the site is live but still protected.',
      ctaLabel: 'Review guest access',
      target: 'settings',
    };
  }

  if (responseRate >= 80 && contactCoverage >= 90) {
    return {
      priorityLabel: 'Polish window',
      title: 'The measured baseline is healthy enough for a polish pass',
      detail: 'This is a good moment to improve the live guest-facing story instead of chasing missing basics.',
      whyNow: 'The baseline is finally strong enough that refinement will actually be felt by guests.',
      decisionRule: 'When the measured baseline is calm, refinement beats reopening solved operational work.',
      ctaLabel: 'Open site polish',
      target: 'builder-polish',
    };
  }

  return {
    priorityLabel: 'Momentum nudge',
    title: 'Use messages to keep the baseline moving',
    detail: 'The board is useful already, and the next lift is turning that signal into one clean guest-facing nudge.',
    whyNow: 'A clean message pass is usually the fastest way to turn a decent board into a stronger one.',
    decisionRule: 'A focused guest-facing nudge beats broad polishing when the board still wants momentum.',
    ctaLabel: 'Open messages',
    target: 'messages',
  };
}
