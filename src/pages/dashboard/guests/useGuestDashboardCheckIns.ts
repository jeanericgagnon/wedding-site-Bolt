import type React from 'react';
import { useEffect, useRef } from 'react';
import type { ConfirmDialogProps } from '../../../components/ui/ConfirmDialog';
import type { ToastType } from '../../../components/ui/Toast';
import type { GuestWithRSVP } from './guestDashboardTypes';
import { clearGuestCheckInsForSite, refreshGuestDashboardSession, updateGuestForSite, updateGuestsForSite } from './guestService';
import { getGuestDisplayName } from './guestDashboardUtils';

export interface GuestLastCheckIn {
  guestId: string;
  guestName: string;
  at: number;
}

interface UseGuestDashboardCheckInsInput {
  dueThankYouGuestIds: Set<string>;
  fetchGuests: () => Promise<void>;
  guests: GuestWithRSVP[];
  isDemoMode: boolean;
  isGuestsReadOnly: boolean;
  lastCheckIn: GuestLastCheckIn | null;
  requestConfirmation: (options: Pick<ConfirmDialogProps, 'title' | 'description' | 'confirmLabel' | 'tone'>) => Promise<boolean>;
  setLastCheckIn: React.Dispatch<React.SetStateAction<GuestLastCheckIn | null>>;
  toast: (message: string, type?: ToastType) => void;
  weddingSiteId: string | null;
}

