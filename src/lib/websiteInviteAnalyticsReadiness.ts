export type WebsiteInviteAnalyticsStatus = 'ready' | 'needs-instrumentation' | 'empty';
export type AnalyticsSignalState = 'measured' | 'derived' | 'planned';

export interface WebsiteInviteAnalyticsInput {
  siteSlug: string | null;
  isPublished: boolean;
  totalGuests: number;
  confirmedGuests: number;
  declinedGuests: number;
  pendingGuests: number;
  contactableGuests: number;
  registryItemCount: number;
  photoAlbumCount: number;
  activePhotoAlbumCount: number;
  interactiveSuggestionCount: number;
  interactiveVoteWidgetCount: number;
  recentRsvpCount: number;
  websiteVisitCount: number;
  inviteOpenCount: number;
  qrScanCount: number;
}

export interface WebsiteInviteAnalyticsSignal {
  id: string;
  label: string;
  value: string;
  detail: string;
  state: AnalyticsSignalState;
  privacy: string;
}

export interface WebsiteInviteAnalyticsReadiness {
  status: WebsiteInviteAnalyticsStatus;
  summary: string;
  measuredCount: number;
  plannedCount: number;
  signals: WebsiteInviteAnalyticsSignal[];
}

export interface WebsiteInviteAnalyticsFunnelStep {
  id: string;
  label: string;
  value: string;
  detail: string;
  state: AnalyticsSignalState;
}

export interface WebsiteInviteAnalyticsFunnelReview {
  status: 'ready' | 'needs-instrumentation' | 'empty';
  summary: string;
  measuredSteps: number;
  plannedSteps: number;
  steps: WebsiteInviteAnalyticsFunnelStep[];
  guardrails: string[];
}

