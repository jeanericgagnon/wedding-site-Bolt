import type { BadgeProps } from '../../components/ui';

export type ControlTowerActionTarget =
  | 'builder'
  | 'guests'
  | 'messages'
  | 'photos'
  | 'planning'
  | 'registry'
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
  badges: string[];
  signals: ControlTowerSignal[];
  primaryAction?: ControlTowerAction;
  secondaryAction?: ControlTowerAction;
}

export interface ControlTowerIntelligenceInput {
  totalGuests: number;
  confirmedGuests: number;
  declinedGuests: number;
  pendingGuests: number;
  contactableGuestCount: number;
  registryItemCount: number;
  photoAlbumCount: number;
  activePhotoAlbumCount: number;
  interactiveSuggestionCount: number;
  recentRsvpCount: number;
  recentSiteActivityCount: number;
  publishBlockerCount: number;
  daysUntilWedding: number | null;
  isPublished: boolean;
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
  const publishedExperienceReady = input.registryItemCount > 0 && input.activePhotoAlbumCount > 0;
  const guestExperienceValue = input.isArchiveLike
    ? `${input.activePhotoAlbumCount}/${input.photoAlbumCount}`
    : publishedExperienceReady
      ? 'Ready'
      : input.registryItemCount === 0 && input.activePhotoAlbumCount === 0
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
        : input.registryItemCount === 0
          ? 'Registry still needs live items for guests.'
          : input.activePhotoAlbumCount === 0
            ? 'Photo sharing is not really live yet.'
            : 'Registry and photos are ready to support guests.',
      variant: guestExperienceValue === 'Ready' || input.activePhotoAlbumCount > 0 ? 'success' : guestExperienceValue === 'Growing' ? 'warning' : 'error',
    },
  ];
}

