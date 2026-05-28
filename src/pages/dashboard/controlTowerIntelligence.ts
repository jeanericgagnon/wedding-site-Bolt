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
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  badges: string[];
  signals: ControlTowerSignal[];
  sequence: Array<{
    label: string;
    detail: string;
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
      bestNextMove: input.activePhotoAlbumCount > 0
        ? 'Use the strongest live photo cluster to shape the first keepsake pass before you widen the archive story any further.'
        : 'Open one real photo or keepsake lane first so the archive has a living path before you polish its framing.',
      decisionRule: input.activePhotoAlbumCount > 0
        ? 'Preservation beats live intervention once the event itself is over.'
        : 'Open one real keepsake lane before you try to polish the archive story around it.',
      watchout: input.activePhotoAlbumCount > 0
        ? 'Do not turn archive polish into a fresh operations board. Once the memory lane is working, preserve what matters without reactivating solved live pressure.'
        : 'Do not spend time polishing archive framing before one real keepsake lane exists. Guests need a living memory path before they need a nicer archive wrapper.',
      badges: [
        `${pluralize(input.activePhotoAlbumCount, 'active album')}`,
        `${pluralize(input.interactiveSuggestionCount, 'guest note')}`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Curate photos', detail: 'Use the strongest active album to decide what belongs in the first real keepsake pass.', status: 'current' },
        { label: 'Open keepsake vaults', detail: 'Let the memory lane become a shared archive path instead of leaving it implied.', status: 'next' },
        { label: 'Polish the archive story', detail: 'Only after the living memory path exists should you widen the archive framing.', status: 'then' },
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
      bestNextMove: 'Clear the remaining publish blockers, then preview the live guest path before you spend any more attention on secondary polish.',
      decisionRule: 'Launch truth beats visual polish when guests still do not have a clean live path.',
      watchout: 'Do not let a near-launch site drift into endless design cleanup while the guest path is still blocked. If guests cannot move through the live path cleanly, polish is not the work yet.',
      badges: [
        `${pluralize(input.publishBlockerCount, 'blocker')}`,
        input.daysUntilWedding === 0 ? 'Wedding day' : `${input.daysUntilWedding} days left`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Clear launch blockers', detail: 'Remove the remaining publish truth gaps before you spend energy on anything secondary.', status: 'current' },
        { label: 'Preview guest-facing flow', detail: 'Walk the real guest path once the blockers are gone so launch confidence comes from lived truth.', status: 'next' },
        { label: 'Publish the live site', detail: 'Only publish once the path guests will actually use feels clean and steady.', status: 'then' },
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
      bestNextMove: 'Verify the exact guest access path in settings, then reuse that same route in reminders, QR packs, and coordinator handoffs.',
      decisionRule: 'Access clarity beats launch aesthetics when the site is live but not openly public.',
      watchout: 'Do not assume a live restricted site explains itself. If reminders, printed packs, or helpers carry the wrong path, guests will experience the site as broken even when the page itself is fine.',
      badges: [
        accessLabel,
        input.daysUntilWedding === 0 ? 'Wedding day' : `${input.daysUntilWedding} days left`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Confirm guest access path', detail: 'Make sure the real password or invite route is the one every handoff is carrying.', status: 'current' },
        { label: 'Preview the restricted flow', detail: 'Walk the protected guest path once so reminders and print packs are not sending people into guesswork.', status: 'next' },
        { label: 'Return to live-day polish', detail: 'Once the restricted path is trustworthy, let the rest of readiness stay focused on the live day.', status: 'then' },
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
      bestNextMove: input.daysUntilWedding === 0
        ? 'Stay in coordinator mode and only leave it for live room or seating exceptions that genuinely need intervention.'
        : 'Use coordinator mode and seating together for the next pass, then let solved launch work stay solved.',
      decisionRule: 'Once guest basics are steady, execution readiness beats reopening solved launch work.',
      watchout: 'Do not reopen solved launch work just because it feels easier than live execution. Once the basics are steady, the real risk is losing calm in the room, not missing another polish pass.',
      badges: [
        input.daysUntilWedding === 0 ? 'Wedding day' : `${input.daysUntilWedding} days left`,
        `${responseRate}% replied`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Stay in coordinator mode', detail: 'Let the live board lead while guests, timing, and questions are the highest-value surface.', status: 'current' },
        { label: 'Keep seating stable', detail: 'Use seating as a support layer now instead of reopening the room as a design project.', status: 'next' },
        { label: 'Only react to live exceptions', detail: 'Keep the rest of the system calm unless reality actually changes in front of the team.', status: 'then' },
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
      bestNextMove: 'Review the pending guests, send the next RSVP reminder, and only then come back to the board to see what actually changed.',
      decisionRule: 'Direct follow-up beats passive monitoring when the RSVP picture is still lagging.',
      watchout: 'Do not confuse stagnant reply counts with a need for constant nudging. Send one clean follow-up pass, then give the board room to respond before you escalate again.',
      badges: [
        `${pluralize(input.pendingGuests, 'pending RSVP')}`,
        `${responseRate}% replied`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Review pending guests', detail: 'Start with the guests who can still materially change how the board feels.', status: 'current' },
        { label: 'Send the next reminder', detail: 'Turn that guest list review into one clean outreach pass instead of waiting for passive movement.', status: 'next' },
        { label: 'Re-check the board', detail: 'Let the reminder results change the next move before you reopen any softer polish work.', status: 'then' },
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
      bestNextMove: 'Close the missing contact gaps first, then queue the next communication wave only after the list can actually hear it.',
      decisionRule: 'Reachability beats cadence when the list still cannot reliably hear from you.',
      watchout: 'Do not stack more reminders onto a list that still cannot hear them. If contact paths are thin, cadence work only creates noisier failure.',
      badges: [
        `${pluralize(contactGap, 'missing contact')}`,
        `${pluralize(input.contactableGuestCount, 'contact-ready guest')}`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Fix missing contacts', detail: 'Close the direct reachability gaps first so future reminders are not working through a broken list.', status: 'current' },
        { label: 'Queue the next outreach wave', detail: 'Once the guest list can hear from you cleanly, the reminder lane becomes much more trustworthy.', status: 'next' },
        { label: 'Return to RSVP follow-through', detail: 'The payoff is a quieter, more dependable guest board in every later stage.', status: 'then' },
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
      bestNextMove: 'Add the ceremony, reception, and other guest-critical anchor events now, then preview the timeline before you return to polish.',
      decisionRule: 'Schedule truth beats polish when the wedding is close and guests still need a usable weekend spine.',
      watchout: 'Do not ask messaging or coordinator tools to compensate for a missing guest schedule. If the weekend spine is empty, every later layer inherits that confusion.',
      badges: [
        'No itinerary events yet',
        input.daysUntilWedding === 0 ? 'Wedding day' : `${input.daysUntilWedding} days left`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Add the anchor schedule', detail: 'Give guests the ceremony, reception, and other must-know events before you ask messaging or polish to carry the gap.', status: 'current' },
        { label: 'Preview the guest-facing timeline', detail: 'Once the schedule spine exists, confirm that the public weekend story now reads cleanly.', status: 'next' },
        { label: 'Return to live-day polish', detail: 'Only after the schedule is trustworthy should the softer guest-facing layers regain attention.', status: 'then' },
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
      bestNextMove: 'Publish a small truthful set of registry items now, then check the guest-facing page before you widen the list.',
      decisionRule: 'A small honest registry beats a blank lane that asks guests to guess.',
      watchout: 'Do not wait for the perfect registry build before showing anything real. A blank gifting lane teaches guests to doubt the rest of the site faster than a small honest set does.',
      badges: [
        'Registry still empty',
        `${pluralize(input.activePhotoAlbumCount, 'active album')}`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Add live registry items', detail: 'Use one honest gifting path to make the site feel more real right away.', status: 'current' },
        { label: 'Check the guest-facing page', detail: 'Let the first few gifts carry clarity before you expand the list for its own sake.', status: 'next' },
        { label: 'Return to broader polish', detail: 'Broaden the lane only once the initial registry path already feels dependable.', status: 'then' },
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
      focusDetail: 'A guest-ready photo sharing path is one of the fastest ways to make the site feel active instead of merely informational.',
      bestNextMove: input.photoAlbumCount === 0
        ? 'Create and activate one guest-ready photo sharing path now, then test the photo sharing path before you move back into polish.'
        : 'Turn one existing album on for guests, then verify the photo sharing path while the entry point is still fresh.',
      decisionRule: 'A working contribution path beats a dormant memory promise.',
      watchout: 'Do not leave memory contribution in promise mode. If guests cannot actually upload, the photo lane teaches them that the site is more aspirational than live.',
      badges: [
        `${input.activePhotoAlbumCount}/${input.photoAlbumCount} active`,
        `${pluralize(input.interactiveSuggestionCount, 'guest prompt')}`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Activate a photo sharing path', detail: 'Open the simplest live contribution path first so the memory layer actually starts moving.', status: 'current' },
        { label: 'Check the guest photo sharing path', detail: 'A single working lane teaches you more than several empty promises.', status: 'next' },
        { label: 'Return to site polish', detail: 'Once guests are participating, let that real signal shape the next polish decisions.', status: 'then' },
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
      bestNextMove: 'Review the incoming guest suggestions, make the one visible adjustment that matters most, then re-check the guest-facing story.',
      decisionRule: 'Real guest signals beat hypothetical polish once feedback is already arriving.',
      watchout: 'Do not let incoming guest prompts pile up while you polish adjacent surfaces. If guests are already telling you where the friction is, that signal is more valuable than guessing.',
      badges: [
        `${pluralize(input.interactiveSuggestionCount, 'suggestion')}`,
        `${pluralize(input.recentSiteActivityCount, 'recent site change')}`,
      ],
      signals: buildSignals(input),
      sequence: [
        { label: 'Review guest input', detail: 'Start with the feedback guests are already giving you instead of inventing hypothetical polish work.', status: 'current' },
        { label: 'Adjust the site story', detail: 'Use the clearest suggestion to improve one real surface before widening the response.', status: 'next' },
        { label: 'Re-check guest experience', detail: 'Let the best real guest cue inform the next polish move across the site.', status: 'then' },
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
    bestNextMove: 'Make one contained quality pass in the live guest experience, then let the board stay calm unless a real signal changes.',
    decisionRule: 'When the board is calm, restraint beats churn.',
    watchout: 'Do not mistake available time for a reason to reopen every surface. The risk in a calm board is turning quiet momentum back into unnecessary churn.',
    badges: [
      `${responseRate}% replied`,
      input.recentSiteActivityCount > 0 ? `${pluralize(input.recentSiteActivityCount, 'recent site update')}` : 'No recent site churn',
    ],
    signals: buildSignals(input),
    sequence: [
      { label: 'Make one quality pass', detail: 'Choose one guest-facing trust edge to improve instead of spreading attention everywhere.', status: 'current' },
      { label: 'Review guests if needed', detail: 'If a real guest signal rises, let it redirect the next move instead of reopening everything by default.', status: 'next' },
      { label: 'Leave the board calm', detail: 'Once that contained move is done, leave the rest of the system steady until reality changes.', status: 'then' },
    ],
    primaryAction: { label: 'Open site polish', target: 'builder-polish' },
    secondaryAction: { label: 'Review guests', target: 'guests' },
  };
}
