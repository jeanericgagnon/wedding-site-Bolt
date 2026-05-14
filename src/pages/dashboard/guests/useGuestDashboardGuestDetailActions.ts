import { useState, type Dispatch, type SetStateAction } from 'react';

import type { ToastType } from '../../../components/ui/Toast';
import { isDeclinedRsvpStatus } from '../../../lib/rsvpStatus';
import type { GuestAuditEntry, GuestWithRSVP, ItineraryEvent } from './guestDashboardTypes';
import {
  addGuestEventInvitation,
  assignGuestsToHouseholdForSite,
  loadGuestItineraryDrawerSnapshot,
  refreshGuestDashboardSession,
  removeGuestEventInvitation,
  saveAssistedGuestRsvp,
  setGuestsPreferredLanguageForSite,
  updateGuestCheckInForSite,
  updateGuestHouseholdForSite,
  updateGuestForSite,
  generateSecureGuestInviteToken,
  type AssistedRsvpSource,
  type AssistedRsvpStatus,
} from './guestService';
import { buildDemoGuestItinerarySnapshot } from './demoGuestItinerary';

interface UseGuestDashboardGuestDetailActionsInput {
  fetchGuests: () => Promise<void>;
  guests: GuestWithRSVP[];
  isDemoMode: boolean;
  isGuestsReadOnly: boolean;
  setGuests: Dispatch<SetStateAction<GuestWithRSVP[]>>;
  toast: (message: string, type?: ToastType) => void;
  weddingSiteId: string | null;
}

