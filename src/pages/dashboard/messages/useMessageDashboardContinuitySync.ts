import { useEffect } from 'react';
import { isFreshRsvpContinuityStorageValue } from '../../rsvpContinuityStorage';
import { RSVP_CONTINUITY_EVENT, RSVP_CONTINUITY_STORAGE_KEY } from './messageDemoStorage';

export type UseMessageDashboardContinuitySyncArgs = {
  hasWeddingSite: boolean;
  isDemoMode: boolean;
  fetchGuests: () => Promise<void>;
  fetchMessages: () => Promise<void>;
};

export function useMessageDashboardContinuitySync({
  hasWeddingSite,
  isDemoMode,
  fetchGuests,
  fetchMessages,
}: UseMessageDashboardContinuitySyncArgs) {
  useEffect(() => {
    if (!hasWeddingSite || isDemoMode) return;

    const refreshGuestMessageContinuity = () => {
      void fetchGuests();
      void fetchMessages();
    };

    const handleRsvpContinuityUpdate = () => {
      refreshGuestMessageContinuity();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== RSVP_CONTINUITY_STORAGE_KEY || !isFreshRsvpContinuityStorageValue(event.newValue)) return;
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
  }, [hasWeddingSite, isDemoMode, fetchGuests, fetchMessages]);
}
