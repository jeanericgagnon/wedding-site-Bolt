import type React from 'react';
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
  const handleUndoLastCheckIn = async () => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot update guest check-in.', 'info');
      return;
    }
    if (!weddingSiteId || !lastCheckIn || isDemoMode) return;
    try {
      await updateGuestForSite(weddingSiteId, lastCheckIn.guestId, { checked_in_at: null });
      await fetchGuests();
      toast(`Undid check-in for ${lastCheckIn.guestName}`, 'success');
      setLastCheckIn(null);
    } catch {
      toast('Couldn’t undo last check-in.', 'error');
    }
  };

  const handleMarkThankYouSent = async (guest: GuestWithRSVP) => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot update thank-you status.', 'info');
      return;
    }
    if (!weddingSiteId || isDemoMode) return;
    try {
      const current = guest.thank_you_sent_at;
      const nextValue = current ? null : new Date().toISOString();
      await updateGuestForSite(weddingSiteId, guest.id, { thank_you_sent_at: nextValue });
      await fetchGuests();
      toast(nextValue ? 'Marked thank-you sent' : 'Cleared thank-you status', 'success');
    } catch {
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
    const confirmed = await requestConfirmation({
      title: 'Mark thank-you notes sent?',
      description: `This will mark thank-you sent for ${ids.length} ${ids.length === 1 ? 'guest' : 'guests'}.`,
      confirmLabel: 'Mark sent',
    });
    if (!confirmed) return;
    try {
      await updateGuestsForSite(weddingSiteId, ids, { thank_you_sent_at: new Date().toISOString() });
      await fetchGuests();
      toast(`Marked ${ids.length} thank-you sent`, 'success');
    } catch {
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
    const confirmed = await requestConfirmation({
      title: 'Clear all check-ins?',
      description: `This will clear check-in status and notes for ${checkedInCount} ${checkedInCount === 1 ? 'guest' : 'guests'}.`,
      confirmLabel: 'Clear check-ins',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await clearGuestCheckInsForSite(weddingSiteId);
      await fetchGuests();
      setLastCheckIn(null);
      toast('Cleared all check-ins', 'success');
    } catch {
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
    const updateCheckin = async () => {
      await updateGuestForSite(weddingSiteId, guest.id, { checked_in_at: nextValue });
    };

    try {
      await updateCheckin();
      await fetchGuests();
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
          await updateCheckin();
          await fetchGuests();
          toast(nextValue ? 'Guest checked in' : 'Guest check-in cleared', 'success');
          return;
        } catch {
          // fall through to canonical error toast
        }
      }
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
