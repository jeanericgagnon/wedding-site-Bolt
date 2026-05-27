import type { BadgeProps } from '../../components/ui';

export type ControlTowerActionTarget =
  | 'builder-launch'
  | 'builder-polish'
  | 'coordinator'
  | 'guests'
  | 'itinerary'
  | 'messages'
  | 'photos'
  | 'planning'
  | 'registry'
  | 'settings'
  | 'suggestions'
  | 'seating'
  | 'vault';

export interface ControlTowerAction {
  label: string;
  target: ControlTowerActionTarget;
}

export interface ControlTowerSignal {
  label: string;
  value: string;
  detail: string;
  variant: BadgeProps['variant'];
}

export interface ControlTowerBriefing {
  eyebrow: string;
  title: string;
  detail: string;
  focusTitle: string;
  focusDetail: string;
  decisionRule: string;
  badges: string[];
  signals: ControlTowerSignal[];
  sequence: Array<{
    label: string;
    status: 'current' | 'next' | 'then';
  }>;
  primaryAction?: ControlTowerAction;
  secondaryAction?: ControlTowerAction;
}

export interface ControlTowerIntelligenceInput {
  totalGuests: number;
  confirmedGuests: number;
  declinedGuests: number;
  pendingGuests: number;
  contactableGuestCount: number;
  itineraryEventCount: number;
  registryItemCount: number;
  photoAlbumCount: number;
  activePhotoAlbumCount: number;
  interactiveSuggestionCount: number;
  recentRsvpCount: number;
  recentSiteActivityCount: number;
  publishBlockerCount: number;
  daysUntilWedding: number | null;
  isPublished: boolean;
  privacyMode?: 'public' | 'password_protected' | 'invite_only';
  isArchiveLike: boolean;
}

