export type DayOfWebModeStatus = 'ready' | 'needs-content' | 'empty';
export type DayOfWebModeSignalState = 'ready' | 'needs-content' | 'planned';

export type DayOfWebActionId =
  | 'rsvp'
  | 'schedule'
  | 'travel'
  | 'registry'
  | 'photos'
  | 'guestbook'
  | 'recap';

export interface DayOfWebModeInput {
  siteSlug: string;
  enabledActionIds: DayOfWebActionId[];
  hasCustomMessage: boolean;
  hasWeddingDate: boolean;
  hasGuestLanguagePreference: boolean;
  hasPoorNetworkFallback?: boolean;
  hasOfflineSnapshot?: boolean;
  hasServiceWorkerShell?: boolean;
}

export interface DayOfWebModeSignal {
  id: string;
  label: string;
  detail: string;
  state: DayOfWebModeSignalState;
}

export interface DayOfWebModeReadiness {
  status: DayOfWebModeStatus;
  summary: string;
  readyCount: number;
  needsContentCount: number;
  plannedCount: number;
  signals: DayOfWebModeSignal[];
}

export interface DayOfHubStatusInput {
  enabledActionIds: DayOfWebActionId[];
  hasPoorNetworkFallback: boolean;
  announcementsConnected?: boolean;
  guestSpecificStateConnected?: boolean;
  coordinatorHandoffConnected?: boolean;
}

export interface DayOfHubStatusItem {
  id: string;
  label: string;
  detail: string;
  state: DayOfWebModeSignalState;
}

export interface DayOfHubStatusBoard {
  status: 'ready' | 'planned';
  summary: string;
  readyCount: number;
  plannedCount: number;
  items: DayOfHubStatusItem[];
}

const actionLabels: Record<DayOfWebActionId, string> = {
  rsvp: 'RSVP',
  schedule: 'Schedule',
  travel: 'Directions and travel',
  registry: 'Registry',
  photos: 'Photo upload',
  guestbook: 'Guestbook',
  recap: 'Photo recap',
};

export function buildDayOfWebModeReadiness(input: DayOfWebModeInput): DayOfWebModeReadiness {
  const enabled = new Set(input.enabledActionIds);
  const visibleActions = input.enabledActionIds.map((id) => actionLabels[id]).filter(Boolean);

  const signals: DayOfWebModeSignal[] = [
    {
      id: 'mobile-hub',
      label: 'Install-free mobile hub',
      detail: input.siteSlug
        ? 'Guests can use the wedding hub in a mobile browser without an app or account.'
        : 'Add a site link before this can become the guest hub.',
      state: input.siteSlug ? 'ready' : 'needs-content',
    },
    {
      id: 'same-link',
      label: 'One link for the day',
      detail: input.hasCustomMessage || input.hasWeddingDate
        ? 'The hub has enough wedding context to feel like the right day-of link.'
        : 'Add a date or message so guests know they are in the right place.',
      state: input.hasCustomMessage || input.hasWeddingDate ? 'ready' : 'needs-content',
    },
    {
      id: 'guest-actions',
      label: 'Guest actions',
      detail: visibleActions.length > 0
        ? `Available now: ${visibleActions.join(', ')}.`
        : 'Turn on at least one guest action before sharing the hub.',
      state: visibleActions.length > 0 ? 'ready' : 'needs-content',
    },
    {
      id: 'guest-language',
      label: 'Language-aware links',
      detail: input.hasGuestLanguagePreference
        ? 'Guest language links are honored before the hub renders.'
        : 'Guest language links can be added when multilingual invitations are used.',
      state: input.hasGuestLanguagePreference ? 'ready' : 'planned',
    },
    {
      id: 'day-of-coverage',
      label: 'Day-of coverage',
      detail: enabled.has('schedule') && enabled.has('travel') && enabled.has('photos')
        ? 'Schedule, directions, and photo upload are available from the hub.'
        : 'Schedule, directions, and photo upload should all be enabled for a stronger day-of mode.',
      state: enabled.has('schedule') && enabled.has('travel') && enabled.has('photos') ? 'ready' : 'needs-content',
    },
    {
      id: 'announcements',
      label: 'Announcements',
      detail: 'Live day-of announcements are still handled from owner messaging, not this guest hub.',
      state: 'planned',
    },
    {
      id: 'poor-network',
      label: 'Poor network fallback',
      detail: input.hasOfflineSnapshot
        ? 'If live details do not load, guests still get the last saved update, travel plan, and safe hub actions from the cached hub.'
        : input.hasPoorNetworkFallback
          ? 'If live details do not load, guests still see safe hub actions and a retry option.'
          : 'Offline caching and retry state are not built into the guest hub yet.',
      state: input.hasOfflineSnapshot || input.hasPoorNetworkFallback ? 'ready' : 'planned',
    },
    {
      id: 'offline-shell',
      label: 'Offline app shell',
      detail: input.hasServiceWorkerShell
        ? 'The day-of hub shell is cached locally so guests can reopen the page without reloading every asset.'
        : 'A cached app shell is still needed before the hub behaves more like an install-free day-of app.',
      state: input.hasServiceWorkerShell ? 'ready' : 'planned',
    },
  ];

  const readyCount = signals.filter((signal) => signal.state === 'ready').length;
  const needsContentCount = signals.filter((signal) => signal.state === 'needs-content').length;
  const plannedCount = signals.filter((signal) => signal.state === 'planned').length;
  const status: DayOfWebModeStatus = !input.siteSlug || input.enabledActionIds.length === 0
    ? 'empty'
    : needsContentCount > 0
      ? 'needs-content'
      : 'ready';
  const summary = status === 'ready'
    ? 'Ready as a no-app guest hub for the wedding day.'
    : status === 'empty'
      ? 'Add a site link and guest actions before sharing this as day-of mode.'
      : `${needsContentCount} item${needsContentCount === 1 ? '' : 's'} need content before this feels day-of ready.`;

  return {
    status,
    summary,
    readyCount,
    needsContentCount,
    plannedCount,
    signals,
  };
}