export function useGuestDashboardGuestDetailActions({
  fetchGuests,
  guests,
  isDemoMode,
  isGuestsReadOnly,
  setGuests,
  toast,
  weddingSiteId,
}: UseGuestDashboardGuestDetailActionsInput) {
  const demoItinerarySnapshot = buildDemoGuestItinerarySnapshot();
  const [householdBusy, setHouseholdBusy] = useState(false);
  const [itineraryDrawerGuest, setItineraryDrawerGuest] = useState<GuestWithRSVP | null>(null);
  const [drawerItineraryEvents, setDrawerItineraryEvents] = useState<ItineraryEvent[]>([]);
  const [guestEventIds, setGuestEventIds] = useState<Set<string>>(new Set());
  const [loadingDrawer, setLoadingDrawer] = useState(false);
  const [togglingEventId, setTogglingEventId] = useState<string | null>(null);
  const [guestAuditEntries, setGuestAuditEntries] = useState<GuestAuditEntry[]>([]);
  const [assistedRsvpGuest, setAssistedRsvpGuest] = useState<GuestWithRSVP | null>(null);
  const [assistedRsvpStatus, setAssistedRsvpStatus] = useState<AssistedRsvpStatus>('confirmed');
  const [assistedRsvpSource, setAssistedRsvpSource] = useState<AssistedRsvpSource>('phone');
  const [assistedRsvpNotes, setAssistedRsvpNotes] = useState('');
  const [assistedRsvpSaving, setAssistedRsvpSaving] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<{ guestId: string; guestName: string; at: number } | null>(null);
  const [rotatingInviteToken, setRotatingInviteToken] = useState(false);

  function applyInviteTokenLocally(guestId: string, inviteToken: string | null) {
    setGuests((prev) =>
      prev.map((guest) => (
        guest.id === guestId
          ? { ...guest, invite_token: inviteToken }
          : guest
      )),
    );
    setItineraryDrawerGuest((prev) => (
      prev?.id === guestId
        ? { ...prev, invite_token: inviteToken }
        : prev
    ));
  }

  async function handleMergeIntoHousehold(selectedGuestIds: Set<string>, onMerged?: () => void) {
    if (selectedGuestIds.size < 2 || !weddingSiteId || isDemoMode) return;
    setHouseholdBusy(true);
    try {
      const ids = [...selectedGuestIds];
      const householdId = ids[0];
      await assignGuestsToHouseholdForSite(weddingSiteId, ids, householdId);
      await fetchGuests();
      onMerged?.();
      toast(`${ids.length} guests merged into one household`, 'success');
    } catch {
      toast('Couldn’t merge guests.', 'error');
    } finally {
      setHouseholdBusy(false);
    }
  }

  async function handleSplitFromHousehold(guestId: string) {
    if (!weddingSiteId || isDemoMode) return;
    setHouseholdBusy(true);
    try {
      await updateGuestHouseholdForSite(weddingSiteId, guestId, null);
      await fetchGuests();
      toast('Guest removed from household', 'success');
    } catch {
      toast('Couldn’t remove guest from household.', 'error');
    } finally {
      setHouseholdBusy(false);
    }
  }

  async function handleReassignHousehold(guestId: string, newHouseholdId: string) {
    if (!weddingSiteId || isDemoMode) return;
    try {
      await updateGuestHouseholdForSite(weddingSiteId, guestId, newHouseholdId || null);
      await fetchGuests();
      toast('Guest reassigned', 'success');
    } catch {
      toast('Couldn’t move guest to that household.', 'error');
    }
  }

  async function handleSetGuestsPreferredLanguage(
    selectedGuestIds: Set<string>,
    preferredLanguage: string,
    onApplied?: () => void,
  ) {
    if (selectedGuestIds.size < 1 || !weddingSiteId || isDemoMode) return;
    setHouseholdBusy(true);
    try {
      const ids = [...selectedGuestIds];
      await setGuestsPreferredLanguageForSite(weddingSiteId, ids, preferredLanguage || null);
      await fetchGuests();
      onApplied?.();
      toast(
        preferredLanguage
          ? `Saved guest language for ${ids.length} guest${ids.length === 1 ? '' : 's'}`
          : `Cleared guest language for ${ids.length} guest${ids.length === 1 ? '' : 's'}`,
        'success',
      );
    } catch {
      toast('Couldn’t update guest language right now.', 'error');
    } finally {
      setHouseholdBusy(false);
    }
  }

  async function openItineraryDrawer(guest: GuestWithRSVP) {
    if (!weddingSiteId) return;
    setItineraryDrawerGuest(guest);
    setLoadingDrawer(true);
    try {
      if (isDemoMode) {
        const now = Date.now();
        setDrawerItineraryEvents(demoItinerarySnapshot.itineraryEvents);
        setGuestAuditEntries([
          { id: `${guest.id}-a1`, action: 'update', changed_at: new Date(now - 1000 * 60 * 90).toISOString(), changed_by: null, old_data: { rsvp_status: 'pending' }, new_data: { rsvp_status: guest.rsvp_status } },
          { id: `${guest.id}-a2`, action: 'update', changed_at: new Date(now - 1000 * 60 * 60 * 26).toISOString(), changed_by: null, old_data: { invited_to_reception: false }, new_data: { invited_to_reception: guest.invited_to_reception } },
        ]);
        setGuestEventIds(new Set(demoItinerarySnapshot.guestInvitedEventIds.get(guest.id) ?? []));
      }

      if (!isDemoMode) {
        const snapshot = await loadGuestItineraryDrawerSnapshot(weddingSiteId, guest.id);
        setDrawerItineraryEvents(snapshot.events);
        setGuestEventIds(snapshot.guestEventIds);
        setGuestAuditEntries(snapshot.auditEntries);
      }
    } catch {
      toast('Couldn’t load guest itinerary details right now. Please try again.', 'error');
    } finally {
      setLoadingDrawer(false);
    }
  }

  async function handleToggleEventInvite(eventId: string, currentlyInvited: boolean) {
    if (!itineraryDrawerGuest || togglingEventId) return;
    setTogglingEventId(eventId);
    try {
      if (currentlyInvited) {
        await removeGuestEventInvitation(eventId, itineraryDrawerGuest.id);
        setGuestEventIds((prev) => {
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });
      } else {
        await addGuestEventInvitation(eventId, itineraryDrawerGuest.id);
        setGuestEventIds((prev) => new Set([...prev, eventId]));
      }
    } catch {
      toast('Couldn’t update that event invite.', 'error');
    } finally {
      setTogglingEventId(null);
    }
  }

  async function handleRotateGuestInviteToken() {
    if (!itineraryDrawerGuest) return;
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot rotate guest access links.', 'info');
      return;
    }
    if (!weddingSiteId && !isDemoMode) return;

    setRotatingInviteToken(true);
    try {
      const nextToken = isDemoMode
        ? `demo-guest-${itineraryDrawerGuest.id}-${Date.now().toString(36)}`
        : await generateSecureGuestInviteToken();

      if (isDemoMode) {
        applyInviteTokenLocally(itineraryDrawerGuest.id, nextToken);
      } else if (weddingSiteId) {
        await updateGuestForSite(weddingSiteId, itineraryDrawerGuest.id, { invite_token: nextToken });
        await fetchGuests();
        applyInviteTokenLocally(itineraryDrawerGuest.id, nextToken);
      }

      toast('Private RSVP access rotated for this guest', 'success');
    } catch {
      toast('Couldn’t rotate guest access right now.', 'error');
    } finally {
      setRotatingInviteToken(false);
    }
  }

  async function handleRevokeGuestInviteToken() {
    if (!itineraryDrawerGuest) return;
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot revoke guest access links.', 'info');
      return;
    }
    if (!weddingSiteId && !isDemoMode) return;

    setRotatingInviteToken(true);
    try {
      if (isDemoMode) {
        applyInviteTokenLocally(itineraryDrawerGuest.id, null);
      } else if (weddingSiteId) {
        await updateGuestForSite(weddingSiteId, itineraryDrawerGuest.id, { invite_token: null });
        await fetchGuests();
        applyInviteTokenLocally(itineraryDrawerGuest.id, null);
      }

      toast('Private RSVP access revoked for this guest', 'success');
    } catch {
      toast('Couldn’t revoke guest access right now.', 'error');
    } finally {
      setRotatingInviteToken(false);
    }
  }

  function openAssistedRsvpModal(guest: GuestWithRSVP) {
    setAssistedRsvpGuest(guest);
    setAssistedRsvpStatus(isDeclinedRsvpStatus(guest.rsvp_status) ? 'declined' : 'confirmed');
    setAssistedRsvpSource('phone');
    setAssistedRsvpNotes('');
  }

  async function handleSaveAssistedRsvp() {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot record assisted RSVPs.', 'info');
      return;
    }
    if (!assistedRsvpGuest) return;
    try {
      setAssistedRsvpSaving(true);

      if (isDemoMode) {
        const demoRecordedAt = new Date().toISOString();
        const demoManualTag = `[Manual RSVP source:${assistedRsvpSource} recorded:${demoRecordedAt}]`;
        const nextNotes = [demoManualTag, assistedRsvpNotes.trim()].filter(Boolean).join(' ');
        setGuests((prev) =>
          prev.map((guest) =>
            guest.id === assistedRsvpGuest.id
              ? {
                  ...guest,
                  rsvp_status: assistedRsvpStatus,
                  rsvp_received_at: new Date().toISOString(),
                  notes: nextNotes,
                  rsvp: assistedRsvpStatus === 'confirmed'
                    ? guest.rsvp
                      ? {
                          ...guest.rsvp,
                          attending: true,
                          attending_ceremony: guest.invited_to_ceremony,
                          attending_reception: guest.invited_to_reception,
                        }
                      : guest.rsvp
                    : guest.rsvp
                      ? {
                          ...guest.rsvp,
                          attending: false,
                          attending_ceremony: false,
                          attending_reception: false,
                          meal_choice: null,
                          plus_one_name: null,
                          plus_one_count: 0,
                        }
                      : guest.rsvp,
                }
              : guest,
          ),
        );
        setAssistedRsvpGuest(null);
        toast('RSVP recorded for guest', 'success');
        return;
      }

      await saveAssistedGuestRsvp({
        guest: assistedRsvpGuest,
        status: assistedRsvpStatus,
        source: assistedRsvpSource,
        notes: assistedRsvpNotes,
      });

      await fetchGuests();
      setAssistedRsvpGuest(null);
      toast('RSVP recorded for guest', 'success');
    } catch {
      toast('Couldn’t save assisted RSVP.', 'error');
    } finally {
      setAssistedRsvpSaving(false);
    }
  }

  async function handleToggleCheckIn(guest: GuestWithRSVP) {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot update guest check-in.', 'info');
      return;
    }
    if (!weddingSiteId || isDemoMode) {
      toast('Check-in is unavailable in demo mode.', 'error');
      return;
    }

    const nextValue = guest.checked_in_at ? null : new Date().toISOString();
    const updateCheckin = async () => updateGuestCheckInForSite(weddingSiteId, guest.id, nextValue);

    try {
      await updateCheckin();
      await fetchGuests();
      if (nextValue) {
        const guestName = (guest.first_name || guest.last_name)
          ? `${guest.first_name ?? ''} ${guest.last_name ?? ''}`.trim()
          : guest.name;
        setLastCheckIn({ guestId: guest.id, guestName, at: Date.now() });
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
          // fall through
        }
      }
      toast('Couldn’t update check-in status.', 'error');
    }
  }

  return {
    assistedRsvpGuest,
    assistedRsvpNotes,
    assistedRsvpSaving,
    assistedRsvpSource,
    assistedRsvpStatus,
    guestAuditEntries,
    guestEventIds,
    handleMergeIntoHousehold,
    handleReassignHousehold,
    handleSaveAssistedRsvp,
    handleSetGuestsPreferredLanguage,
    handleSplitFromHousehold,
    handleToggleCheckIn,
    handleToggleEventInvite,
    householdBusy,
    itineraryDrawerGuest,
    drawerItineraryEvents,
    lastCheckIn,
    loadingDrawer,
    openAssistedRsvpModal,
    openItineraryDrawer,
    handleRevokeGuestInviteToken,
    handleRotateGuestInviteToken,
    rotatingInviteToken,
    setAssistedRsvpGuest,
    setAssistedRsvpNotes,
    setAssistedRsvpSource,
    setAssistedRsvpStatus,
    setGuestAuditEntries,
    setGuestEventIds,
    setItineraryDrawerGuest,
    setLastCheckIn,
    togglingEventId,
  };
}