function pct(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildSignals(input: ControlTowerIntelligenceInput): ControlTowerSignal[] {
  const respondedGuests = input.confirmedGuests + input.declinedGuests;
  const responseRate = pct(respondedGuests, input.totalGuests);
  const contactCoverage = pct(input.contactableGuestCount, input.totalGuests);
  const restrictedAccess = input.privacyMode === 'password_protected' || input.privacyMode === 'invite_only';
  const publishedExperienceReady = input.registryItemCount > 0 && input.activePhotoAlbumCount > 0 && input.itineraryEventCount > 0;
  const guestExperienceValue = input.isArchiveLike
    ? `${input.activePhotoAlbumCount}/${input.photoAlbumCount}`
    : restrictedAccess
      ? 'Guarded'
    : publishedExperienceReady
      ? 'Ready'
      : input.registryItemCount === 0 && input.activePhotoAlbumCount === 0 && input.itineraryEventCount === 0
        ? 'Thin'
        : 'Growing';

  return [
    {
      label: 'RSVP momentum',
      value: `${responseRate}%`,
      detail: respondedGuests === 0
        ? 'No guests have replied yet.'
        : `${pluralize(respondedGuests, 'guest')} replied so far.`,
      variant: responseRate >= 75 ? 'success' : responseRate >= 45 ? 'warning' : 'error',
    },
    {
      label: 'Reachability',
      value: `${contactCoverage}%`,
      detail: input.totalGuests === 0
        ? 'Guest list is still empty.'
        : `${pluralize(input.contactableGuestCount, 'guest')} can be reached directly.`,
      variant: contactCoverage >= 90 ? 'success' : contactCoverage >= 70 ? 'warning' : 'error',
    },
    {
      label: input.isArchiveLike ? 'Memory layer' : 'Guest experience',
      value: guestExperienceValue,
      detail: input.isArchiveLike
        ? input.activePhotoAlbumCount > 0
          ? `${pluralize(input.activePhotoAlbumCount, 'album')} already carrying memories.`
          : 'No active memory album is guiding guests yet.'
        : restrictedAccess
          ? `The guest-facing path is live, but it still depends on ${input.privacyMode === 'invite_only' ? 'invite-only routing' : 'password instructions'} traveling with it.`
        : input.itineraryEventCount === 0
          ? 'Guests still need a real public schedule to trust.'
          : input.registryItemCount === 0
          ? 'Registry still needs live items for guests.'
          : input.activePhotoAlbumCount === 0
            ? 'Photo sharing is not really live yet.'
            : 'Registry, schedule, and photos are ready to support guests.',
      variant: guestExperienceValue === 'Ready' ? 'success' : guestExperienceValue === 'Growing' ? 'warning' : 'error',
    },
  ];
}

export function buildControlTowerBriefing(input: ControlTowerIntelligenceInput): ControlTowerBriefing {
  const responseRate = pct(input.confirmedGuests + input.declinedGuests, input.totalGuests);
  const contactGap = Math.max(input.totalGuests - input.contactableGuestCount, 0);
  const weddingSoon = input.daysUntilWedding !== null && input.daysUntilWedding >= 0 && input.daysUntilWedding <= 45;
  const restrictedAccess = input.privacyMode === 'password_protected' || input.privacyMode === 'invite_only';
  const accessLabel = input.privacyMode === 'invite_only' ? 'invite-only' : 'password-protected';

  if (input.isArchiveLike) {
    return {
      eyebrow: 'Control tower briefing',
      title: 'The event is over, so memory should take the lead now',
      detail: input.activePhotoAlbumCount > 0
        ? 'Operations can quiet down here. The most useful next move is curating memories, anniversary notes, and the keepsake version of the site.'
        : 'The operational rush is behind you. This is the right moment to turn the site into a keepsake by activating memory surfaces and photo curation.',
      focusTitle: 'Shift from operations into keepsake mode',
      focusDetail: input.activePhotoAlbumCount > 0
        ? 'The wedding no longer needs active command-center energy, so the best use of attention is curating what should last.'
        : 'Before the archive can feel intentional, it still needs one real memory path that guests and the couple can recognize as the keepsake layer.',
      decisionRule: input.activePhotoAlbumCount > 0
        ? 'Preservation beats live intervention once the event itself is over.'
        : 'Open one real keepsake lane before you try to polish the archive story around it.',
      badges: [
        `${pluralize(input.activePhotoAlbumCount, 'active album')}`,
        `${pluralize(input.interactiveSuggestionCount, 'guest note')}`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Curate photos', status: 'current' },
        { label: 'Open keepsake vaults', status: 'next' },
        { label: 'Polish the archive story', status: 'then' },
      ],
      primaryAction: { label: 'Open vault', target: 'vault' },
      secondaryAction: { label: 'Review photos', target: 'photos' },
    };
  }

  if (!input.isPublished && input.publishBlockerCount > 0 && weddingSoon) {
    return {
      eyebrow: 'Control tower briefing',
      title: 'Launch readiness is the main thing to steady this week',
      detail: `${pluralize(input.publishBlockerCount, 'publish blocker')} still stand between this site and a clean guest-facing launch. With the date getting closer, the best use of time is clearing those blockers before polishing extras.`,
      focusTitle: 'Clear the blockers before you polish',
      focusDetail: 'When the date is close and the site is still not fully live, quality polish comes second to getting the launch path truly ready.',
      decisionRule: 'Launch truth beats visual polish when guests still do not have a clean live path.',
      badges: [
        `${pluralize(input.publishBlockerCount, 'blocker')}`,
        input.daysUntilWedding === 0 ? 'Wedding day' : `${input.daysUntilWedding} days left`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Clear launch blockers', status: 'current' },
        { label: 'Preview guest-facing flow', status: 'next' },
        { label: 'Publish the live site', status: 'then' },
      ],
      primaryAction: { label: 'Open launch checklist', target: 'builder-launch' },
      secondaryAction: { label: 'Check planning', target: 'planning' },
    };
  }

  if (input.isPublished && restrictedAccess && weddingSoon) {
    return {
      eyebrow: 'Control tower briefing',
      title: 'Guest access instructions are part of readiness now',
      detail: `The site is live, but it is ${accessLabel}. The most useful next move is making sure every reminder, print pack, and coordinator handoff carries the right access path so guests are not stranded.`,
      focusTitle: 'Treat access instructions like part of the product',
      focusDetail: 'A restricted live site only feels trustworthy if every handoff carries the right path with it, not just the pretty URL.',
      decisionRule: 'Access clarity beats launch aesthetics when the site is live but not openly public.',
      badges: [
        accessLabel,
        input.daysUntilWedding === 0 ? 'Wedding day' : `${input.daysUntilWedding} days left`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Confirm guest access path', status: 'current' },
        { label: 'Preview the restricted flow', status: 'next' },
        { label: 'Return to live-day polish', status: 'then' },
      ],
      primaryAction: { label: 'Review guest access settings', target: 'settings' },
      secondaryAction: { label: 'Open messages', target: 'messages' },
    };
  }

  if (
    weddingSoon
    && input.isPublished
    && input.pendingGuests <= Math.max(5, Math.round(input.totalGuests * 0.1))
    && input.contactableGuestCount >= Math.max(input.totalGuests - 2, 0)
    && input.itineraryEventCount > 0
    && input.activePhotoAlbumCount > 0
  ) {
    return {
      eyebrow: 'Control tower briefing',
      title: 'Guest-facing launch looks steady, so day-of readiness should lead now',
      detail: input.daysUntilWedding === 0
        ? 'The site is already carrying guests well. The highest-value move now is staying close to coordinator mode, check-in, and the room itself.'
        : 'The guest-facing basics look healthy enough that the next meaningful polish lives in the live-day layer: run-of-show, seating confidence, and handoff readiness.',
      focusTitle: 'Move your attention into live execution',
      focusDetail: 'The public-facing basics are steady enough that the next wins now come from coordinator calm, room stability, and handoff sharpness.',
      decisionRule: 'Once guest basics are steady, execution readiness beats reopening solved launch work.',
      badges: [
        input.daysUntilWedding === 0 ? 'Wedding day' : `${input.daysUntilWedding} days left`,
        `${responseRate}% replied`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Stay in coordinator mode', status: 'current' },
        { label: 'Keep seating stable', status: 'next' },
        { label: 'Only react to live exceptions', status: 'then' },
      ],
      primaryAction: { label: 'Open coordinator mode', target: 'coordinator' },
      secondaryAction: { label: 'Check seating', target: 'seating' },
    };
  }

  if (input.pendingGuests > 0 && (responseRate < 75 || input.recentRsvpCount === 0)) {
    return {
      eyebrow: 'Control tower briefing',
      title: 'Guest response follow-up is the pressure point right now',
      detail: `${pluralize(input.pendingGuests, 'guest')} still need an RSVP reply${input.recentRsvpCount === 0 ? ', and nothing new has landed recently' : ''}. The calmest next move is tightening outreach instead of waiting for the board to improve on its own.`,
      focusTitle: 'Turn waiting into deliberate follow-up',
      focusDetail: 'When replies are lagging, the job is not more dashboard watching; it is one clean outreach pass that moves the board forward.',
      decisionRule: 'Direct follow-up beats passive monitoring when the RSVP picture is still lagging.',
      badges: [
        `${pluralize(input.pendingGuests, 'pending RSVP')}`,
        `${responseRate}% replied`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Review pending guests', status: 'current' },
        { label: 'Send the next reminder', status: 'next' },
        { label: 'Re-check the board', status: 'then' },
      ],
      primaryAction: { label: 'Review guests', target: 'guests' },
      secondaryAction: { label: 'Open messages', target: 'messages' },
    };
  }

  if (contactGap > 0) {
    return {
      eyebrow: 'Control tower briefing',
      title: 'Contact coverage is the next thing to tighten',
      detail: `${pluralize(contactGap, 'guest')} still do not have direct email or phone coverage. Cleaning that up now makes every later RSVP, reminder, and day-of action easier.`,
      focusTitle: 'Fix reachability before you scale communication',
      focusDetail: 'Every later reminder and day-of nudge gets easier once the guest list has real contact paths instead of hopeful placeholders.',
      decisionRule: 'Reachability beats cadence when the list still cannot reliably hear from you.',
      badges: [
        `${pluralize(contactGap, 'missing contact')}`,
        `${pluralize(input.contactableGuestCount, 'contact-ready guest')}`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Fix missing contacts', status: 'current' },
        { label: 'Queue the next outreach wave', status: 'next' },
        { label: 'Return to RSVP follow-through', status: 'then' },
      ],
      primaryAction: { label: 'Fix guest contacts', target: 'guests' },
      secondaryAction: { label: 'Open messages', target: 'messages' },
    };
  }

  if (weddingSoon && input.itineraryEventCount === 0) {
    return {
      eyebrow: 'Control tower briefing',
      title: 'The site still needs a real guest-facing schedule before the live layer can carry it',
      detail: 'RSVP and contact progress help, but guests still need an itinerary spine to trust. Add the core weekend events before leaning on messaging or coordinator tools to cover the gap.',
      focusTitle: 'Give guests a schedule spine first',
      focusDetail: 'When the itinerary is still empty, messaging and ops can only paper over the gap. A real schedule anchor is the honest next move.',
      decisionRule: 'Schedule truth beats polish when the wedding is close and guests still need a usable weekend spine.',
      badges: [
        'No itinerary events yet',
        input.daysUntilWedding === 0 ? 'Wedding day' : `${input.daysUntilWedding} days left`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Add the anchor schedule', status: 'current' },
        { label: 'Preview the guest-facing timeline', status: 'next' },
        { label: 'Return to live-day polish', status: 'then' },
      ],
      primaryAction: { label: 'Open itinerary', target: 'itinerary' },
      secondaryAction: { label: 'Open site polish', target: 'builder-polish' },
    };
  }

  if (input.registryItemCount === 0) {
    return {
      eyebrow: 'Control tower briefing',
      title: 'Guests can reach the site, but the gifting lane still feels empty',
      detail: 'Registry is one of the easiest trust-building surfaces for guests. Even a small live set is better than making visitors guess what is ready yet.',
      focusTitle: 'Use the registry to make the site feel real',
      focusDetail: 'Guests read an empty gifting lane as uncertainty, so even a small truthful registry does more good than waiting for perfection.',
      decisionRule: 'A small honest registry beats a blank lane that asks guests to guess.',
      badges: [
        'Registry still empty',
        `${pluralize(input.activePhotoAlbumCount, 'active album')}`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Add live registry items', status: 'current' },
        { label: 'Check the guest-facing page', status: 'next' },
        { label: 'Return to broader polish', status: 'then' },
      ],
      primaryAction: { label: 'Open registry', target: 'registry' },
      secondaryAction: { label: 'Open site polish', target: 'builder-polish' },
    };
  }

  if (input.activePhotoAlbumCount === 0) {
    return {
      eyebrow: 'Control tower briefing',
      title: 'Photo sharing still needs a real guest-ready entry point',
      detail: input.photoAlbumCount === 0
        ? 'No photo album is ready yet. Setting one up now gives guests an easy contribution path without making the site feel unfinished.'
        : 'Albums exist, but none are active yet. Turning one on is a quick way to make the guest experience feel more alive.',
      focusTitle: 'Make memory contribution easy before the moment passes',
      focusDetail: 'A guest-ready photo path is one of the fastest ways to make the site feel active instead of merely informational.',
      decisionRule: 'A working contribution path beats a dormant memory promise.',
      badges: [
        `${input.activePhotoAlbumCount}/${input.photoAlbumCount} active`,
        `${pluralize(input.interactiveSuggestionCount, 'guest prompt')}`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Activate a photo path', status: 'current' },
        { label: 'Check the guest upload flow', status: 'next' },
        { label: 'Return to site polish', status: 'then' },
      ],
      primaryAction: { label: 'Review photos', target: 'photos' },
      secondaryAction: { label: 'Open site polish', target: 'builder-polish' },
    };
  }

  if (input.interactiveSuggestionCount > 0) {
    return {
      eyebrow: 'Control tower briefing',
      title: 'Guest input is arriving, so the next move is to shape it',
      detail: `${pluralize(input.interactiveSuggestionCount, 'guest suggestion')} already came in. This is a good moment to review what guests are telling you and make sure the site still feels cared for.`,
      focusTitle: 'Use live guest input to refine the story',
      focusDetail: 'When guests are already engaging, the best move is to shape the experience with that signal instead of leaving their feedback parked.',
      decisionRule: 'Real guest signals beat hypothetical polish once feedback is already arriving.',
      badges: [
        `${pluralize(input.interactiveSuggestionCount, 'suggestion')}`,
        `${pluralize(input.recentSiteActivityCount, 'recent site change')}`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Review guest input', status: 'current' },
        { label: 'Adjust the site story', status: 'next' },
        { label: 'Re-check guest experience', status: 'then' },
      ],
      primaryAction: { label: 'Review guest prompts', target: 'suggestions' },
      secondaryAction: { label: 'Open photos', target: 'photos' },
    };
  }

  return {
    eyebrow: 'Control tower briefing',
    title: 'The board looks calm enough to guide, not chase',
    detail: 'Nothing is obviously drifting right now. Use this moment to keep the guest experience polished and make small quality moves before they become deadline work.',
    focusTitle: 'Use the calm to improve trust, not reopen chaos',
    focusDetail: 'A steady board is the right moment for one clean quality pass, not a random re-opening of solved decisions.',
    decisionRule: 'When the board is calm, restraint beats churn.',
    badges: [
      `${responseRate}% replied`,
      input.recentSiteActivityCount > 0 ? `${pluralize(input.recentSiteActivityCount, 'recent site update')}` : 'No recent site churn',
    ],
    signals: buildSignals(input),
    sequence: [
      { label: 'Make one quality pass', status: 'current' },
      { label: 'Review guests if needed', status: 'next' },
      { label: 'Leave the board calm', status: 'then' },
    ],
    primaryAction: { label: 'Open site polish', target: 'builder-polish' },
    secondaryAction: { label: 'Review guests', target: 'guests' },
  };
}