export function buildControlTowerBriefing(input: ControlTowerIntelligenceInput): ControlTowerBriefing {
  const responseRate = pct(input.confirmedGuests + input.declinedGuests, input.totalGuests);
  const contactGap = Math.max(input.totalGuests - input.contactableGuestCount, 0);
  const weddingSoon = input.daysUntilWedding !== null && input.daysUntilWedding >= 0 && input.daysUntilWedding <= 45;

  if (input.isArchiveLike) {
    return {
      eyebrow: 'Control tower briefing',
      title: 'The event is over, so memory should take the lead now',
      detail: input.activePhotoAlbumCount > 0
        ? 'Operations can quiet down here. The most useful next move is curating memories, anniversary notes, and the keepsake version of the site.'
        : 'The operational rush is behind you. This is the right moment to turn the site into a keepsake by activating memory surfaces and photo curation.',
      badges: [
        `${pluralize(input.activePhotoAlbumCount, 'active album')}`,
        `${pluralize(input.interactiveSuggestionCount, 'guest note')}`,
      ],
      signals: buildSignals(input),
      primaryAction: { label: 'Open vault', target: 'vault' },
      secondaryAction: { label: 'Review photos', target: 'photos' },
    };
  }

  if (!input.isPublished && input.publishBlockerCount > 0 && weddingSoon) {
    return {
      eyebrow: 'Control tower briefing',
      title: 'Launch readiness is the main thing to steady this week',
      detail: `${pluralize(input.publishBlockerCount, 'publish blocker')} still stand between this site and a clean guest-facing launch. With the date getting closer, the best use of time is clearing those blockers before polishing extras.`,
      badges: [
        `${pluralize(input.publishBlockerCount, 'blocker')}`,
        input.daysUntilWedding === 0 ? 'Wedding day' : `${input.daysUntilWedding} days left`,
      ],
      signals: buildSignals(input),
      primaryAction: { label: 'Open launch checklist', target: 'builder' },
      secondaryAction: { label: 'Check planning', target: 'planning' },
    };
  }

  if (input.pendingGuests > 0 && (responseRate < 75 || input.recentRsvpCount === 0)) {
    return {
      eyebrow: 'Control tower briefing',
      title: 'Guest response follow-up is the pressure point right now',
      detail: `${pluralize(input.pendingGuests, 'guest')} still need an RSVP reply${input.recentRsvpCount === 0 ? ', and nothing new has landed recently' : ''}. The calmest next move is tightening outreach instead of waiting for the board to improve on its own.`,
      badges: [
        `${pluralize(input.pendingGuests, 'pending RSVP')}`,
        `${responseRate}% replied`,
      ],
      signals: buildSignals(input),
      primaryAction: { label: 'Review guests', target: 'guests' },
      secondaryAction: { label: 'Open messages', target: 'messages' },
    };
  }

  if (contactGap > 0) {
    return {
      eyebrow: 'Control tower briefing',
      title: 'Contact coverage is the next thing to tighten',
      detail: `${pluralize(contactGap, 'guest')} still do not have direct email or phone coverage. Cleaning that up now makes every later RSVP, reminder, and day-of action easier.`,
      badges: [
        `${pluralize(contactGap, 'missing contact')}`,
        `${pluralize(input.contactableGuestCount, 'contact-ready guest')}`,
      ],
      signals: buildSignals(input),
      primaryAction: { label: 'Fix guest contacts', target: 'guests' },
      secondaryAction: { label: 'Open messages', target: 'messages' },
    };
  }

  if (input.registryItemCount === 0) {
    return {
      eyebrow: 'Control tower briefing',
      title: 'Guests can reach the site, but the gifting lane still feels empty',
      detail: 'Registry is one of the easiest trust-building surfaces for guests. Even a small live set is better than making visitors guess what is ready yet.',
      badges: [
        'Registry still empty',
        `${pluralize(input.activePhotoAlbumCount, 'active album')}`,
      ],
      signals: buildSignals(input),
      primaryAction: { label: 'Open registry', target: 'registry' },
      secondaryAction: { label: 'Open builder', target: 'builder' },
    };
  }

  if (input.activePhotoAlbumCount === 0) {
    return {
      eyebrow: 'Control tower briefing',
      title: 'Photo sharing still needs a real guest-ready entry point',
      detail: input.photoAlbumCount === 0
        ? 'No photo album is ready yet. Setting one up now gives guests an easy contribution path without making the site feel unfinished.'
        : 'Albums exist, but none are active yet. Turning one on is a quick way to make the guest experience feel more alive.',
      badges: [
        `${input.activePhotoAlbumCount}/${input.photoAlbumCount} active`,
        `${pluralize(input.interactiveSuggestionCount, 'guest prompt')}`,
      ],
      signals: buildSignals(input),
      primaryAction: { label: 'Review photos', target: 'photos' },
      secondaryAction: { label: 'Open builder', target: 'builder' },
    };
  }

  if (input.interactiveSuggestionCount > 0) {
    return {
      eyebrow: 'Control tower briefing',
      title: 'Guest input is arriving, so the next move is to shape it',
      detail: `${pluralize(input.interactiveSuggestionCount, 'guest suggestion')} already came in. This is a good moment to review what guests are telling you and make sure the site still feels cared for.`,
      badges: [
        `${pluralize(input.interactiveSuggestionCount, 'suggestion')}`,
        `${pluralize(input.recentSiteActivityCount, 'recent site change')}`,
      ],
      signals: buildSignals(input),
      primaryAction: { label: 'Review guest prompts', target: 'builder' },
      secondaryAction: { label: 'Open photos', target: 'photos' },
    };
  }

  return {
    eyebrow: 'Control tower briefing',
    title: 'The board looks calm enough to guide, not chase',
    detail: 'Nothing is obviously drifting right now. Use this moment to keep the guest experience polished and make small quality moves before they become deadline work.',
    badges: [
      `${responseRate}% replied`,
      input.recentSiteActivityCount > 0 ? `${pluralize(input.recentSiteActivityCount, 'recent site update')}` : 'No recent site churn',
    ],
    signals: buildSignals(input),
    primaryAction: { label: 'Open builder', target: 'builder' },
    secondaryAction: { label: 'Review guests', target: 'guests' },
  };
}