export function buildDayOfHubStatusBoard(input: DayOfHubStatusInput): DayOfHubStatusBoard {
  const enabled = new Set(input.enabledActionIds);
  const hasCoreGuestActions = enabled.has('schedule') && enabled.has('travel') && enabled.has('photos');
  const items: DayOfHubStatusItem[] = [
    {
      id: 'saved-hub',
      label: 'Saved hub actions',
      detail: input.hasPoorNetworkFallback
        ? 'Guests still see schedule, travel, RSVP, and photo links if the newest details do not load.'
        : 'Add a retry/fallback state before depending on this in a crowded venue.',
      state: input.hasPoorNetworkFallback ? 'ready' : 'planned',
    },
    {
      id: 'day-of-essentials',
      label: 'Day-of essentials',
      detail: hasCoreGuestActions
        ? 'Schedule, travel, and photo upload are present from the same mobile link.'
        : 'Schedule, travel, and photo upload should all be enabled before sharing this as the wedding-day hub.',
      state: hasCoreGuestActions ? 'ready' : 'needs-content',
    },
    {
      id: 'announcements',
      label: 'Announcements',
      detail: input.announcementsConnected
        ? 'Owner messages are connected to the guest hub announcement surface.'
        : 'Live updates still belong in owner messaging until announcement readback is connected.',
      state: input.announcementsConnected ? 'ready' : 'planned',
    },
    {
      id: 'guest-state',
      label: 'Guest-specific status',
      detail: input.guestSpecificStateConnected
        ? 'Guests can see their own RSVP or check-in status from the hub.'
        : 'RSVP and check-in status stay in their dedicated flows until guest-specific hub state is wired.',
      state: input.guestSpecificStateConnected ? 'ready' : 'planned',
    },
    {
      id: 'coordinator-handoff',
      label: 'Coordinator handoff',
      detail: input.coordinatorHandoffConnected
        ? 'Coordinator updates are connected to the guest hub.'
        : 'Coordinator queue and Q&A stay in the coordinator surface until a guest-safe handoff is proven.',
      state: input.coordinatorHandoffConnected ? 'ready' : 'planned',
    },
  ];

  const readyCount = items.filter((item) => item.state === 'ready').length;
  const plannedCount = items.filter((item) => item.state === 'planned').length;
  const needsContentCount = items.filter((item) => item.state === 'needs-content').length;
  const status = plannedCount === 0 && needsContentCount === 0 ? 'ready' : 'planned';

  return {
    status,
    summary: status === 'ready'
      ? 'Guest hub status is connected for live day-of use.'
      : `${readyCount} day-of status item${readyCount === 1 ? '' : 's'} are usable now; ${plannedCount + needsContentCount} stay planned or need setup.`,
    readyCount,
    plannedCount: plannedCount + needsContentCount,
    items,
  };
}
