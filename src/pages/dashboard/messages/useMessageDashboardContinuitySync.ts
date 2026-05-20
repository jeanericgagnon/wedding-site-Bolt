import { useEffect } from 'react';
import { isFreshRsvpContinuityStorageValue } from '../../rsvpContinuityStorage';
import { RSVP_CONTINUITY_EVENT, buildRsvpContinuityStorageKey } from '../../rsvpTypes';

export type UseMessageDashboardContinuitySyncArgs = {
  hasWeddingSite: boolean;
  isDemoMode: boolean;
  siteSlug: string | null;
  fetchGuests: () => Promise<void>;
  fetchMessages: () => Promise<void>;
};

type RsvpContinuityEventDetail = {
  storageKey?: string | null;
  siteSlug?: string | null;
};

const normalizeContinuitySiteSlug = (value: string | null | undefined) => (
  String(value ?? '').trim().toLowerCase()
);

export function shouldRefreshForRsvpContinuityEvent(
  detail: RsvpContinuityEventDetail | null | undefined,
  continuityStorageKey: string,
  siteSlug: string | null,
) {
  const expectedSiteSlug = normalizeContinuitySiteSlug(siteSlug);
  const eventStorageKey = detail?.storageKey ?? null;
  const eventSiteSlug = normalizeContinuitySiteSlug(detail?.siteSlug ?? null);

  if (eventStorageKey) return eventStorageKey === continuityStorageKey;
  if (expectedSiteSlug) return eventSiteSlug === expectedSiteSlug;
  return !eventSiteSlug;
}

export function useMessageDashboardContinuitySync({
  hasWeddingSite,
  isDemoMode,
  siteSlug,
  fetchGuests,
  fetchMessages,
}: UseMessageDashboardContinuitySyncArgs) {
  useEffect(() => {
    if (!hasWeddingSite || isDemoMode) return;
    const continuityStorageKey = buildRsvpContinuityStorageKey(siteSlug);

    const refreshGuestMessageContinuity = () => {
      void fetchGuests();
      void fetchMessages();
    };

    const handleRsvpContinuityUpdate = (event: Event) => {
      const continuityEvent = event as CustomEvent<RsvpContinuityEventDetail>;
      if (!shouldRefreshForRsvpContinuityEvent(continuityEvent.detail, continuityStorageKey, siteSlug)) return;
      refreshGuestMessageContinuity();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== continuityStorageKey || !isFreshRsvpContinuityStorageValue(event.newValue)) return;
      refreshGuestMessageContinuity();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      refreshGuestMessageContinuity();
    };

    window.addEventListener('focus', refreshGuestMessageContinuity);
    window.addEventListener(RSVP_CONTINUITY_EVENT, handleRsvpContinuityUpdate);
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshGuestMessageContinuity);
      window.removeEventListener(RSVP_CONTINUITY_EVENT, handleRsvpContinuityUpdate);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasWeddingSite, isDemoMode, siteSlug, fetchGuests, fetchMessages]);
}