export function useGuestDashboardCheckIns({
  dueThankYouGuestIds,
  fetchGuests,
  guests,
  isDemoMode,
  isGuestsReadOnly,
  lastCheckIn,
  requestConfirmation,
  setLastCheckIn,
  toast,
  weddingSiteId,
}: UseGuestDashboardCheckInsInput) {
  const guestCheckInContextVersionRef = useRef(0);

  useEffect(() => {
    guestCheckInContextVersionRef.current += 1;
    setLastCheckIn(null);
  }, [isDemoMode, setLastCheckIn, weddingSiteId]);

  function isCurrentGuestCheckInContext(contextVersion: number) {
    return contextVersion === guestCheckInContextVersionRef.current;
  }

  const handleUndoLastCheckIn = async () => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot update guest check-in.', 'info');
      return;
    }
    if (!weddingSiteId || !lastCheckIn || isDemoMode) return;
    const contextVersion = guestCheckInContextVersionRef.current;
    const targetWeddingSiteId = weddingSiteId;
    const targetLastCheckIn = lastCheckIn;
    try {
      await updateGuestForSite(targetWeddingSiteId, targetLastCheckIn.guestId, { checked_in_at: null });
      if (!isCurrentGuestCheckInContext(contextVersion)) return;
      await fetchGuests();
      if (!isCurrentGuestCheckInContext(contextVersion)) return;
      toast(`Undid check-in for ${targetLastCheckIn.guestName}`, 'success');
      setLastCheckIn(null);
    } catch {
      if (!isCurrentGuestCheckInContext(contextVersion)) return;
      toast('Couldn’t undo last check-in.', 'error');
    }
  };

  const handleMarkThankYouSent = async (guest: GuestWithRSVP) => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot update thank-you status.', 'info');
      return;
    }
    if (!weddingSiteId || isDemoMode) return;
    const contextVersion = guestCheckInContextVersionRef.current;
    const targetWeddingSiteId = weddingSiteId;
    try {
      const current = guest.thank_you_sent_at;
      const nextValue = current ? null : new Date().toISOString();
      await updateGuestForSite(targetWeddingSiteId, guest.id, { thank_you_sent_at: nextValue });
      if (!isCurrentGuestCheckInContext(contextVersion)) return;
      await fetchGuests();
      if (!isCurrentGuestCheckInContext(contextVersion)) return;
      toast(nextValue ? 'Marked thank-you sent' : 'Cleared thank-you status', 'success');
    } catch {
      if (!isCurrentGuestCheckInContext(contextVersion)) return;
      toast('Couldn’t update thank-you status.', 'error');
    }
  };

  const handleMarkAllDueThankYous = async () => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot update thank-you status.', 'info');
      return;
    }
    if (!weddingSiteId || isDemoMode) return;
    const ids = guests.filter((guest) => dueThankYouGuestIds.has(guest.id)).map((guest) => guest.id);
    if (ids.length === 0) {
      toast('No guests currently due for thank-you.', 'error');
      return;
    }
    const contextVersion = guestCheckInContextVersionRef.current;
    const targetWeddingSiteId = weddingSiteId;
    const confirmed = await requestConfirmation({
      title: 'Mark thank-you notes sent?',
      description: `This will mark thank-you sent for ${ids.length} ${ids.length === 1 ? 'guest' : 'guests'}.`,
      confirmLabel: 'Mark sent',
    });
    if (!isCurrentGuestCheckInContext(contextVersion)) return;
    if (!confirmed) return;
    try {
      await updateGuestsForSite(targetWeddingSiteId, ids, { thank_you_sent_at: new Date().toISOString() });
      if (!isCurrentGuestCheckInContext(contextVersion)) return;
      await fetchGuests();
      if (!isCurrentGuestCheckInContext(contextVersion)) return;
      toast(`Marked ${ids.length} thank-you sent`, 'success');
    } catch {
      if (!isCurrentGuestCheckInContext(contextVersion)) return;
      toast('Couldn’t mark thank-you notes sent.', 'error');
    }
  };

  const handleClearAllCheckIns = async () => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot clear guest check-ins.', 'info');
      return;
    }
    if (!weddingSiteId || isDemoMode) return;
    const checkedInCount = guests.filter((guest) => !!guest.checked_in_at).length;
    if (checkedInCount === 0) {
      toast('No checked-in guests to clear.', 'error');
      return;
    }
    const contextVersion = guestCheckInContextVersionRef.current;
    const targetWeddingSiteId = weddingSiteId;
    const confirmed = await requestConfirmation({
      title: 'Clear all check-ins?',
      description: `This will clear check-in status and notes for ${checkedInCount} ${checkedInCount === 1 ? 'guest' : 'guests'}.`,
      confirmLabel: 'Clear check-ins',
      tone: 'danger',
    });
    if (!isCurrentGuestCheckInContext(contextVersion)) return;
    if (!confirmed) return;
    try {
      await clearGuestCheckInsForSite(targetWeddingSiteId);
      if (!isCurrentGuestCheckInContext(contextVersion)) return;
      await fetchGuests();
      if (!isCurrentGuestCheckInContext(contextVersion)) return;
      setLastCheckIn(null);
      toast('Cleared all check-ins', 'success');
    } catch {
      if (!isCurrentGuestCheckInContext(contextVersion)) return;
      toast('Couldn’t clear check-ins.', 'error');
    }
  };

  const handleToggleCheckIn = async (guest: GuestWithRSVP) => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot update guest check-in.', 'info');
      return;
    }
    if (!weddingSiteId || isDemoMode) {
      toast('Check-in is unavailable in demo mode.', 'error');
      return;
    }

    const nextValue = guest.checked_in_at ? null : new Date().toISOString();
    const contextVersion = guestCheckInContextVersionRef.current;
    const targetWeddingSiteId = weddingSiteId;
    const updateCheckin = async () => {
      await updateGuestForSite(targetWeddingSiteId, guest.id, { checked_in_at: nextValue });
    };

    try {
      await updateCheckin();
      if (!isCurrentGuestCheckInContext(contextVersion)) return;
      await fetchGuests();
      if (!isCurrentGuestCheckInContext(contextVersion)) return;
      if (nextValue) {
        setLastCheckIn({ guestId: guest.id, guestName: getGuestDisplayName(guest), at: Date.now() });
      }
      toast(nextValue ? 'Guest checked in' : 'Guest check-in cleared', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const authish = msg.includes('invalid jwt') || msg.includes('jwt') || msg.includes('401') || msg.includes('auth');
      if (authish) {
        try {
          await refreshGuestDashboardSession();
          if (!isCurrentGuestCheckInContext(contextVersion)) return;
          await updateCheckin();
          if (!isCurrentGuestCheckInContext(contextVersion)) return;
          await fetchGuests();
          if (!isCurrentGuestCheckInContext(contextVersion)) return;
          toast(nextValue ? 'Guest checked in' : 'Guest check-in cleared', 'success');
          return;
        } catch {
          // fall through to canonical error toast
        }
      }
      if (!isCurrentGuestCheckInContext(contextVersion)) return;
      toast('Couldn’t update check-in status.', 'error');
    }
  };

  return {
    handleClearAllCheckIns,
    handleMarkAllDueThankYous,
    handleMarkThankYouSent,
    handleToggleCheckIn,
    handleUndoLastCheckIn,
  };
}