function pct(numerator: number, denominator: number): string {
  if (!denominator || denominator <= 0) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export function buildWebsiteInviteAnalyticsReadiness(input: WebsiteInviteAnalyticsInput): WebsiteInviteAnalyticsReadiness {
  const respondedGuests = input.confirmedGuests + input.declinedGuests;
  const hasGuestList = input.totalGuests > 0;
  const hasPublishedSite = Boolean(input.isPublished && input.siteSlug);

  const signals: WebsiteInviteAnalyticsSignal[] = [
    {
      id: 'rsvp-funnel',
      label: 'RSVP funnel',
      value: pct(respondedGuests, input.totalGuests),
      detail: `${respondedGuests} responded, ${input.pendingGuests} still waiting.`,
      state: hasGuestList ? 'measured' : 'planned',
      privacy: 'Aggregated guest counts only.',
    },
    {
      id: 'guest-reach',
      label: 'Guest reach',
      value: pct(input.contactableGuests, input.totalGuests),
      detail: `${input.contactableGuests} of ${input.totalGuests} guests have email or phone details.`,
      state: hasGuestList ? 'derived' : 'planned',
      privacy: 'Derived from owner-visible guest records.',
    },
    {
      id: 'site-visit-tracking',
      label: 'Website visits',
      value: hasPublishedSite ? String(input.websiteVisitCount) : 'Not ready',
      detail: hasPublishedSite
        ? input.websiteVisitCount > 0
          ? `${input.websiteVisitCount} aggregate website visits were recorded in the last 30 days.`
          : 'No aggregate website visits were recorded in the last 30 days yet.'
        : 'Publish the site before visit analytics can be meaningful.',
      state: hasPublishedSite ? 'measured' : 'planned',
      privacy: 'Should stay aggregate and avoid IP/device fingerprint exposure.',
    },
    {
      id: 'invite-open-tracking',
      label: 'Invite link opens',
      value: hasPublishedSite ? String(input.inviteOpenCount) : 'Planned',
      detail: hasPublishedSite
        ? input.inviteOpenCount > 0
          ? `${input.inviteOpenCount} private invite or guest-hub opens were recorded in the last 30 days.`
          : 'No private invite or guest-hub opens were recorded in the last 30 days yet.'
        : 'Publish the site before invite-link analytics can be meaningful.',
      state: hasPublishedSite ? 'measured' : 'planned',
      privacy: 'Counts guest-hub invite loads only; it is not inbox pixel tracking.',
    },
    {
      id: 'qr-scans',
      label: 'QR entries',
      value: hasPublishedSite ? String(input.qrScanCount) : 'Planned',
      detail: hasPublishedSite
        ? input.qrScanCount > 0
          ? `${input.qrScanCount} QR-driven guest-hub entries were recorded in the last 30 days.`
          : 'No QR-driven guest-hub entries were recorded in the last 30 days yet.'
        : 'Publish the site before QR entry analytics can be meaningful.',
      state: hasPublishedSite ? 'measured' : 'planned',
      privacy: 'Should count aggregate scans without exposing guest tokens.',
    },
    {
      id: 'photo-collection',
      label: 'Photo collection',
      value: `${input.activePhotoAlbumCount}/${input.photoAlbumCount}`,
      detail: input.photoAlbumCount > 0
        ? `${input.activePhotoAlbumCount} active albums are ready for guest uploads.`
        : 'Create a guest album before photo collection analytics can help.',
      state: input.photoAlbumCount > 0 ? 'measured' : 'planned',
      privacy: 'Uses album counts, not storage paths or image metadata.',
    },
    {
      id: 'guest-prompts',
      label: 'Guest prompts',
      value: String(input.interactiveSuggestionCount + input.interactiveVoteWidgetCount),
      detail: `${input.interactiveSuggestionCount} suggestions and ${input.interactiveVoteWidgetCount} vote groups captured.`,
      state: input.interactiveSuggestionCount > 0 || input.interactiveVoteWidgetCount > 0 ? 'measured' : 'planned',
      privacy: 'Shows owner-moderated prompt activity without public guest identities.',
    },
    {
      id: 'recent-replies',
      label: 'Recent replies',
      value: String(input.recentRsvpCount),
      detail: input.recentRsvpCount > 0
        ? 'Recent RSVP replies are available in the owner dashboard.'
        : 'Recent replies appear once guests respond.',
      state: input.recentRsvpCount > 0 ? 'measured' : 'planned',
      privacy: 'Recent names stay inside authenticated owner/planner views.',
    },
  ];

  const measuredCount = signals.filter((signal) => signal.state === 'measured' || signal.state === 'derived').length;
  const plannedCount = signals.filter((signal) => signal.state === 'planned').length;
  const status: WebsiteInviteAnalyticsStatus = !hasPublishedSite && !hasGuestList
    ? 'empty'
    : plannedCount > 0
      ? 'needs-instrumentation'
      : 'ready';

  const summary = status === 'ready'
    ? 'Analytics are tied to real product actions.'
    : status === 'empty'
      ? 'Add guests and publish the site before analytics can be useful.'
      : `${measuredCount} signals are usable now; ${plannedCount} need instrumentation before launch claims.`;

  return {
    status,
    summary,
    measuredCount,
    plannedCount,
    signals,
  };
}

export function buildWebsiteInviteAnalyticsFunnelReview(readiness: WebsiteInviteAnalyticsReadiness): WebsiteInviteAnalyticsFunnelReview {
  const signalMap = new Map(readiness.signals.map((signal) => [signal.id, signal]));
  const steps: WebsiteInviteAnalyticsFunnelStep[] = [
    {
      id: 'visit',
      label: 'Visit',
      value: signalMap.get('site-visit-tracking')?.value ?? 'Planned',
      detail: signalMap.get('site-visit-tracking')?.detail ?? 'Needs privacy-safe page view instrumentation.',
      state: signalMap.get('site-visit-tracking')?.state ?? 'planned',
    },
    {
      id: 'invite',
      label: 'Invite view',
      value: signalMap.get('invite-open-tracking')?.value ?? 'Planned',
      detail: signalMap.get('invite-open-tracking')?.detail ?? 'Invite/email open tracking is not counted yet.',
      state: signalMap.get('invite-open-tracking')?.state ?? 'planned',
    },
    {
      id: 'rsvp',
      label: 'RSVP',
      value: signalMap.get('rsvp-funnel')?.value ?? '0%',
      detail: signalMap.get('rsvp-funnel')?.detail ?? 'RSVP counts appear once guests respond.',
      state: signalMap.get('rsvp-funnel')?.state ?? 'planned',
    },
    {
      id: 'photos',
      label: 'Photo upload',
      value: signalMap.get('photo-collection')?.value ?? '0/0',
      detail: signalMap.get('photo-collection')?.detail ?? 'Photo collection analytics need a guest album.',
      state: signalMap.get('photo-collection')?.state ?? 'planned',
    },
    {
      id: 'prompts',
      label: 'Guest prompts',
      value: signalMap.get('guest-prompts')?.value ?? '0',
      detail: signalMap.get('guest-prompts')?.detail ?? 'Guest prompt analytics appear once guests respond.',
      state: signalMap.get('guest-prompts')?.state ?? 'planned',
    },
  ];

  const measuredSteps = steps.filter((step) => step.state === 'measured' || step.state === 'derived').length;
  const plannedSteps = steps.filter((step) => step.state === 'planned').length;
  const status = measuredSteps === 0
    ? 'empty'
    : plannedSteps > 0
      ? 'needs-instrumentation'
      : 'ready';

  return {
    status,
    summary: status === 'ready'
      ? 'The guest journey funnel is backed by measured product events.'
      : status === 'empty'
        ? 'Publish the site and collect guest activity before reviewing the funnel.'
        : `${measuredSteps} funnel steps are real now; ${plannedSteps} still need privacy-safe instrumentation.`,
    measuredSteps,
    plannedSteps,
    steps,
    guardrails: [
      'Do not expose IP addresses, exact devices, raw user agents, guest tokens, or private invite URLs.',
      'Keep visit, invite-link, and QR metrics aggregate until consent and retention controls are designed.',
      'Show owner/planner summaries only; public and guest routes should not reveal analytics detail.',
    ],
  };
}
